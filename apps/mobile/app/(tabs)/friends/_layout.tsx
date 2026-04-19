import { Stack } from 'expo-router';

export default function FriendsStackLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: '友達' }} />
    </Stack>
  );
}
