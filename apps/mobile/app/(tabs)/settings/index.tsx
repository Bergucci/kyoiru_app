import { Redirect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
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

function getInitial(value: string | null | undefined) {
  return (value?.trim().charAt(0) || '今').toUpperCase();
}

export default function SettingsIndexScreen() {
  const router = useRouter();
  const { session, clearSession } = useSession();

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const profileInitial = getInitial(session.user.displayName || session.user.userId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>設定</Text>
        <Text style={styles.heroText}>
          プロフィール、アカウント、通知、サブスクを本体メニューに戻しました。
        </Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{profileInitial}</Text>
          </View>
          <View style={styles.profileBody}>
            <Text style={styles.profileName}>
              {session.user.displayName || '表示名未設定'}
            </Text>
            <Text style={styles.profileMeta}>@{session.user.userId}</Text>
          </View>
          <View style={styles.profileBadge}>
            <Text style={styles.profileBadgeLabel}>アプリ設定</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>本体設定</Text>
        <View style={styles.menuList}>
          {primaryMenuItems.map((item) => (
            <Pressable
              key={item.href}
              style={[
                styles.menuItem,
                item.href !== primaryMenuItems[primaryMenuItems.length - 1]?.href &&
                  styles.menuItemBorder,
              ]}
              onPress={() => {
                router.push(item.href as never);
              }}
            >
              <Text style={styles.menuLabel}>{item.label}</Text>
              <View style={styles.menuTrailing}>
                <Text style={styles.menuMeta}>開く</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.hint}
                />
              </View>
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
              style={[
                styles.menuItem,
                item.href !== supportMenuItems[supportMenuItems.length - 1]?.href &&
                  styles.menuItemBorder,
              ]}
              onPress={() => {
                router.push(item.href as never);
              }}
            >
              <Text
                style={[
                  styles.menuLabel,
                  item.href.endsWith('account-delete') && styles.dangerLabel,
                ]}
              >
                {item.label}
              </Text>
              <View style={styles.menuTrailing}>
                <Text style={styles.menuMeta}>開く</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.hint}
                />
              </View>
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
    backgroundColor: colors.pageBg,
  },
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: colors.settingsInk,
    gap: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onDark,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.onSettingsMuted,
  },
  profileCard: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  avatarLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.accentStrong,
  },
  profileBody: {
    flex: 1,
    gap: 3,
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
  profileBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  profileBadgeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentStrong,
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
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.surface,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.nestedBorder,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  dangerLabel: {
    color: colors.danger,
  },
  menuTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: colors.secondarySurface,
  },
  logoutLabel: {
    color: colors.ink,
    fontWeight: '700',
  },
});
