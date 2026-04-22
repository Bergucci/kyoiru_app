import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Mascot, PressableScale, ScreenHeader } from '../../../src/components';
import { useSession } from '../../../src/session/session-context';
import { resolveMediaUrl } from '../../../src/lib/api';
import { usePalette } from '../../../src/ui/use-palette';
import { colors, radii, spacing, typography } from '../../../src/ui/theme';

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

const ONBOARDING_STORAGE_KEY = 'kyoiru.onboardingCompleted';

export default function SettingsIndexScreen() {
  const router = useRouter();
  const { session } = useSession();
  const palette = usePalette();

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
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';
  const avatarUri = resolveMediaUrl(session.user.avatarUrl);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenHeader title="せってい" />
      <View style={[styles.profileHeroShell, palette.cardShadow]}>
        <LinearGradient colors={[...palette.hero]} style={styles.profileCard}>
          <View style={styles.heroMascot}>
            <Mascot variant="wave" size={56} />
          </View>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarLabel}>{profileInitial}</Text>
              )}
            </View>
            <View style={styles.profileBody}>
              <Text style={styles.profileName}>
                {session.user.displayName || '表示名未設定'}
              </Text>
              <Text style={styles.profileMeta}>@{session.user.userId}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>アカウント</Text>
        <Card style={styles.menuCard} tone="default">
          {resolvedPrimaryMenuItems.map((item) => (
            <PressableScale
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
            </PressableScale>
          ))}
        </Card>
      </View>

      <View style={styles.sectionBlock}>
        <Text style={styles.sectionLabel}>サポート</Text>
        <Card style={styles.menuCard} tone="default">
          {supportMenuItems.map((item) => (
            <PressableScale
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
            </PressableScale>
          ))}
        </Card>
      </View>

      <View style={styles.footerMascot}>
        <Mascot size={80} variant="happy" />
        <Text style={styles.footerNote}>今日もありがとう</Text>
        <Text style={styles.version}>v{appVersion}</Text>
        {__DEV__ ? (
          <PressableScale
            hapticStyle="light"
            onPress={async () => {
              await AsyncStorage.removeItem(ONBOARDING_STORAGE_KEY);
              Alert.alert('dev', 'onboarding reset');
            }}
            style={styles.debugButton}
          >
            <Text style={styles.debugButtonLabel}>[dev] reset onboarding</Text>
          </PressableScale>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: colors.pageBg,
  },
  profileHeroShell: {
    borderRadius: radii.xl,
  },
  profileCard: {
    overflow: 'hidden',
    padding: spacing.xl,
    borderRadius: radii.xl,
    minHeight: 144,
  },
  heroMascot: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingRight: 72,
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
    gap: spacing.xs,
  },
  profileName: {
    ...typography.display,
    color: colors.ink,
  },
  profileMeta: {
    ...typography.caption,
    color: colors.muted,
  },
  sectionBlock: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    paddingHorizontal: spacing.xs,
    color: colors.muted,
    letterSpacing: 0.5,
  },
  menuCard: {
    overflow: 'hidden',
    borderRadius: radii.lg,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.nestedBorder,
  },
  menuLabel: {
    ...typography.subtitle,
    color: colors.ink,
  },
  dangerLabel: {
    color: colors.danger,
  },
  menuTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  menuMeta: {
    ...typography.caption,
    color: colors.muted,
  },
  footerMascot: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
    gap: spacing.sm,
  },
  footerNote: {
    ...typography.body,
    color: colors.ink,
  },
  version: {
    ...typography.caption,
    color: colors.hint,
  },
  debugButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.secondarySurface,
  },
  debugButtonLabel: {
    ...typography.caption,
    color: colors.muted,
  },
});
