import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../ui/theme';

export type CheckinPulseDotProps = {
  size?: number;
};

export function CheckinPulseDot({
  size = 10,
}: CheckinPulseDotProps) {
  const pulseOpacity = useSharedValue(0.35);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(0, {
        duration: 1400,
        easing: Easing.out(Easing.quad),
      }),
      -1,
      false,
    );
    pulseScale.value = withRepeat(
      withTiming(1.8, {
        duration: 1400,
        easing: Easing.out(Easing.quad),
      }),
      -1,
      false,
    );

    return () => {
      cancelAnimation(pulseOpacity);
      cancelAnimation(pulseScale);
    };
  }, [pulseOpacity, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        {
          height: size,
          width: size,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.pulse,
          pulseStyle,
          {
            borderRadius: size,
            height: size,
            width: size,
          },
        ]}
      />
      <View
        style={[
          styles.dot,
          {
            borderRadius: size,
            height: size,
            width: size,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dot: {
    backgroundColor: colors.liveGreen,
    borderColor: colors.surface,
    borderWidth: 2,
    position: 'absolute',
  },
  pulse: {
    backgroundColor: colors.liveGreen,
    position: 'absolute',
  },
});
