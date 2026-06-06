import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { dark } from '@/theme';

const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color} size={size} />;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: dark.background },
      headerTintColor: dark.text,
      tabBarStyle: { backgroundColor: dark.surface, borderTopColor: dark.border, height: 66 },
      tabBarActiveTintColor: dark.green,
      tabBarInactiveTintColor: dark.muted
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: icon('pulse') }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Portfolio', tabBarIcon: icon('wallet') }} />
      <Tabs.Screen name="earn" options={{ title: 'Earn', tabBarIcon: icon('trophy') }} />
      <Tabs.Screen name="social" options={{ title: 'Network', tabBarIcon: icon('people') }} />
      <Tabs.Screen name="bot" options={{ title: 'Auto Sniper', tabBarIcon: icon('flash') }} />
    </Tabs>
  );
}
