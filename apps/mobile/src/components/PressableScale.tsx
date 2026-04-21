import * as Haptics from 'expo-haptics';
import type { PressableProps } from 'react-native';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { motion } from '../ui/theme';

type HapticStyle = 'light' | 'medium' | 'none';

export type PressableScaleProps = PressableProps & {
  hapticStyle?: HapticStyle;
};

const hapticMap = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
} as const;

export function PressableScale({
  hapticStyle = 'light',
  disabled = false,
  onPressIn,
  onPressOut,
  children,
  ...props
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: disabled ? 0.6 : 1,
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn: NonNullable<PressableProps['onPressIn']> = (event) => {
    if (!disabled) {
      scale.value = withSpring(0.96, motion.spring.soft);

      if (hapticStyle !== 'none') {
        Haptics.impactAsync(hapticMap[hapticStyle]).catch(() => undefined);
      }
    }

    onPressIn?.(event);
  };

  const handlePressOut: NonNullable<PressableProps['onPressOut']> = (event) => {
    if (!disabled) {
      scale.value = withSpring(1, motion.spring.soft);
    }

    onPressOut?.(event);
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
