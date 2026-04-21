import { useMemo } from 'react';
import { useEntitlement } from '../session/entitlement-context';
import { createPalette, type Palette, type WatchOverPlan } from './theme';

export function useWatchOverPlan(): WatchOverPlan {
  const { entitlement } = useEntitlement();

  return entitlement?.isActiveForFeatures ? 'premium' : 'free';
}

export function usePalette(): Palette {
  const plan = useWatchOverPlan();

  return useMemo(() => createPalette(plan), [plan]);
}
