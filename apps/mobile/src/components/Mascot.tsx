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
import Svg, { Circle, Ellipse, Path, Text as SvgText } from 'react-native-svg';

export type MascotVariant = 'default' | 'happy' | 'sleepy' | 'cheer' | 'wave';

export type MascotProps = {
  variant: MascotVariant;
  size?: number;
  animated?: boolean;
};

const mascotSource = require('../../assets/splash-icon.png');

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

function MascotOverlay({ variant }: { variant: MascotVariant }) {
  if (variant === 'default') {
    return null;
  }

  return (
    <Svg height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 320 320" width="100%">
      {variant === 'happy' ? (
        <>
          <Path
            d="M 178 142 Q 190 132 202 142"
            fill="none"
            stroke="#9B572A"
            strokeLinecap="round"
            strokeWidth={6}
          />
          <Path
            d="M 222 134 Q 234 124 246 134"
            fill="none"
            stroke="#9B572A"
            strokeLinecap="round"
            strokeWidth={6}
          />
          <Path
            d="M 194 198 Q 216 214 238 194"
            fill="none"
            stroke="#9B572A"
            strokeLinecap="round"
            strokeWidth={8}
          />
          <Path
            d="M 136 112 L 140 122 L 150 126 L 140 130 L 136 140 L 132 130 L 122 126 L 132 122 Z"
            fill="#FFB142"
            opacity={0.9}
          />
          <Path
            d="M 262 92 L 265 100 L 273 103 L 265 106 L 262 114 L 259 106 L 251 103 L 259 100 Z"
            fill="#FFB142"
            opacity={0.9}
          />
        </>
      ) : null}

      {variant === 'sleepy' ? (
        <>
          <Ellipse cx={184} cy={132} fill="#15695C" rx={24} ry={16} />
          <Ellipse cx={228} cy={122} fill="#228073" rx={21} ry={15} />
          <Path
            d="M 170 136 Q 184 132 198 136"
            fill="none"
            stroke="#2E221E"
            strokeLinecap="round"
            strokeWidth={7}
          />
          <Path
            d="M 214 126 Q 227 122 240 126"
            fill="none"
            stroke="#2E221E"
            strokeLinecap="round"
            strokeWidth={7}
          />
          <Path
            d="M 200 202 Q 212 208 226 202"
            fill="none"
            stroke="#9B572A"
            strokeLinecap="round"
            strokeWidth={7}
          />
          <SvgText fill="#C69A74" fontSize="26" fontWeight="700" x="264" y="72">
            Z
          </SvgText>
          <SvgText fill="#A07458" fontSize="18" fontWeight="700" x="286" y="50">
            Z
          </SvgText>
        </>
      ) : null}

      {variant === 'cheer' ? (
        <>
          <Path
            d="M 194 198 Q 216 216 240 194"
            fill="none"
            stroke="#9B572A"
            strokeLinecap="round"
            strokeWidth={9}
          />
          <Path d="M 136 86 L 136 108" fill="none" stroke="#34C759" strokeLinecap="round" strokeWidth={6} />
          <Path d="M 125 97 L 147 97" fill="none" stroke="#34C759" strokeLinecap="round" strokeWidth={6} />
          <Path d="M 268 78 L 268 96" fill="none" stroke="#EE8A57" strokeLinecap="round" strokeWidth={6} />
          <Path d="M 259 87 L 277 87" fill="none" stroke="#EE8A57" strokeLinecap="round" strokeWidth={6} />
          <Circle cx={156} cy={92} fill="#34C759" r={7} />
          <Circle cx={286} cy={108} fill="#15695C" r={7} />
        </>
      ) : null}

      {variant === 'wave' ? (
        <>
          <Path
            d="M 266 122 Q 292 134 292 160"
            fill="none"
            stroke="#EE8A57"
            strokeLinecap="round"
            strokeWidth={6}
          />
          <Path
            d="M 282 108 Q 310 126 310 160"
            fill="none"
            stroke="#EE8A57"
            strokeLinecap="round"
            strokeWidth={6}
          />
          <Path
            d="M 292 96 Q 320 120 320 158"
            fill="none"
            stroke="#EE8A57"
            strokeLinecap="round"
            strokeWidth={6}
          />
        </>
      ) : null}
    </Svg>
  );
}

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
          source={mascotSource}
          style={styles.baseImage}
        />
        <MascotOverlay variant={variant} />
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
