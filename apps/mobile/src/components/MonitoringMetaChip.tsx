import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../ui/theme';

export type MonitoringMetaChipProps = {
  icon?: '📍' | '☎️' | '⏱' | '📅';
  label: string;
  tone?: 'neutral' | 'positive' | 'muted';
};

const toneStyles = {
  muted: {
    backgroundColor: colors.secondarySurface,
    borderColor: colors.nestedBorder,
    color: colors.muted,
  },
  neutral: {
    backgroundColor: colors.nestedSurface,
    borderColor: colors.nestedBorder,
    color: colors.ink,
  },
  positive: {
    backgroundColor: colors.accentTint,
    borderColor: colors.accentTint,
    color: colors.accentStrong,
  },
} as const;

export function MonitoringMetaChip({
  icon,
  label,
  tone = 'neutral',
}: MonitoringMetaChipProps) {
  const toneStyle = toneStyles[tone];

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: toneStyle.backgroundColor,
          borderColor: toneStyle.borderColor,
        },
      ]}
    >
      {icon ? <Text style={[styles.text, { color: toneStyle.color }]}>{icon}</Text> : null}
      <Text style={[styles.text, { color: toneStyle.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 28,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  text: {
    ...typography.caption,
  },
});
