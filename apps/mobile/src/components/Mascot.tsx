import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export type MascotVariant = 'default' | 'happy' | 'sleepy' | 'cheer' | 'wave';

export type MascotProps = {
  variant: MascotVariant;
  size?: number;
  animated?: boolean;
};

const mascotSources = {
  cheer: require('../../assets/mascot/cheer.png'),
  default: require('../../assets/mascot/mascot-default.png'),
  happy: require('../../assets/mascot/happy.png'),
  sleepy: require('../../assets/mascot/sleepy.png'),
  wave: require('../../assets/mascot/wave.png'),
} as const satisfies Record<MascotVariant, number>;

const motionByVariant = {
  cheer: { bob: 10, rotate: 4, scale: 1.04, duration: 620 },
  default: { bob: 3, rotate: 1.2, scale: 1.01, duration: 1400 },
  happy: { bob: 5, rotate: 1.6, scale: 1.02, duration: 980 },
  sleepy: { bob: 2, rotate: 0.8, scale: 1.005, duration: 1800 },
  wave: { bob: 7, rotate: 3.4, scale: 1.03, duration: 760 },
} as const satisfies Record<
  MascotVariant,
  { bob: number; rotate: number; scale: number; duration: number }
>;

export function Mascot({
  variant,
  size = 64,
  animated = false,
}: MascotProps) {
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const motion = motionByVariant[variant];

    translateY.value = 0;
    rotate.value = 0;
    scale.value = 1;

    if (!animated) {
      cancelAnimation(translateY);
      cancelAnimation(rotate);
      cancelAnimation(scale);
      return;
    }

    translateY.value = withRepeat(
      withSequence(
        withTiming(-motion.bob, {
          duration: motion.duration,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, {
          duration: motion.duration,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );

    rotate.value = withRepeat(
      withSequence(
        withTiming(-motion.rotate, {
          duration: motion.duration,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(motion.rotate, {
          duration: motion.duration,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(0, {
          duration: motion.duration,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );

    scale.value = withRepeat(
      withSequence(
        withTiming(motion.scale, {
          duration: motion.duration,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(1, {
          duration: motion.duration,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(translateY);
      cancelAnimation(rotate);
      cancelAnimation(scale);
    };
  }, [animated, rotate, scale, translateY, variant]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={[styles.container, { height: size, width: size }]}>
      <Animated.View style={[styles.artboard, animatedStyle]}>
        <Image
          resizeMode="contain"
          source={mascotSources[variant]}
          style={styles.baseImage}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artboard: {
    height: '100%',
    position: 'relative',
    width: '100%',
  },
  baseImage: {
    height: '100%',
    width: '100%',
  },
});
