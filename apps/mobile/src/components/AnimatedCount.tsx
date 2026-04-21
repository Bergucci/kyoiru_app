import { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../ui/theme';

export type AnimatedCountProps = {
  emoji: string;
  value: number;
};

export function AnimatedCount({ emoji, value }: AnimatedCountProps) {
  const hasMountedRef = useRef(false);
  const previousValueRef = useRef(value);
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const previousValue = previousValueRef.current;
    previousValueRef.current = value;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (value <= previousValue) {
      return;
    }

    scale.value = withSequence(
      withTiming(1.25, { duration: 200 }),
      withTiming(1, { duration: 200 }),
    );
    translateY.value = -6;
    translateY.value = withTiming(0, { duration: 180 });
  }, [scale, translateY, value]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const valueStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Text style={styles.text}>{emoji}</Text>
      <Animated.Text style={[styles.text, valueStyle]}>{value}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  text: {
    color: colors.ink,
    fontSize: 13,
  },
});
