import { Stack } from 'expo-router';

export default function SettingsStackLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: '設定' }} />
      <Stack.Screen name="profile" options={{ title: 'プロフィール' }} />
      <Stack.Screen name="account" options={{ title: 'アカウント' }} />
      <Stack.Screen name="user-id" options={{ title: 'ID変更' }} />
      <Stack.Screen name="notifications" options={{ title: '通知設定' }} />
      <Stack.Screen
        name="subscription-management"
        options={{ title: 'サブスク管理' }}
      />
      <Stack.Screen name="help" options={{ title: 'ヘルプ' }} />
      <Stack.Screen name="legal" options={{ title: '利用規約・プライバシー' }} />
      <Stack.Screen name="privacy-policy" options={{ title: 'プライバシーポリシー' }} />
      <Stack.Screen name="terms" options={{ title: '利用規約' }} />
      <Stack.Screen name="commerce-disclosure" options={{ title: '特定商取引法に基づく表記' }} />
      <Stack.Screen
        name="subscription-info"
        options={{ title: '見守りプランについて' }}
      />
      <Stack.Screen
        name="location-permission"
        options={{ title: '位置情報の説明' }}
      />
      <Stack.Screen
        name="account-delete"
        options={{ title: 'アカウント削除' }}
      />
      <Stack.Screen name="blocks" options={{ title: 'block 一覧' }} />
    </Stack>
  );
}
