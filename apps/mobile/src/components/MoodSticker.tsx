import { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { usePalette } from '../ui/use-palette';
import { PressableScale } from './PressableScale';
import { colors, motion, radii, spacing, typography } from '../ui/theme';

export type MoodStickerProps = {
  emoji: string;
  label: string;
  selected?: boolean;
  onPress: () => void;
  disabled?: boolean;
};

export function MoodSticker({
  emoji,
  label,
  selected = false,
  onPress,
  disabled = false,
}: MoodStickerProps) {
  const palette = usePalette();
  const previousSelectedRef = useRef(selected);
  const stickerScale = useSharedValue(selected ? 1.06 : 1);
  const stickerRotation = useSharedValue(0);

  useEffect(() => {
    stickerScale.value = withSpring(selected ? 1.06 : 1, motion.spring.pop);

    if (!previousSelectedRef.current && selected) {
      stickerRotation.value = withSequence(
        withTiming(-8, { duration: 180 }),
        withTiming(0, { duration: 220 }),
      );
    } else if (!selected) {
      stickerRotation.value = withTiming(0, { duration: motion.duration.fast });
    }

    previousSelectedRef.current = selected;
  }, [selected, stickerRotation, stickerScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: stickerScale.value },
      { rotateZ: `${stickerRotation.value}deg` },
    ],
  }));

  const content = (
    <Animated.View
      style={[
        styles.base,
        animatedStyle,
        selected && { borderColor: palette.ctaBg },
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );

  if (disabled) {
    return content;
  }

  return (
    <PressableScale hapticStyle="light" onPress={onPress}>
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderColor: 'transparent',
    borderRadius: radii.lg,
    borderWidth: 2,
    height: 72,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    width: 72,
  },
  disabled: {
    opacity: 0.5,
  },
  emoji: {
    fontSize: 32,
    lineHeight: 36,
  },
  label: {
    ...typography.caption,
    color: colors.ink,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
