import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest, toApiErrorMessage } from '../../src/lib/api';
import {
  socialProviders,
  SocialLoginCancelledError,
  SocialLoginUnavailableError,
  useSocialLoginController,
  type SocialProvider,
} from '../../src/lib/social-login';
import { useSession, type SessionState } from '../../src/session/session-context';
import { Mascot, PressableScale } from '../../src/components';
import { colors, gradients, radii, shadow, spacing, typography } from '../../src/ui/theme';

type AuthMode = 'login' | 'register';

const providerOrder: SocialProvider[] = ['line', 'apple', 'google'];

const providerButtonStyles: Record<
  SocialProvider,
  {
    background: string;
    foreground: string;
    borderColor: string;
    badgeBackground: string;
    badgeForeground: string;
  }
> = {
  apple: {
    background: '#151515',
    foreground: '#ffffff',
    borderColor: '#151515',
    badgeBackground: '#ffffff',
    badgeForeground: '#151515',
  },
  line: {
    background: '#06c755',
    foreground: '#ffffff',
    borderColor: '#06c755',
    badgeBackground: '#ffffff',
    badgeForeground: '#06c755',
  },
  google: {
    background: '#ffffff',
    foreground: '#1f2c2b',
    borderColor: '#d8d2c6',
    badgeBackground: '#f4efe3',
    badgeForeground: '#1f2c2b',
  },
};

export default function LoginScreen() {
  const router = useRouter();
  const { session, setSession } = useSession();
  const social = useSocialLoginController();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittingProvider, setSubmittingProvider] = useState<SocialProvider | null>(
    null,
  );

  if (session) {
    return <Redirect href="/" />;
  }

  const finishLogin = (nextSession: SessionState) => {
    setSession(nextSession);
    setPassword('');
    router.replace('/');
  };

  const submitEmail = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('入力不足', 'メールアドレスとパスワードを入力してください。');
      return;
    }

    try {
      setSubmitting(true);

      const response = await apiRequest<SessionState>(
        mode === 'login' ? '/auth/login' : '/auth/register',
        {
          method: 'POST',
          body: {
            email: email.trim(),
            password,
          },
        },
      );

      finishLogin(response);
    } catch (error) {
      Alert.alert(
        mode === 'login' ? 'ログインに失敗しました' : '登録に失敗しました',
        toApiErrorMessage(error),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const runProviderLogin = async (
    provider: SocialProvider,
    request: () => Promise<SessionState>,
  ) => {
    try {
      setSubmittingProvider(provider);
      const response = await request();
      finishLogin(response);
    } catch (error) {
      if (error instanceof SocialLoginCancelledError) {
        return;
      }
      if (error instanceof SocialLoginUnavailableError) {
        Alert.alert(`${socialProviders[provider].label} ログイン`, error.message);
        return;
      }
      Alert.alert(
        `${socialProviders[provider].label} ログインに失敗しました`,
        toApiErrorMessage(error),
      );
    } finally {
      setSubmittingProvider(null);
    }
  };

  const handleSocialLogin = (provider: SocialProvider) => {
    if (provider === 'apple') {
      void runProviderLogin('apple', social.loginWithApple);
      return;
    }
    if (provider === 'google') {
      void runProviderLogin('google', social.loginWithGoogle);
      return;
    }
    if (provider === 'line') {
      void runProviderLogin('line', social.loginWithLine);
      return;
    }
  };

  const isBusy = submitting || submittingProvider !== null;
  const emailActionLabel = mode === 'login' ? 'ログインする' : '登録して始める';
  const emailHeading = mode === 'login' ? 'メールでログイン' : 'メールで新規登録';

  const renderProviderIcon = (
    provider: SocialProvider,
    badgeForeground: string,
  ) => {
    if (provider === 'apple') {
      return <Ionicons name="logo-apple" size={22} color={badgeForeground} />;
    }
    if (provider === 'google') {
      return <Ionicons name="logo-google" size={20} color={badgeForeground} />;
    }
    return (
      <FontAwesome6
        name="line"
        iconStyle="brand"
        size={18}
        color={badgeForeground}
      />
    );
  };

  return (
    <LinearGradient colors={[...gradients.heroFree]} style={styles.gradient}>
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
          >
            <View style={styles.hero}>
              <View style={styles.heroMascotWrap}>
                <Mascot variant="wave" size={160} animated />
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroAppName}>今日いる</Text>
                <Text style={styles.title}>
                  連絡しなくても、今日いることだけ分かる
                </Text>
              </View>
            </View>

            <View style={styles.authCard}>
              <View style={styles.cardHandle} />
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>ログインまたは新規登録</Text>
              </View>

              <View style={styles.providerList}>
                {providerOrder.map((provider) => {
                  const meta = socialProviders[provider];
                  const appearance = providerButtonStyles[provider];
                  const isSubmitting = submittingProvider === provider;

                  return (
                    <PressableScale
                      key={provider}
                      accessibilityRole="button"
                      accessibilityLabel={`${meta.label} でログイン`}
                      hapticStyle="medium"
                      style={[
                        styles.providerButton,
                        {
                          backgroundColor: appearance.background,
                          borderColor: appearance.borderColor,
                        },
                        isSubmitting && styles.buttonDisabled,
                      ]}
                      disabled={isBusy}
                      onPress={() => {
                        handleSocialLogin(provider);
                      }}
                    >
                      <View
                        style={[
                          styles.providerBadge,
                          { backgroundColor: appearance.badgeBackground },
                        ]}
                      >
                        {renderProviderIcon(
                          provider,
                          appearance.badgeForeground,
                        )}
                      </View>

                      <View style={styles.providerContent}>
                        <Text
                          style={[
                            styles.providerButtonLabel,
                            { color: appearance.foreground },
                          ]}
                        >
                          {meta.label}で続ける
                        </Text>
                      </View>

                      <View style={styles.providerTrailing}>
                        {isSubmitting ? (
                          <ActivityIndicator color={appearance.foreground} />
                        ) : (
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={appearance.foreground}
                          />
                        )}
                      </View>
                    </PressableScale>
                  );
                })}
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>メールアドレスで続ける</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.emailPanel}>
                <Text style={styles.emailHeading}>{emailHeading}</Text>

                <View style={styles.segment}>
                  <PressableScale
                    style={[
                      styles.segmentButton,
                      mode === 'login' && styles.segmentButtonActive,
                    ]}
                    disabled={isBusy}
                    onPress={() => {
                      setMode('login');
                    }}
                  >
                    <Text
                      style={[
                        styles.segmentLabel,
                        mode === 'login' && styles.segmentLabelActive,
                      ]}
                    >
                      ログイン
                    </Text>
                  </PressableScale>
                  <PressableScale
                    style={[
                      styles.segmentButton,
                      mode === 'register' && styles.segmentButtonActive,
                    ]}
                    disabled={isBusy}
                    onPress={() => {
                      setMode('register');
                    }}
                  >
                    <Text
                      style={[
                        styles.segmentLabel,
                        mode === 'register' && styles.segmentLabelActive,
                      ]}
                    >
                      新規登録
                    </Text>
                  </PressableScale>
                </View>

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="メールアドレス"
                  placeholderTextColor="#97a19e"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="パスワード"
                  placeholderTextColor="#97a19e"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete={mode === 'login' ? 'password' : 'new-password'}
                  secureTextEntry
                  style={styles.input}
                />
                <PressableScale
                  hapticStyle="medium"
                  style={[styles.primaryButton, isBusy && styles.buttonDisabled]}
                  disabled={isBusy}
                  onPress={() => {
                    void submitEmail();
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fffdf8" />
                  ) : (
                    <Text style={styles.primaryButtonLabel}>{emailActionLabel}</Text>
                  )}
                </PressableScale>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['2xl'],
    gap: spacing.lg,
  },
  heroMascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroAppName: {
    ...typography.display,
    color: colors.accentStrong,
  },
  title: {
    ...typography.body,
    color: colors.accentStrong,
    textAlign: 'center',
    maxWidth: 280,
  },
  authCard: {
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
    ...shadow.card,
  },
  cardHandle: {
    width: 42,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.title,
    color: colors.ink,
  },
  providerList: {
    gap: spacing.sm,
  },
  providerButton: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  providerBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerContent: {
    flex: 1,
  },
  providerButtonLabel: {
    ...typography.subtitle,
  },
  providerTrailing: {
    minWidth: 24,
    alignItems: 'flex-end',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerLabel: {
    ...typography.caption,
    color: colors.hint,
  },
  emailPanel: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceAlt,
    gap: spacing.sm,
  },
  emailHeading: {
    ...typography.subtitle,
    color: colors.ink,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: radii.md,
    backgroundColor: colors.secondarySurface,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
  },
  segmentLabel: {
    color: colors.muted,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: colors.ink,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.ink,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingVertical: 14,
    backgroundColor: colors.accentStrong,
  },
  primaryButtonLabel: {
    color: '#fffdf8',
    ...typography.subtitle,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
