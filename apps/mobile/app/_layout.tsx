import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { ToastHost } from '../src/components';
import { EntitlementProvider } from '../src/session/entitlement-context';
import { SessionProvider } from '../src/session/session-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <EntitlementProvider>
          <Stack screenOptions={{ headerShadowVisible: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
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
