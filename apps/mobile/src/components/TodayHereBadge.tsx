import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, radii, spacing, typography } from '../ui/theme';

export function TodayHereBadge() {
  const rotate = useSharedValue(0);

  useEffect(() => {
    rotate.value = withRepeat(
      withSequence(
        withTiming(4, {
          duration: 150,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(0, {
          duration: 150,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(-4, {
          duration: 150,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, {
          duration: 150,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, {
          duration: 1400,
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(rotate);
    };
  }, [rotate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotate.value}deg` }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.badge, animatedStyle]}>
      <Animated.Text style={styles.label}>今日いる！</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    backgroundColor: colors.liveGreenTint,
    borderRadius: radii.pill,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  label: {
    ...typography.caption,
    color: colors.liveGreen,
    fontWeight: '700',
  },
});
