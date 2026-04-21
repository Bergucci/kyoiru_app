import { Redirect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../../src/session/session-context';
import { colors } from '../../../src/ui/theme';
import { PressableScale } from '../../../src/components';

const legalItems = [
  { label: 'プライバシーポリシー', href: '/(tabs)/settings/privacy-policy' },
  { label: '利用規約', href: '/(tabs)/settings/terms' },
  { label: '特定商取引法に基づく表記', href: '/(tabs)/settings/commerce-disclosure' },
] as const;

export default function LegalScreen() {
  const router = useRouter();
  const { session } = useSession();

  if (!session) {
    return <Redirect href={'/(auth)/login' as never} />;
  }

  if (session.user.profileStatus !== 'active') {
    return <Redirect href={'/initial-profile' as never} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.menuList}>
        {legalItems.map((item, index) => (
          <PressableScale
            key={item.href}
            style={[styles.menuItem, index < legalItems.length - 1 && styles.menuItemBorder]}
            onPress={() => { router.push(item.href as never); }}
          >
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.hint} />
          </PressableScale>
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
});
