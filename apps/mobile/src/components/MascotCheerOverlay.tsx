import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Mascot } from './Mascot';

export type MascotCheerOverlayProps = {
  trigger: number;
};

export function MascotCheerOverlay({
  trigger,
}: MascotCheerOverlayProps) {
  const hasMountedRef = useRef(false);
  const hideStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visible, setVisible] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.4);
  const translateY = useSharedValue(40);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (hideStartTimeoutRef.current) {
      clearTimeout(hideStartTimeoutRef.current);
    }
    if (hideCompleteTimeoutRef.current) {
      clearTimeout(hideCompleteTimeoutRef.current);
    }

    setVisible(true);
    opacity.value = 0;
    scale.value = 0.4;
    translateY.value = 40;

    opacity.value = withTiming(1, { duration: 180 });
    translateY.value = withSpring(0, motionSpringPop);
    scale.value = withSequence(
      withTiming(1.02, { duration: 220, easing: Easing.out(Easing.quad) }),
      withTiming(0.94, { duration: 140, easing: Easing.inOut(Easing.quad) }),
      withTiming(1.04, { duration: 140, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 140, easing: Easing.inOut(Easing.quad) }),
    );

    hideStartTimeoutRef.current = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 220 });
      hideCompleteTimeoutRef.current = setTimeout(() => {
        setVisible(false);
      }, 220);
    }, 980);
  }, [opacity, scale, translateY, trigger]);

  useEffect(() => {
    return () => {
      if (hideStartTimeoutRef.current) {
        clearTimeout(hideStartTimeoutRef.current);
      }
      if (hideCompleteTimeoutRef.current) {
        clearTimeout(hideCompleteTimeoutRef.current);
      }
      cancelAnimation(opacity);
      cancelAnimation(scale);
      cancelAnimation(translateY);
    };
  }, [opacity, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      <Animated.View style={animatedStyle}>
        <Mascot size={120} variant="cheer" />
      </Animated.View>
    </View>
  );
}

const motionSpringPop = {
  damping: 10,
  stiffness: 240,
} as const;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
