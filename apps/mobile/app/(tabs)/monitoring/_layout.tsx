import { Stack } from 'expo-router';

export default function MonitoringStackLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: '見守り' }} />
      <Stack.Screen
        name="[relationshipId]"
        options={{ title: '見守り詳細' }}
      />
    </Stack>
  );
}
