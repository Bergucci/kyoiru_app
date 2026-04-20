import { Stack } from 'expo-router';

export default function HomeStackLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'ホーム' }} />
      <Stack.Screen name="create-group" options={{ title: '友達を選択' }} />
      <Stack.Screen
        name="groups/[groupId]"
        options={{ title: 'グループ詳細' }}
      />
    </Stack>
  );
}
