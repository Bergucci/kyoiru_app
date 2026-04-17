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
import { ApiError, apiRequest, toApiErrorMessage } from '../src/lib/api';
import { useSession, type SessionUser } from '../src/session/session-context';
import { colors } from '../src/ui/theme';

export default function InitialProfileScreen() {
  const router = useRouter();
  const { session, updateSessionUser, clearSession } = useSession();
  const [displayName, setDisplayName] = useState(session?.user.displayName ?? '');
  const [userId, setUserId] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(session?.user.avatarUrl ?? '');
  const [submitting, setSubmitting] = useState(false);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus === 'active') {
    return <Redirect href={'/(tabs)/home' as never} />;
  }

  const submit = async () => {
    if (!displayName.trim() || !userId.trim()) {
      Alert.alert('入力不足', '表示名とユーザーIDを入力してください。');
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiRequest<SessionUser>('/auth/initial-profile', {
        method: 'PATCH',
        token: session.accessToken,
        body: {
          displayName: displayName.trim(),
          userId: userId.trim(),
          avatarUrl: avatarUrl.trim() || null,
        },
      });

      updateSessionUser(response);
      router.replace('/');
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        router.replace('/(auth)/login' as never);
        return;
      }

      Alert.alert('初期プロフィール設定に失敗しました', toApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>初期プロフィール設定</Text>
        <Text style={styles.subtitle}>
          ホームへ進む前に、表示名・ユーザーID・アイコン URL を設定します。
        </Text>
      </View>

      <View style={styles.card}>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="表示名"
          style={styles.input}
        />
        <TextInput
          value={userId}
          onChangeText={setUserId}
          placeholder="userId"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <TextInput
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="avatar URL (任意)"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Pressable
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          disabled={submitting}
          onPress={() => {
            void submit();
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#fffdf8" />
          ) : (
            <Text style={styles.primaryButtonLabel}>プロフィールを確定する</Text>
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
    backgroundColor: '#f6f0e4',
  },
  header: {
    padding: 22,
    borderRadius: 22,
    backgroundColor: colors.sky,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f6fbff',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#dceaf1',
  },
  card: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
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
