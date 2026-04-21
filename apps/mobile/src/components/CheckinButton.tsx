import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
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

type CheckinTone = 'free' | 'premium';
type CheckinButtonState = 'idle' | 'submitting' | 'done';

export type CheckinButtonProps = {
  state: CheckinButtonState;
  onPress: () => void;
  tone?: CheckinTone;
};

export function CheckinButton({
  state,
  onPress,
  tone = 'free',
}: CheckinButtonProps) {
  const palette = usePalette();
  const [previewDone, setPreviewDone] = useState(false);
  const isAnimatingRef = useRef(false);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const buttonScale = useSharedValue(1);
  const labelRotation = useSharedValue(0);
  const toneStyle = {
    free: {
      backgroundColor: palette.ctaBg,
      label: '今日いる！',
    },
    premium: {
      backgroundColor: colors.accent,
      label: '本日のチェックイン',
    },
  } as const satisfies Record<
    CheckinTone,
    { backgroundColor: string; label: string }
  >;

  useEffect(() => {
    if (state === 'idle' && !isAnimatingRef.current) {
      setPreviewDone(false);
      buttonScale.value = 1;
      labelRotation.value = 0;
    }
  }, [buttonScale, labelRotation, state]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  const startSequence = () => {
    if (state !== 'idle' || isAnimatingRef.current) {
      return;
    }

    isAnimatingRef.current = true;
    setPreviewDone(false);
    buttonScale.value = withSpring(0.94, motion.spring.pop);
    labelRotation.value = 0;

    timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutIdsRef.current = [
      setTimeout(() => {
        setPreviewDone(true);
        labelRotation.value = withSequence(
          withTiming(-10, { duration: 140 }),
          withTiming(-6, { duration: 120 }),
          withTiming(-8, { duration: 140 }),
        );
      }, 60),
      setTimeout(() => {
        buttonScale.value = withSpring(1, motion.spring.pop);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
          () => undefined,
        );
        onPress();
        isAnimatingRef.current = false;
      }, 120),
    ];
  };

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: state === 'idle' ? buttonScale.value : 1 }],
  }));

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        rotateZ: `${state === 'done' ? -8 : labelRotation.value}deg`,
      },
    ],
  }));

  const isIdle = state === 'idle';
  const isSubmitting = state === 'submitting';
  const isDone = state === 'done';

  const labelContent = isSubmitting ? (
    <ActivityIndicator color={colors.white} />
  ) : (
    <Animated.Text style={[styles.label, labelAnimatedStyle]}>
      {isDone || previewDone ? '済' : toneStyle[tone].label}
    </Animated.Text>
  );

  const content = (
    <Animated.View
      style={[
        styles.button,
        buttonAnimatedStyle,
        {
          backgroundColor: toneStyle[tone].backgroundColor,
          opacity: isDone ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.content}>{labelContent}</View>
    </Animated.View>
  );

  if (!isIdle) {
    return content;
  }

  return (
    <PressableScale
      accessibilityRole="button"
      hapticStyle="light"
      onPressIn={startSequence}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
  },
  label: {
    ...typography.subtitle,
    color: colors.white,
    textAlign: 'center',
  },
});
