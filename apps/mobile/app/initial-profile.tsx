import { Redirect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ApiError, apiRequest, toApiErrorMessage } from '../src/lib/api';
import { useSession, type SessionUser } from '../src/session/session-context';
import { Confetti, Mascot, MascotCheerOverlay, PressableScale } from '../src/components';
import { usePalette } from '../src/ui/use-palette';
import { colors, radii, shadow, spacing, typography } from '../src/ui/theme';

export default function InitialProfileScreen() {
  const router = useRouter();
  const { session, updateSessionUser, clearSession } = useSession();
  const palette = usePalette();
  const [displayName, setDisplayName] = useState(session?.user.displayName ?? '');
  const [userId, setUserId] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<'displayName' | 'userId' | null>(null);
  const [completionTick, setCompletionTick] = useState(0);
  const navigationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, []);

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus === 'active') {
    return <Redirect href={'/(tabs)/home' as never} />;
  }

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

    const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
    const response = await fetch(`${API_URL}/auth/profile/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.accessToken}` },
      body: formData,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { avatarUrl: string | null };
    return data.avatarUrl;
  };

  const submit = async () => {
    if (!displayName.trim() || !userId.trim()) {
      Alert.alert('入力不足', '表示名とユーザーIDを入力してください。');
      return;
    }

    let shouldDelayNavigate = false;

    try {
      setSubmitting(true);

      let avatarUrl: string | null = null;
      if (avatarUri) {
        avatarUrl = await uploadAvatar(avatarUri);
      }

      const response = await apiRequest<SessionUser>('/auth/initial-profile', {
        method: 'PATCH',
        token: session.accessToken,
        body: {
          displayName: displayName.trim(),
          userId: userId.trim(),
          ...(avatarUrl ? { avatarUrl } : {}),
        },
      });

      updateSessionUser(response);
      setCompletionTick((current) => current + 1);
      shouldDelayNavigate = true;
      navigationTimeoutRef.current = setTimeout(() => {
        router.replace('/');
      }, 900);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearSession();
        router.replace('/(auth)/login' as never);
        return;
      }
      Alert.alert('プロフィール設定に失敗しました', toApiErrorMessage(error));
    } finally {
      if (!shouldDelayNavigate) {
        setSubmitting(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.hero}>
          <Mascot variant="cheer" size={120} />
          <Text style={styles.heroTitle}>はじめまして！</Text>
          <Text style={styles.heroSubtitle}>ホームへ進む前に、あなたのプロフィールを設定しましょう。</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.avatarSection}>
            <PressableScale style={styles.avatarWrapper} onPress={() => { void pickAvatar(); }}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Image
                    source={require('../assets/icon.png')}
                    style={styles.avatarDefaultIcon}
                  />
                </View>
              )}
              <View style={[styles.avatarBadge, { backgroundColor: palette.ctaBg }]}>
                <Ionicons name="camera" size={14} color="#ffffff" />
              </View>
            </PressableScale>
            <Text style={styles.avatarHint}>タップして写真を選ぶ</Text>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>表示名</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                onFocus={() => {
                  setFocusedField('displayName');
                }}
                onBlur={() => {
                  setFocusedField((current) =>
                    current === 'displayName' ? null : current,
                  );
                }}
                placeholder="例：山田 太郎"
                placeholderTextColor="#97a19e"
                style={[
                  styles.input,
                  focusedField === 'displayName' && { borderColor: palette.ctaBg },
                ]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ユーザーID</Text>
              <TextInput
                value={userId}
                onChangeText={setUserId}
                onFocus={() => {
                  setFocusedField('userId');
                }}
                onBlur={() => {
                  setFocusedField((current) => (current === 'userId' ? null : current));
                }}
                placeholder="例：taro_yamada"
                placeholderTextColor="#97a19e"
                autoCapitalize="none"
                autoCorrect={false}
                style={[
                  styles.input,
                  focusedField === 'userId' && { borderColor: palette.ctaBg },
                ]}
              />
              <Text style={styles.fieldHint}>半角英数字・アンダースコア（3〜30文字）</Text>
            </View>
          </View>

          <PressableScale
            hapticStyle="medium"
            style={[
              styles.primaryButton,
              { backgroundColor: palette.ctaBg },
              submitting && styles.buttonDisabled,
            ]}
            disabled={submitting}
            onPress={() => { void submit(); }}
          >
            {submitting ? (
              <ActivityIndicator color={palette.ctaText} />
            ) : (
              <Text style={[styles.primaryButtonLabel, { color: palette.ctaText }]}>
                プロフィールを確定する
              </Text>
            )}
          </PressableScale>
        </View>
      </ScrollView>
      <View pointerEvents="none" style={styles.overlayLayer}>
        <Confetti trigger={completionTick} />
        <MascotCheerOverlay trigger={completionTick} />
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.authBg,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['3xl'],
    gap: spacing.lg,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  heroTitle: {
    ...typography.display,
    color: colors.ink,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  card: {
    padding: spacing.xl,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xl,
    ...shadow.card,
  },
  avatarSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarDefaultIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  avatarHint: {
    ...typography.caption,
    color: colors.hint,
  },
  fieldGroup: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    ...typography.caption,
    color: colors.ink,
  },
  input: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
  },
  fieldHint: {
    ...typography.caption,
    color: colors.hint,
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    paddingVertical: 14,
  },
  primaryButtonLabel: {
    ...typography.subtitle,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  overlayLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
