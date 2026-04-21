import { useEffect, useRef, useState } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';

const defaultConfettiSource = require('../../assets/lottie/confetti.json');

export type ConfettiProps = {
  trigger: number;
  source?: React.ComponentProps<typeof LottieView>['source'];
  style?: StyleProp<ViewStyle>;
};

export function Confetti({
  trigger,
  source = defaultConfettiSource,
  style,
}: ConfettiProps) {
  const animationRef = useRef<LottieView>(null);
  const hasMountedRef = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    setVisible(true);
  }, [trigger]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timeoutId = setTimeout(() => {
      animationRef.current?.reset();
      animationRef.current?.play();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [trigger, visible]);

  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="none" style={[styles.container, style]}>
      <LottieView
        autoPlay={false}
        loop={false}
        onAnimationFinish={() => setVisible(false)}
        ref={animationRef}
        resizeMode="cover"
        source={source}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
