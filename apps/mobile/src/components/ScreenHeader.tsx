import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { MascotVariant } from './Mascot';
import { Mascot } from './Mascot';
import { colors, spacing, typography } from '../ui/theme';

export type ScreenHeaderProps = {
  title: string;
  rightSlot?: ReactNode;
  mascotVariant?: MascotVariant;
};

export function ScreenHeader({
  title,
  rightSlot,
  mascotVariant = 'wave',
}: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leading}>
        <Mascot animated size={28} variant={mascotVariant} />
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.trailing}>{rightSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.pageBg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  leading: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  title: {
    ...typography.kyoiruMark,
    color: colors.ink,
  },
  trailing: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 28,
  },
});
