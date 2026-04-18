import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiRequest, toApiErrorMessage } from '../../src/lib/api';
import {
  socialProviders,
  SocialLoginCancelledError,
  SocialLoginUnavailableError,
  useSocialLoginController,
  type SocialProvider,
} from '../../src/lib/social-login';
import { ApiError } from '../../src/lib/api';
import { useSession, type SessionState } from '../../src/session/session-context';
import { colors } from '../../src/ui/theme';

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
      // [LINE DEBUG] API エラーの生 body を出力して 400 の原因を特定する
      if (provider === 'line' && error instanceof ApiError) {
        console.log('[LINE] ApiError status:', error.status, '| body:', JSON.stringify(error.body));
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
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.heroLogo}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.heroIcon}
            />
            <Text style={styles.heroAppName}>Kyoiru</Text>
          </View>
          <Text style={styles.title}>今日いることだけ、そっと伝える。</Text>
        </View>

        <View style={styles.authCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ログインまたは新規登録</Text>
          </View>

          <View style={styles.providerList}>
            {providerOrder.map((provider) => {
              const meta = socialProviders[provider];
              const appearance = providerButtonStyles[provider];
              const isSubmitting = submittingProvider === provider;

              return (
                <Pressable
                  key={provider}
                  accessibilityRole="button"
                  accessibilityLabel={`${meta.label} でログイン`}
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
                </Pressable>
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
              <Pressable
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
              </Pressable>
              <Pressable
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
              </Pressable>
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
            <Pressable
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
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#efe7d7',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 14,
  },
  hero: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 20,
    borderRadius: 26,
    backgroundColor: colors.accentStrong,
    gap: 12,
  },
  heroLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  heroAppName: {
    color: '#fffdf8',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  title: {
    color: '#fffdf8',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  authCard: {
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#fbf8f1',
    borderWidth: 1,
    borderColor: '#ddd4c5',
    gap: 14,
    shadowColor: '#173d35',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  providerList: {
    gap: 8,
  },
  providerButton: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  providerBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerContent: {
    flex: 1,
  },
  providerButtonLabel: {
    fontSize: 17,
    fontWeight: '700',
  },
  providerTrailing: {
    minWidth: 24,
    alignItems: 'flex-end',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd4c5',
  },
  dividerLabel: {
    color: '#7d8782',
    fontSize: 11,
    fontWeight: '700',
  },
  emailPanel: {
    padding: 14,
    borderRadius: 18,
    backgroundColor: '#f3eddf',
    gap: 10,
  },
  emailHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: '#e5dcc9',
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#fffdf8',
  },
  segmentLabel: {
    color: colors.muted,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: colors.ink,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d7cfbf',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: colors.ink,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: colors.accentStrong,
  },
  primaryButtonLabel: {
    color: '#fffdf8',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
