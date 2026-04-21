import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  Path,
  RadialGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

export type MascotVariant = 'default' | 'happy' | 'sleepy' | 'cheer' | 'wave';

export type MascotProps = {
  variant: MascotVariant;
  size?: number;
  animated?: boolean;
};

const AnimatedG = Animated.createAnimatedComponent(G);

const bodyGradientStops = (
  <Defs>
    <RadialGradient cx="40%" cy="35%" id="mascotBodyGradient" r="85%">
      <Stop offset="0%" stopColor="#FFD3A8" />
      <Stop offset="60%" stopColor="#FFA978" />
      <Stop offset="100%" stopColor="#EE8A57" />
    </RadialGradient>
  </Defs>
);

const wingPath = 'M 0 10 Q 34 -22 90 -4 Q 122 34 94 86 Q 38 102 0 52 Z';

const wingAngles = {
  cheer: { left: -46, right: 42 },
  default: { left: -16, right: 18 },
  happy: { left: -12, right: 15 },
  sleepy: { left: -8, right: 10 },
  wave: { left: -10, right: 28 },
} as const satisfies Record<MascotVariant, { left: number; right: number }>;

function renderEyes(variant: MascotVariant) {
  switch (variant) {
    case 'happy':
      return (
        <>
          <Path
            d="M 182 146 Q 196 136 210 146"
            fill="none"
            stroke="#3A2418"
            strokeLinecap="round"
            strokeWidth={7}
          />
          <Path
            d="M 226 146 Q 240 136 254 146"
            fill="none"
            stroke="#3A2418"
            strokeLinecap="round"
            strokeWidth={7}
          />
        </>
      );
    case 'sleepy':
      return (
        <>
          <Path
            d="M 182 148 L 208 148"
            fill="none"
            stroke="#3A2418"
            strokeLinecap="round"
            strokeWidth={7}
          />
          <Path
            d="M 228 148 L 254 148"
            fill="none"
            stroke="#3A2418"
            strokeLinecap="round"
            strokeWidth={7}
          />
        </>
      );
    case 'wave':
      return (
        <>
          <Circle cx={196} cy={150} fill="#3A2418" r={9} />
          <Circle cx={199} cy={147} fill="#FFFFFF" r={2.5} />
          <Path
            d="M 232 149 Q 243 140 254 149"
            fill="none"
            stroke="#3A2418"
            strokeLinecap="round"
            strokeWidth={7}
          />
        </>
      );
    default:
      return (
        <>
          <Circle cx={198} cy={150} fill="#3A2418" r={10} />
          <Circle cx={201.5} cy={147} fill="#FFFFFF" r={3} />
          <Circle cx={244} cy={150} fill="#3A2418" r={10} />
          <Circle cx={247.5} cy={147} fill="#FFFFFF" r={3} />
        </>
      );
  }
}

function renderMouth(variant: MascotVariant) {
  switch (variant) {
    case 'happy':
    case 'cheer':
      return (
        <Path
          d="M 206 188 Q 222 204 238 188"
          fill="none"
          stroke="#8B4E2E"
          strokeLinecap="round"
          strokeWidth={6}
        />
      );
    case 'sleepy':
      return (
        <Path
          d="M 212 190 Q 222 194 232 190"
          fill="none"
          stroke="#8B4E2E"
          strokeLinecap="round"
          strokeWidth={5}
        />
      );
    default:
      return (
        <Path
          d="M 212 188 Q 222 198 232 188"
          fill="none"
          stroke="#8B4E2E"
          strokeLinecap="round"
          strokeWidth={5}
        />
      );
  }
}

function renderExtras(variant: MascotVariant) {
  if (variant !== 'sleepy') {
    return null;
  }

  return (
    <>
      <SvgText fill="#A07458" fontSize="22" fontWeight="700" x="262" y="96">
        Z
      </SvgText>
      <SvgText fill="#A07458" fontSize="16" fontWeight="700" x="282" y="72">
        Z
      </SvgText>
    </>
  );
}

export function Mascot({
  variant,
  size = 64,
  animated = false,
}: MascotProps) {
  const leftWingRotation = useSharedValue<number>(wingAngles[variant].left);
  const rightWingRotation = useSharedValue<number>(wingAngles[variant].right);

  useEffect(() => {
    leftWingRotation.value = wingAngles[variant].left;
    rightWingRotation.value = wingAngles[variant].right;

    if (!animated) {
      cancelAnimation(leftWingRotation);
      cancelAnimation(rightWingRotation);
      return;
    }

    const delta =
      variant === 'wave' ? 18 : variant === 'cheer' ? 14 : 10;

    leftWingRotation.value = withRepeat(
      withSequence(
        withTiming(wingAngles[variant].left - delta, {
          duration: 260,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(wingAngles[variant].left + delta / 2, {
          duration: 320,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(wingAngles[variant].left, {
          duration: 320,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );

    rightWingRotation.value = withRepeat(
      withSequence(
        withTiming(wingAngles[variant].right + delta, {
          duration: 260,
          easing: Easing.out(Easing.quad),
        }),
        withTiming(wingAngles[variant].right - delta / 2, {
          duration: 320,
          easing: Easing.inOut(Easing.quad),
        }),
        withTiming(wingAngles[variant].right, {
          duration: 320,
          easing: Easing.inOut(Easing.quad),
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(leftWingRotation);
      cancelAnimation(rightWingRotation);
    };
  }, [animated, leftWingRotation, rightWingRotation, variant]);

  const leftWingAnimatedProps = useAnimatedProps(() => ({
    rotation: leftWingRotation.value,
  }));

  const rightWingAnimatedProps = useAnimatedProps(() => ({
    rotation: rightWingRotation.value,
  }));

  const isWave = variant === 'wave';
  const isCheer = variant === 'cheer';

  return (
    <View style={[styles.container, { height: size, width: size }]}>
      <Svg height={size} viewBox="0 0 320 320" width={size}>
        {bodyGradientStops}
        {!isWave ? (
          <Path d="M 64 208 L 102 176 L 104 236 Z" fill="#E2814E" />
        ) : null}
        <AnimatedG animatedProps={leftWingAnimatedProps} originX={120} originY={172}>
          <Path
            d={wingPath}
            fill="#E89366"
            opacity={isWave ? 0.28 : 0.52}
            transform="translate(60 150) scale(0.92 0.96)"
          />
        </AnimatedG>
        <AnimatedG animatedProps={rightWingAnimatedProps} originX={216} originY={168}>
          <Path
            d={wingPath}
            fill="#E89366"
            opacity={isWave ? 0.92 : 0.82}
            transform={
              isCheer
                ? 'translate(180 138) scale(0.82 0.92)'
                : isWave
                  ? 'translate(188 140) scale(0.74 0.88)'
                  : 'translate(174 154) scale(0.86 0.94)'
            }
          />
        </AnimatedG>
        <Ellipse
          cx={168}
          cy={182}
          fill="url(#mascotBodyGradient)"
          rx={isWave ? 82 : 98}
          ry={isWave ? 78 : 88}
        />
        <Path
          d={
            isWave
              ? 'M 120 178 Q 144 150 196 162 Q 220 190 184 230 Q 138 232 120 178 Z'
              : 'M 108 178 Q 138 134 214 148 Q 242 198 174 248 Q 116 244 108 178 Z'
          }
          fill="#E89366"
          opacity={isWave ? 0.68 : 0.84}
        />
        <Path d="M 246 186 L 284 202 L 246 220 Z" fill="#FFB04A" />
        {renderEyes(variant)}
        {renderMouth(variant)}
        {!isWave ? (
          <G stroke="#C46A3E" strokeLinecap="round" strokeWidth={5}>
            <Line x1="132" x2="132" y1="266" y2="284" />
            <Line x1="184" x2="184" y1="266" y2="284" />
          </G>
        ) : null}
        {renderExtras(variant)}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
