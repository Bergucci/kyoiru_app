import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mascot, PressableScale } from '../src/components';
import { colors, radii, shadow, spacing, typography } from '../src/ui/theme';

const ONBOARDING_STORAGE_KEY = 'kyoiru.onboardingCompleted';

const slides = [
  {
    variant: 'wave' as const,
    title: '「今日いる」へようこそ',
    description: '連絡しなくても、今日いることだけ分かる',
  },
  {
    variant: 'cheer' as const,
    title: 'チェックインは一瞬',
    description: 'ワンタップで「今日いる」を届けられます',
  },
  {
    variant: 'happy' as const,
    title: 'みんなでゆるく反応',
    description: '家族や友だちの「元気」に小さくリアクション',
  },
  {
    variant: 'sleepy' as const,
    title: '見守りは、そっと',
    description: '反応がない時だけ、やさしく気づかせてくれます',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    router.replace('/(auth)/login' as never);
  };

  const handleNext = () => {
    if (currentIndex === slides.length - 1) {
      void completeOnboarding();
      return;
    }

    const nextIndex = currentIndex + 1;
    setCurrentIndex(nextIndex);
    scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
  };

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(nextIndex);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.topRow}>
        <PressableScale
          accessibilityRole="button"
          hapticStyle="light"
          onPress={() => {
            void completeOnboarding();
          }}
          style={styles.skipButton}
        >
          <Text style={styles.skipLabel}>スキップ</Text>
        </PressableScale>
      </View>

      <ScrollView
        horizontal
        onMomentumScrollEnd={handleMomentumEnd}
        pagingEnabled
        ref={scrollRef}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
      >
        {slides.map((slide) => (
          <View key={slide.title} style={[styles.slide, { width }]}>
            <Mascot animated size={180} variant={slide.variant} />
            <View style={styles.slideCopy}>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.description}>{slide.description}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottomArea}>
        <View style={styles.dotsRow}>
          {slides.map((slide, index) => (
            <View
              key={slide.title}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <PressableScale
          accessibilityRole="button"
          hapticStyle="medium"
          onPress={handleNext}
          style={styles.ctaButton}
        >
          <Text style={styles.ctaLabel}>
            {currentIndex === slides.length - 1 ? 'はじめる' : '次へ'}
          </Text>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.pageBg,
  },
  topRow: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  skipButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  skipLabel: {
    ...typography.body,
    color: colors.muted,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing['2xl'],
  },
  slideCopy: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    ...typography.display,
    color: colors.ink,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.muted,
    textAlign: 'center',
  },
  bottomArea: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
    gap: spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.accent,
  },
  ctaButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent,
    ...shadow.card,
  },
  ctaLabel: {
    ...typography.subtitle,
    color: colors.onDark,
  },
});
