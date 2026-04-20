import { Redirect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../../src/session/session-context';
import { resolveMediaUrl } from '../../../src/lib/api';
import { colors } from '../../../src/ui/theme';

const primaryMenuItems = [
  {
    label: '表示名・ユーザーID',
    detail: 'USER_ID',
    href: '/(tabs)/settings/profile',
  },
  {
    label: '通知',
    detail: 'オン',
    href: '/(tabs)/settings/notifications',
  },
  {
    label: 'ブロックリスト',
    detail: '一覧',
    href: '/(tabs)/settings/blocks',
  },
  {
    label: 'サブスクリプション',
    detail: '管理',
    href: '/(tabs)/settings/subscription-management',
  },
];

const supportMenuItems = [
  { label: 'ヘルプ・お問い合わせ', href: '/(tabs)/settings/help' },
  { label: '利用規約・プライバシー', href: '/(tabs)/settings/legal' },
  { label: 'アカウントを削除', href: '/(tabs)/settings/account-delete', danger: true },
];

function getInitial(value: string | null | undefined) {
  return (value?.trim().charAt(0) || '今').toUpperCase();
}

export default function SettingsIndexScreen() {
  const router = useRouter();
  const { session } = useSession();

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  const profileInitial = getInitial(session.user.displayName || session.user.userId);
  const resolvedPrimaryMenuItems = primaryMenuItems.map((item) =>
    item.label === '表示名・ユーザーID'
      ? { ...item, detail: session.user.userId }
      : item,
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            {resolveMediaUrl(session.user.avatarUrl) ? (
              <Image source={{ uri: resolveMediaUrl(session.user.avatarUrl) }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarLabel}>{profileInitial}</Text>
            )}
          </View>
          <View style={styles.profileBody}>
            <Text style={styles.profileName}>
              {session.user.displayName || '表示名未設定'}
            </Text>
            <Text style={styles.profileMeta}>{session.user.userId}</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuList}>
        {resolvedPrimaryMenuItems.map((item) => (
          <Pressable
            key={item.href}
            style={[
              styles.menuItem,
              item.href !==
                resolvedPrimaryMenuItems[resolvedPrimaryMenuItems.length - 1]?.href &&
                styles.menuItemBorder,
            ]}
            onPress={() => {
              router.push(item.href as never);
            }}
          >
            <Text style={styles.menuLabel}>{item.label}</Text>
            <View style={styles.menuTrailing}>
              <Text style={styles.menuMeta}>{item.detail}</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.hint}
              />
            </View>
          </Pressable>
        ))}
      </View>

      <Text style={styles.supportLabel}>サポート</Text>

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
            <Text style={[styles.menuLabel, item.danger && styles.dangerLabel]}>
              {item.label}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.hint}
            />
          </Pressable>
        ))}
      </View>
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
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    fontSize: 13,
    color: colors.muted,
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
    color: colors.muted,
    fontSize: 13,
  },
  supportLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    paddingHorizontal: 4,
    letterSpacing: 0.5,
  },
});
