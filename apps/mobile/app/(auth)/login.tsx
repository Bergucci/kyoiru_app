import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { apiRequest, toApiErrorMessage } from '../../src/lib/api';
import {
  socialProviders,
  SocialLoginCancelledError,
  SocialLoginUnavailableError,
  useSocialLoginController,
  type SocialProvider,
} from '../../src/lib/social-login';
import { useSession, type SessionState } from '../../src/session/session-context';
import { colors } from '../../src/ui/theme';

type AuthMode = 'login' | 'register';

const providerOrder: SocialProvider[] = ['apple', 'line', 'google'];

const providerButtonStyles: Record<
  SocialProvider,
  { background: string; foreground: string }
> = {
  apple: { background: '#111111', foreground: '#ffffff' },
  line: { background: '#06c755', foreground: '#ffffff' },
  google: { background: '#ffffff', foreground: '#1f1f1f' },
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.kicker}>Kyoiru</Text>
        <Text style={styles.title}>今日いることだけ、そっと伝える。</Text>
        <Text style={styles.subtitle}>
          Apple / LINE / Google / メールアドレスのいずれかで、いつもの方法でログインできます。
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>ソーシャルログイン</Text>
        <Text style={styles.cardText}>
          使いたいサービスのボタンを選ぶと、そのまま認証画面に進みます。
        </Text>

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
                  { backgroundColor: appearance.background },
                  provider === 'google' && styles.providerButtonOutlined,
                  isSubmitting && styles.buttonDisabled,
                ]}
                disabled={submittingProvider !== null}
                onPress={() => {
                  handleSocialLogin(provider);
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={appearance.foreground} />
                ) : (
                  <Text
                    style={[
                      styles.providerButtonLabel,
                      { color: appearance.foreground },
                    ]}
                  >
                    {meta.label} で続ける
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerLabel}>または</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.segment}>
        <Pressable
          style={[styles.segmentButton, mode === 'login' && styles.segmentButtonActive]}
          onPress={() => {
            setMode('login');
          }}
        >
          <Text
            style={[styles.segmentLabel, mode === 'login' && styles.segmentLabelActive]}
          >
            ログイン
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentButton, mode === 'register' && styles.segmentButtonActive]}
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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {mode === 'login' ? 'メールでログイン' : 'メールで新規登録'}
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="メールアドレス"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="パスワード"
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={styles.input}
        />
        <Pressable
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          disabled={submitting}
          onPress={() => {
            void submitEmail();
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fffdf8" />
          ) : (
            <Text style={styles.primaryButtonLabel}>
              {mode === 'login' ? 'ログインする' : '登録して始める'}
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 18,
    backgroundColor: '#f4efe3',
  },
  hero: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: colors.accentStrong,
    gap: 10,
  },
  kicker: {
    color: '#d7eadf',
    fontSize: 13,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fffdf8',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 38,
  },
  subtitle: {
    color: '#d7e6de',
    fontSize: 15,
    lineHeight: 22,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: '#e7dfd1',
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
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
  card: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  providerList: {
    gap: 10,
  },
  providerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
  },
  providerButtonOutlined: {
    borderWidth: 1,
    borderColor: '#d5d5d5',
  },
  providerButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: colors.accent,
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
