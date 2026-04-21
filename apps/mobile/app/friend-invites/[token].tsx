import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiRequest, toApiErrorMessage } from '../../src/lib/api';
import { useSession } from '../../src/session/session-context';
import { colors } from '../../src/ui/theme';
import { PressableScale } from '../../src/components';

interface FriendInvitePreview {
  inviter: {
    userId: string;
    displayName: string;
    avatarUrl: string | null;
  };
  joinable: boolean;
}

export default function FriendInviteScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  const { session } = useSession();
  const [preview, setPreview] = useState<FriendInvitePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (session?.accessToken && token) {
      void loadPreview();
    }
  }, [token, session?.accessToken]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      const response = await apiRequest<FriendInvitePreview>(`/friend-invites/${token}`, {
        token: session?.accessToken ?? null,
      });
      setPreview(response);
      setErrorText(null);
    } catch (error) {
      setErrorText(toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const acceptInvite = async () => {
    if (!session) {
      return;
    }

    try {
      setAccepting(true);
      await apiRequest(`/friend-invites/${token}/accept`, {
        method: 'POST',
        token: session.accessToken,
      });
      Alert.alert('友達になりました', '友達タブに戻ります。');
      router.replace('/(tabs)/friends' as never);
    } catch (error) {
      Alert.alert('友達追加に失敗しました', toApiErrorMessage(error));
    } finally {
      setAccepting(false);
    }
  };

  if (!session) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>友達追加リンク</Text>
          <Text style={styles.body}>
            このリンクを使うにはログイン済みセッションが必要です。ログイン後に再度このリンクを開いてください。
          </Text>
          <PressableScale
            style={styles.primaryButton}
            onPress={() => {
              router.replace('/(auth)/login' as never);
            }}
          >
            <Text style={styles.primaryButtonLabel}>ログイン画面へ</Text>
          </PressableScale>
        </View>
      </ScrollView>
    );
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>友達追加リンク</Text>
        {loading ? <ActivityIndicator color={colors.accent} /> : null}
        {errorText ? <Text style={styles.body}>{errorText}</Text> : null}
        {preview ? (
          <>
            <Text style={styles.name}>{preview.inviter.displayName}</Text>
            <Text style={styles.body}>@{preview.inviter.userId}</Text>
            <Text style={styles.body}>
              {preview.joinable
                ? 'このリンクから友達追加できます。'
                : 'このリンクは現在利用できません。'}
            </Text>
            <PressableScale
              hapticStyle="medium"
              style={[
                styles.primaryButton,
                (!preview.joinable || accepting) && styles.buttonDisabled,
              ]}
              disabled={!preview.joinable || accepting}
              onPress={() => {
                void acceptInvite();
              }}
            >
              <Text style={styles.primaryButtonLabel}>友達になる</Text>
            </PressableScale>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f6f1e7',
    flexGrow: 1,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
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
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
