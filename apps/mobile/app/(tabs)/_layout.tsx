import { Tabs } from 'expo-router';
import { colors } from '../../src/ui/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: '#7d817b',
        tabBarStyle: {
          backgroundColor: '#fffdf8',
          borderTopColor: '#d9d2c3',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'ホーム', tabBarLabel: 'ホーム' }}
      />
      <Tabs.Screen
        name="friends"
        options={{ title: '友達', tabBarLabel: '友達' }}
      />
      <Tabs.Screen
        name="monitoring"
        options={{ title: '見守り', tabBarLabel: '見守り' }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: '設定', tabBarLabel: '設定' }}
      />
    </Tabs>
  );
}
