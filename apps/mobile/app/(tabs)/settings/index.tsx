import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';

const primaryMenuItems = [
  { label: 'プロフィール', href: '/(tabs)/settings/profile' },
  { label: 'アカウント', href: '/(tabs)/settings/account' },
  { label: '通知設定', href: '/(tabs)/settings/notifications' },
  { label: 'サブスク管理', href: '/(tabs)/settings/subscription-management' },
];

const supportMenuItems = [
  { label: 'block 一覧', href: '/(tabs)/settings/blocks' },
  { label: 'ヘルプ', href: '/(tabs)/settings/help' },
  { label: '法務リンク', href: '/(tabs)/settings/legal' },
  { label: '位置情報の説明', href: '/(tabs)/settings/location-permission' },
  { label: '見守りプラン説明', href: '/(tabs)/settings/subscription-info' },
  { label: 'アカウント削除', href: '/(tabs)/settings/account-delete' },
];

export default function SettingsIndexScreen() {
  const router = useRouter();
  const { session, clearSession } = useSession();

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>設定</Text>
        <Text style={styles.heroText}>
          プロフィール、アカウント、通知、サブスクを本体メニューに戻しました。
        </Text>
      </View>

      <View style={styles.profileCard}>
        <Text style={styles.profileName}>
          {session.user.displayName || '表示名未設定'}
        </Text>
        <Text style={styles.profileMeta}>@{session.user.userId}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>本体設定</Text>
        <View style={styles.menuList}>
          {primaryMenuItems.map((item) => (
            <Pressable
              key={item.href}
              style={styles.menuItem}
              onPress={() => {
                router.push(item.href as never);
              }}
            >
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuMeta}>開く</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>補助メニュー</Text>
        <View style={styles.menuList}>
          {supportMenuItems.map((item) => (
            <Pressable
              key={item.href}
              style={styles.menuItem}
              onPress={() => {
                router.push(item.href as never);
              }}
            >
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuMeta}>開く</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        style={styles.logoutButton}
        onPress={() => {
          clearSession();
          router.replace('/(auth)/login' as never);
        }}
      >
        <Text style={styles.logoutLabel}>ローカルセッションを破棄</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    backgroundColor: '#f6f1e7',
  },
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#4a4a5a',
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fffdf8',
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#e3e3ef',
  },
  profileCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  profileMeta: {
    fontSize: 14,
    color: colors.muted,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  menuList: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  menuMeta: {
    color: colors.accent,
    fontWeight: '600',
  },
  logoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#ebe3d6',
  },
  logoutLabel: {
    color: colors.ink,
    fontWeight: '700',
  },
});
