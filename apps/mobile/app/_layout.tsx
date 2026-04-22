import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ToastHost } from '../src/components';
import { EntitlementProvider } from '../src/session/entitlement-context';
import { SessionProvider } from '../src/session/session-context';

const ONBOARDING_STORAGE_KEY = 'kyoiru.onboardingCompleted';

export default function RootLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const redirectIssuedRef = useRef(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void AsyncStorage.getItem(ONBOARDING_STORAGE_KEY).then((value) => {
      if (cancelled) {
        return;
      }

      setOnboardingCompleted(value === '1');
      setOnboardingChecked(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!onboardingChecked || onboardingCompleted || pathname === '/onboarding') {
      if (pathname === '/onboarding') {
        redirectIssuedRef.current = false;
      }
      return;
    }

    if (redirectIssuedRef.current) {
      return;
    }

    redirectIssuedRef.current = true;
    router.replace('/onboarding' as never);
  }, [onboardingChecked, onboardingCompleted, pathname, router]);

  if (!onboardingChecked) {
    return null;
  }

  if (!onboardingCompleted && pathname !== '/onboarding') {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <EntitlementProvider>
          <Stack screenOptions={{ headerShadowVisible: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="initial-profile"
              options={{ title: '初期プロフィール設定' }}
            />
            <Stack.Screen
              name="friend-invites/[token]"
              options={{ title: '友達追加' }}
            />
            <Stack.Screen
              name="group-invites/[token]"
              options={{ title: 'グループ招待' }}
            />
            <Stack.Screen name="help" options={{ headerShown: false }} />
            <Stack.Screen
              name="subscription-info"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="location-permission"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="account-delete" options={{ headerShown: false }} />
          </Stack>
          <ToastHost />
        </EntitlementProvider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
}
