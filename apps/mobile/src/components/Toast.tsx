import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors, motion, radii, shadow, spacing, typography } from '../ui/theme';

type ToastType = 'success' | 'info' | 'error';

export type ToastShowOptions = {
  message: string;
  type?: ToastType;
  durationMs?: number;
  silent?: boolean;
};

type ToastItem = Required<ToastShowOptions> & {
  id: number;
};

let nextToastId = 0;

type ToastHostController = {
  enqueue: (options: ToastShowOptions) => void;
};

let toastHostController: ToastHostController | null = null;

const toastTone = {
  success: {
    backgroundColor: colors.accent,
    color: colors.white,
  },
  info: {
    backgroundColor: colors.ink,
    color: colors.white,
  },
  error: {
    backgroundColor: colors.danger,
    color: colors.white,
  },
} as const;

function normalizeToast(options: ToastShowOptions): ToastItem {
  return {
    durationMs: options.durationMs ?? 3000,
    id: nextToastId++,
    message: options.message,
    silent: options.silent ?? false,
    type: options.type ?? 'info',
  };
}

function triggerToastSuccessHaptic(type: ToastType, silent: boolean) {
  if (type !== 'success' || silent) {
    return;
  }

  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
    () => undefined,
  );
}

export const Toast = {
  show(options: ToastShowOptions) {
    toastHostController?.enqueue(options);
  },
};

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [activeToast, setActiveToast] = useState<ToastItem | null>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(28);

  useEffect(() => {
    const enqueue = (options: ToastShowOptions) => {
      setQueue((currentQueue) => [...currentQueue, normalizeToast(options)]);
    };

    toastHostController = { enqueue };

    return () => {
      if (toastHostController?.enqueue === enqueue) {
        toastHostController = null;
      }
    };
  }, []);

  useEffect(() => {
    if (activeToast || queue.length === 0) {
      return;
    }

    const [nextToast, ...rest] = queue;
    setActiveToast(nextToast);
    setQueue(rest);
  }, [activeToast, queue]);

  useEffect(() => {
    if (!activeToast) {
      return;
    }
    triggerToastSuccessHaptic(activeToast.type, activeToast.silent);

    opacity.value = 0;
    translateY.value = 28;
    opacity.value = withTiming(1, { duration: motion.duration.base });
    translateY.value = withSpring(0, motion.spring.soft);

    const hideTimer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: motion.duration.base });
      translateY.value = withTiming(
        28,
        { duration: motion.duration.base },
        (finished) => {
          if (finished) {
            runOnJS(setActiveToast)(null);
          }
        },
      );
    }, activeToast.durationMs);

    return () => {
      clearTimeout(hideTimer);
    };
  }, [activeToast, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!activeToast) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.container,
          animatedStyle,
          {
            bottom: insets.bottom + spacing.lg,
            backgroundColor: toastTone[activeToast.type].backgroundColor,
          },
        ]}
      >
        <Text style={[styles.message, { color: toastTone[activeToast.type].color }]}>
          {activeToast.message}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    borderRadius: radii.pill,
    maxWidth: '90%',
    minWidth: 160,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    position: 'absolute',
    ...shadow.pop,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
  },
});
