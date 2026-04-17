import { Redirect } from 'expo-router';
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
import { apiRequest, toApiErrorMessage } from '../../../src/lib/api';
import { useSession, type SessionUser } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';

export default function ProfileSettingsScreen() {
  const { session, updateSessionUser } = useSession();
  const [displayName, setDisplayName] = useState(session?.user.displayName ?? '');
  const [avatarUrl, setAvatarUrl] = useState(session?.user.avatarUrl ?? '');
  const [saving, setSaving] = useState(false);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const currentSession = session;

  const saveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('入力不足', '表示名を入力してください。');
      return;
    }

    try {
      setSaving(true);
      const response = await apiRequest<SessionUser>('/auth/profile', {
        method: 'PATCH',
        token: currentSession.accessToken,
        body: {
          displayName: displayName.trim(),
          avatarUrl: avatarUrl.trim() || null,
        },
      });
      updateSessionUser(response);
    } catch (error) {
      Alert.alert('プロフィール更新に失敗しました', toApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>プロフィール設定</Text>
        <Text style={styles.body}>
          表示名とアイコン URL を更新できます。保存後は session 表示も即時反映します。
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
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="avatar URL (任意)"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />
        <Pressable
          style={[styles.primaryButton, saving && styles.buttonDisabled]}
          disabled={saving}
          onPress={() => {
            void saveProfile();
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fffdf8" />
          ) : (
            <Text style={styles.primaryButtonLabel}>プロフィールを保存</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: '#f6f1e7',
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
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
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
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
