import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../ui/theme';

export type MonitoringStageToneKey = 'calm' | 'caution' | 'warn' | 'alert';

const stageTone: Record<
  MonitoringStageToneKey,
  { bg: string; fg: string; label: string }
> = {
  alert: {
    bg: '#fde1dd',
    fg: colors.danger,
    label: '第3段階',
  },
  calm: {
    bg: colors.accentTint,
    fg: colors.accentStrong,
    label: '平常',
  },
  caution: {
    bg: '#fff2db',
    fg: colors.warning,
    label: '第1段階',
  },
  warn: {
    bg: '#ffe3c8',
    fg: colors.warning,
    label: '第2段階',
  },
};

export function resolveMonitoringStageTone(
  stage: string,
): MonitoringStageToneKey {
  switch (stage) {
    case 'monitor_stage_3':
      return 'alert';
    case 'monitor_stage_2':
      return 'warn';
    case 'monitor_stage_1':
      return 'caution';
    default:
      return 'calm';
  }
}

export function MonitoringStageBadge({ stage }: { stage: string }) {
  const tone = stageTone[resolveMonitoringStageTone(stage)];

  return (
    <View style={[styles.badge, { backgroundColor: tone.bg }]}>
      <View style={[styles.dot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.label, { color: tone.fg }]}>{tone.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 6,
    minHeight: 24,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  dot: {
    borderRadius: 999,
    height: 6,
    width: 6,
  },
  label: {
    ...typography.caption,
    fontWeight: '700',
  },
});
