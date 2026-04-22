import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import LottieView from 'lottie-react-native';

const defaultMascotBounceSource = require('../../assets/lottie/mascot-bounce.json');

export type MascotCheerOverlayProps = {
  trigger: number;
};

export function MascotCheerOverlay({
  trigger,
}: MascotCheerOverlayProps) {
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
    <View pointerEvents="none" style={styles.container}>
      <LottieView
        autoPlay={false}
        loop={false}
        onAnimationFinish={() => setVisible(false)}
        ref={animationRef}
        resizeMode="contain"
        source={defaultMascotBounceSource}
        style={styles.animation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  animation: {
    width: 200,
    height: 200,
  },
});
