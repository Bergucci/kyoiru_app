import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '../ui/theme';

const PARTICLES = [
  { delay: 0, offsetX: -8 },
  { delay: 100, offsetX: 0 },
  { delay: 200, offsetX: 8 },
] as const;

type ReactionBurstParticleProps = {
  delay: number;
  emoji: string;
  offsetX: number;
  playToken: number;
};

function ReactionBurstParticle({
  delay,
  emoji,
  offsetX,
  playToken,
}: ReactionBurstParticleProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(0);

  useEffect(() => {
    opacity.value = 1;
    scale.value = 0.8;
    translateY.value = 0;

    opacity.value = withDelay(
      delay,
      withTiming(0, {
        duration: 500,
        easing: Easing.out(Easing.quad),
      }),
    );
    scale.value = withDelay(delay, withSpring(1.1, motion.spring.pop));
    translateY.value = withDelay(
      delay,
      withTiming(-40, {
        duration: 500,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [delay, opacity, playToken, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: offsetX },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.Text style={[styles.particle, animatedStyle]}>{emoji}</Animated.Text>
  );
}

export type ReactionBurstProps = {
  emoji: string;
  trigger: number;
};

export function ReactionBurst({ emoji, trigger }: ReactionBurstProps) {
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousTriggerRef = useRef(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const previousTrigger = previousTriggerRef.current;
    previousTriggerRef.current = trigger;

    if (trigger === 0 || trigger === previousTrigger) {
      return;
    }

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }

    setVisible(true);
    hideTimeoutRef.current = setTimeout(() => {
      setVisible(false);
    }, 700);

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [trigger]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View pointerEvents="none" style={styles.container}>
      {PARTICLES.map((particle) => (
        <ReactionBurstParticle
          key={`${particle.delay}-${particle.offsetX}`}
          delay={particle.delay}
          emoji={emoji}
          offsetX={particle.offsetX}
          playToken={trigger}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  particle: {
    fontSize: 22,
    position: 'absolute',
  },
});
