import type { TextStyle, ViewStyle } from 'react-native';

export const colors = {
  pageBg: '#f6f1e7',
  authBg: '#efe7d7',
  ink: '#1f2c2b',
  muted: '#5c6a67',
  hint: '#97a19e',
  border: '#d6d0c2',
  divider: '#ddd4c5',
  nestedBorder: '#e2dccf',
  surface: '#fffdf8',
  surfaceAlt: '#f5f0e6',
  nestedSurface: '#fcfaf4',
  secondarySurface: '#ebe3d6',
  inputBorder: '#d7cfbf',
  white: '#ffffff',
  onDark: '#fffdf8',
  onAccentMuted: '#d6e6dd',
  onSkyMuted: '#d5e6ee',
  onSettingsMuted: '#e3e3ef',
  accent: '#1f5a4a',
  accentStrong: '#173d35',
  accentSoft: '#dce8df',
  accentTint: '#eef5f1',
  liveGreen: '#34c759',
  liveGreenTint: '#e6f7eb',
  warning: '#8f4c1f',
  danger: '#8a3028',
  sky: '#244f63',
  settingsInk: '#4a4a5a',
  lineBrand: '#06c755',
  googleBorder: '#d8d2c6',
  tabInactive: '#7d817b',
} as const;

type TypographyToken = Pick<
  TextStyle,
  'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing'
>;

type ShadowToken = Pick<
  ViewStyle,
  'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'
>;

export type WatchOverPlan = 'free' | 'premium';

export const typography = {
  display: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  body: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 21,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  kyoiruMark: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.5,
  },
} as const satisfies Record<string, TypographyToken>;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

const createShadow = (
  shadowOffset: NonNullable<ShadowToken['shadowOffset']>,
  shadowOpacity: number,
  shadowRadius: number,
  elevation: number,
): ShadowToken => ({
  shadowColor: colors.ink,
  shadowOffset,
  shadowOpacity,
  shadowRadius,
  elevation,
});

export const shadow = {
  soft: createShadow({ width: 0, height: 2 }, 0.08, 8, 2),
  card: createShadow({ width: 0, height: 6 }, 0.12, 16, 6),
  pop: createShadow({ width: 0, height: 12 }, 0.18, 24, 12),
} as const satisfies Record<string, ShadowToken>;

export const motion = {
  duration: {
    fast: 120,
    base: 220,
    slow: 400,
  },
  spring: {
    soft: {
      damping: 14,
      stiffness: 180,
    },
    pop: {
      damping: 10,
      stiffness: 240,
    },
  },
} as const;

export const gradients = {
  heroFree: ['#ffe6c9', '#ffcb94'],
  heroPremium: ['#1f5a4a', '#173d35'],
} as const;

export type Palette = {
  hero: readonly [string, string];
  ctaBg: string;
  ctaText: string;
  badgeBg: string;
  cardTint: string;
  tabTint: string;
  cardShadow: ShadowToken;
};

export const createPalette = (plan: WatchOverPlan): Palette => {
  if (plan === 'premium') {
    return {
      hero: gradients.heroPremium,
      ctaBg: colors.accent,
      ctaText: colors.onDark,
      badgeBg: colors.accentSoft,
      cardTint: colors.accentTint,
      tabTint: colors.accent,
      cardShadow: shadow.soft,
    };
  }

  return {
    hero: gradients.heroFree,
    ctaBg: '#EE8A57',
    ctaText: colors.ink,
    badgeBg: '#ffd8b5',
    cardTint: '#fff3e4',
    tabTint: '#EE8A57',
    cardShadow: shadow.pop,
  };
};
