import type { ViewProps, ViewStyle } from 'react-native';
import { View } from 'react-native';
import { colors, radii, shadow } from '../ui/theme';

type CardTone = 'default' | 'hero' | 'premium';

export type CardProps = ViewProps & {
  tone?: CardTone;
};

const toneStyles: Record<CardTone, ViewStyle> = {
  default: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    ...shadow.card,
  },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    ...shadow.pop,
  },
  premium: {
    backgroundColor: colors.nestedSurface,
    borderColor: colors.nestedBorder,
    borderRadius: radii.lg,
    borderWidth: 1,
    ...shadow.soft,
  },
};

export function Card({ tone = 'default', style, children, ...props }: CardProps) {
  return (
    <View {...props} style={[toneStyles[tone], style]}>
      {children}
    </View>
  );
}
