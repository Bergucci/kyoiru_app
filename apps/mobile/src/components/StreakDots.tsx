import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { usePalette } from '../ui/use-palette';
import { colors, spacing } from '../ui/theme';

type StreakTone = 'free' | 'premium';

export type StreakDotsProps = {
  history: { businessDateJst: string; checkedIn: boolean }[];
  tone?: StreakTone;
};

export function StreakDots({
  history,
  tone = 'free',
}: StreakDotsProps) {
  const palette = usePalette();
  const pulseScale = useSharedValue(1);
  const visibleHistory = useMemo(() => {
    const latestSeven = history.slice(0, 7);

    while (latestSeven.length < 7) {
      latestSeven.push({
        businessDateJst: `placeholder-${latestSeven.length}`,
        checkedIn: false,
      });
    }

    return latestSeven.reverse();
  }, [history]);

  useEffect(() => {
    if (!history[0]?.checkedIn) {
      cancelAnimation(pulseScale);
      pulseScale.value = 1;
      return;
    }

    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.2, {
          duration: 700,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(1, {
          duration: 700,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(pulseScale);
    };
  }, [history, pulseScale]);

  const todayPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View style={styles.row}>
      {visibleHistory.map((item, index) => {
        const isTodayDot = index === visibleHistory.length - 1;
        const dotStyle = [
          styles.dot,
          item.checkedIn
            ? {
                backgroundColor: tone === 'free' ? palette.ctaBg : colors.accent,
                borderColor: tone === 'free' ? palette.ctaBg : colors.accent,
              }
            : styles.dotInactive,
        ];

        if (isTodayDot && history[0]?.checkedIn) {
          return <Animated.View key={item.businessDateJst} style={[dotStyle, todayPulseStyle]} />;
        }

        return <View key={item.businessDateJst} style={dotStyle} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    borderRadius: 999,
    borderWidth: 1,
    height: 12,
    width: 12,
  },
  dotInactive: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
});
