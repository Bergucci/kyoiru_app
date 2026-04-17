import { Stack } from 'expo-router';
import { SessionProvider } from '../src/session/session-context';

export default function RootLayout() {
  return (
    <SessionProvider>
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
    </SessionProvider>
  );
}
