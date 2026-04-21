import { Redirect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getApiUrl, resolveMediaUrl, toApiErrorMessage } from '../../../src/lib/api';
import { useApi } from '../../../src/lib/use-api';
import { useSession, type SessionUser } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';
import { KeyboardAwareScrollView } from '../../../src/ui/KeyboardAwareScrollView';
import { PressableScale } from '../../../src/components';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { session, updateSessionUser } = useSession();
  const [displayName, setDisplayName] = useState(session?.user.displayName ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const { request } = useApi();
  const currentSession = session;
  const currentAvatarUrl = resolveMediaUrl(currentSession.user.avatarUrl);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('権限が必要です', '写真ライブラリへのアクセスを許可してください。');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (localUri: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', {
      uri: localUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as unknown as Blob);

    const response = await fetch(`${getApiUrl()}/auth/profile/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${currentSession.accessToken}` },
      body: formData,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { avatarUrl: string | null };
    return data.avatarUrl;
  };

  const saveProfile = async () => {
    if (!displayName.trim()) {
      Alert.alert('入力不足', '表示名を入力してください。');
      return;
    }

    try {
      setSaving(true);

      let newAvatarPath: string | null | undefined = undefined;
      if (avatarUri) {
        newAvatarPath = await uploadAvatar(avatarUri);
        if (!newAvatarPath) {
          Alert.alert('アイコンのアップロードに失敗しました', '表示名のみ保存します。');
        }
      }

      const body: Record<string, unknown> = { displayName: displayName.trim() };
      if (newAvatarPath !== undefined) {
        body.avatarUrl = newAvatarPath;
      }

      const response = await request<SessionUser>('/auth/profile', {
        method: 'PATCH',
        body,
      });
      updateSessionUser(response);
      setAvatarUri(null);
      Alert.alert('保存しました');
    } catch (error) {
      Alert.alert('プロフィール更新に失敗しました', toApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = avatarUri ?? currentAvatarUrl;

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>プロフィール設定</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.avatarSection}>
          <PressableScale style={styles.avatarWrapper} onPress={() => { void pickAvatar(); }}>
            {displayAvatar ? (
              <Image source={{ uri: displayAvatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(currentSession.user.displayName?.charAt(0) ?? '?').toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={14} color="#ffffff" />
            </View>
          </PressableScale>
          <Text style={styles.avatarHint}>タップして変更</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>表示名</Text>
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="表示名"
            placeholderTextColor={colors.hint}
            style={styles.input}
          />
        </View>

        <PressableScale
          hapticStyle="medium"
          style={[styles.primaryButton, saving && styles.buttonDisabled]}
          disabled={saving}
          onPress={() => { void saveProfile(); }}
        >
          {saving ? (
            <ActivityIndicator color="#fffdf8" />
          ) : (
            <Text style={styles.primaryButtonLabel}>保存する</Text>
          )}
        </PressableScale>
      </View>

      <View style={styles.menuCard}>
        <PressableScale
          style={styles.menuRow}
          onPress={() => { router.push('/(tabs)/settings/user-id' as never); }}
        >
          <Text style={styles.menuLabel}>ユーザーID変更</Text>
          <View style={styles.menuTrailing}>
            <Text style={styles.menuMeta}>@{currentSession.user.userId}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.hint} />
          </View>
        </PressableScale>
      </View>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: colors.pageBg,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 8,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.accentStrong,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarHint: {
    fontSize: 12,
    color: colors.muted,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.ink,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
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
  menuCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  menuTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuMeta: {
    fontSize: 13,
    color: colors.muted,
  },
});
