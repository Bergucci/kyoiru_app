import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { apiRequest, toApiErrorMessage } from '../../../src/lib/api';
import {
  formatDateTime,
  toAuthProviderLabel,
  toIdSearchVisibilityLabel,
} from '../../../src/lib/format';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';
import { PressableScale } from '../../../src/components';

interface AccountSettingsResponse {
  userId: string;
  idSearchVisibility: 'public' | 'private';
  userIdChangedAt: string | null;
  nextUserIdChangeAvailableAt: string | null;
  authProviders: string[];
  emailAddress: string | null;
  createdAt: string;
}

export default function AccountSettingsScreen() {
  const router = useRouter();
  const { session } = useSession();
  const [settings, setSettings] = useState<AccountSettingsResponse | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
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

  const currentSession = session;

  async function loadAccountSettings() {
    try {
      setLoading(true);
      const response = await apiRequest<AccountSettingsResponse>('/auth/account-settings', {
        token: currentSession.accessToken,
      });
      setSettings(response);
      setVisibility(response.idSearchVisibility);
    } catch (error) {
      Alert.alert('アカウント設定の取得に失敗しました', toApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const saveVisibility = async () => {
    try {
      setSaving(true);
      const response = await apiRequest<AccountSettingsResponse>('/auth/account-settings', {
        method: 'PATCH',
        token: currentSession.accessToken,
        body: {
          idSearchVisibility: visibility,
        },
      });
      setSettings(response);
    } catch (error) {
      Alert.alert('アカウント設定の更新に失敗しました', toApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>アカウント設定</Text>
        <Text style={styles.body}>
          ユーザーID変更、ID検索公開設定、ログイン手段の確認をここにまとめます。
        </Text>
      </View>

      {loading || !settings ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>ID情報</Text>
            <Text style={styles.body}>現在の userId: @{settings.userId}</Text>
            <Text style={styles.body}>
              ID検索公開: {toIdSearchVisibilityLabel(settings.idSearchVisibility)}
            </Text>
            <Text style={styles.body}>
              最終変更日: {formatDateTime(settings.userIdChangedAt)}
            </Text>
            <Text style={styles.body}>
              次回変更可能日: {formatDateTime(settings.nextUserIdChangeAvailableAt)}
            </Text>
            <PressableScale
              style={styles.secondaryButton}
              onPress={() => {
                router.push('/(tabs)/settings/user-id' as never);
              }}
            >
              <Text style={styles.secondaryButtonLabel}>ID変更へ進む</Text>
            </PressableScale>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>ID検索公開設定</Text>
            <View style={styles.segment}>
              {([
                { value: 'public', label: 'ON' },
                { value: 'private', label: 'OFF' },
              ] as const).map((item) => (
                <PressableScale
                  key={item.value}
                  style={[
                    styles.segmentButton,
                    visibility === item.value && styles.segmentButtonActive,
                  ]}
                  onPress={() => {
                    setVisibility(item.value);
                  }}
                >
                  <Text
                    style={[
                      styles.segmentLabel,
                      visibility === item.value && styles.segmentLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </PressableScale>
              ))}
            </View>
            <PressableScale
              hapticStyle="medium"
              style={[styles.primaryButton, saving && styles.buttonDisabled]}
              disabled={saving}
              onPress={() => {
                void saveVisibility();
              }}
            >
              <Text style={styles.primaryButtonLabel}>公開設定を保存</Text>
            </PressableScale>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>ログイン手段</Text>
            {settings.authProviders.map((provider) => (
              <Text key={provider} style={styles.body}>
                • {toAuthProviderLabel(provider)}
                {provider === 'email' && settings.emailAddress
                  ? ` (${settings.emailAddress})`
                  : ''}
              </Text>
            ))}
            <Text style={styles.body}>
              アカウント作成日: {formatDateTime(settings.createdAt)}
            </Text>
          </View>
        </>
      )}
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.muted,
  },
  segment: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#efe7d8',
  },
  segmentButtonActive: {
    backgroundColor: colors.accentSoft,
  },
  segmentLabel: {
    color: colors.ink,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: colors.accentStrong,
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
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: '#ebe3d6',
  },
  secondaryButtonLabel: {
    color: colors.ink,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
