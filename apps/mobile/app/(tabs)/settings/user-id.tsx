import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { toApiErrorMessage } from '../../../src/lib/api';
import { useApi } from '../../../src/lib/use-api';
import { formatDateTime } from '../../../src/lib/format';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';
import { KeyboardAwareScrollView } from '../../../src/ui/KeyboardAwareScrollView';

interface AccountSettingsResponse {
  userId: string;
  idSearchVisibility: 'public' | 'private';
  userIdChangedAt: string | null;
  nextUserIdChangeAvailableAt: string | null;
  authProviders: string[];
  emailAddress: string | null;
  createdAt: string;
}

export default function UserIdSettingsScreen() {
  const { session, updateSessionUser } = useSession();
  const [settings, setSettings] = useState<AccountSettingsResponse | null>(null);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (session?.accessToken) {
      void loadAccountSettings();
    }
  }, [session?.accessToken]);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const { request } = useApi();
  const currentSession = session;

  async function loadAccountSettings() {
    try {
      setLoading(true);
      const response = await request<AccountSettingsResponse>('/auth/account-settings', {});
      setSettings(response);
      setUserId(response.userId);
    } catch (error) {
      Alert.alert('ID設定の取得に失敗しました', toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const saveUserId = async () => {
    if (!userId.trim()) {
      Alert.alert('入力不足', '新しい userId を入力してください。');
      return;
    }

    try {
      setSaving(true);
      const response = await request<AccountSettingsResponse>('/auth/account-settings', {
        method: 'PATCH',
        body: {
          userId: userId.trim(),
        },
      });
      setSettings(response);
      setUserId(response.userId);
      updateSessionUser({
        ...currentSession.user,
        userId: response.userId,
      });
    } catch (error) {
      Alert.alert('ID変更に失敗しました', toApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>ID変更</Text>
        <Text style={styles.body}>
          userId は 30 日に 1 回まで変更できます。次回変更可能日を確認してから更新します。
        </Text>
      </View>

      {loading || !settings ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.body}>現在の userId: @{settings.userId}</Text>
          <Text style={styles.body}>
            次回変更可能日: {formatDateTime(settings.nextUserIdChangeAvailableAt)}
          </Text>
          <TextInput
            value={userId}
            onChangeText={setUserId}
            placeholder="new userId"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Pressable
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            disabled={saving}
            onPress={() => {
              void saveUserId();
            }}
          >
            <Text style={styles.primaryButtonLabel}>IDを更新する</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAwareScrollView>
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
