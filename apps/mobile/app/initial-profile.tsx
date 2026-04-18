import { Redirect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { ApiError, apiRequest, toApiErrorMessage } from '../src/lib/api';
import { useSession, type SessionUser } from '../src/session/session-context';
import { colors } from '../src/ui/theme';

export default function InitialProfileScreen() {
  const router = useRouter();
  const { session, updateSessionUser, clearSession } = useSession();
  const [displayName, setDisplayName] = useState(session?.user.displayName ?? '');
  const [userId, setUserId] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      Alert.alert('プロフィール設定に失敗しました', toApiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>プロフィール設定</Text>
          <Text style={styles.heroSubtitle}>ホームへ進む前に、あなたのプロフィールを設定しましょう。</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.avatarSection}>
            <Pressable style={styles.avatarWrapper} onPress={() => { void pickAvatar(); }}>
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
              <View style={styles.avatarBadge}>
                <Ionicons name="camera" size={14} color="#ffffff" />
              </View>
            </Pressable>
            <Text style={styles.avatarHint}>タップして写真を選ぶ</Text>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>表示名</Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="例：山田 太郎"
                placeholderTextColor="#97a19e"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>ユーザーID</Text>
              <TextInput
                value={userId}
                onChangeText={setUserId}
                placeholder="例：taro_yamada"
                placeholderTextColor="#97a19e"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              <Text style={styles.fieldHint}>半角英数字・アンダースコア（3〜30文字）</Text>
            </View>
          </View>

          <Pressable
            style={[styles.primaryButton, submitting && styles.buttonDisabled]}
            disabled={submitting}
            onPress={() => { void submit(); }}
          >
            {submitting ? (
              <ActivityIndicator color="#fffdf8" />
            ) : (
              <Text style={styles.primaryButtonLabel}>プロフィールを確定する</Text>
            )}
          </Pressable>
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
    paddingBottom: 32,
    gap: 14,
  },
  hero: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 20,
    borderRadius: 26,
    backgroundColor: colors.accentStrong,
    gap: 8,
  },
  heroTitle: {
    color: '#fffdf8',
    fontSize: 24,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: '#c8dbd4',
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#fbf8f1',
    borderWidth: 1,
    borderColor: '#ddd4c5',
    gap: 20,
    shadowColor: '#173d35',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: '#f0e8d8',
    borderWidth: 2,
    borderColor: '#ddd4c5',
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
    backgroundColor: colors.accentStrong,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fbf8f1',
  },
  avatarHint: {
    fontSize: 12,
    color: '#7d8782',
  },
  fieldGroup: {
    gap: 14,
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
    borderColor: '#d7cfbf',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
  },
  fieldHint: {
    fontSize: 11,
    color: '#97a19e',
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
