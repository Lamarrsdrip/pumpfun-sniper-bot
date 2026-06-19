import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { dark } from '@/theme';

const icon = (active: string, inactive: string) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <Ionicons name={(color === dark.green ? active : inactive) as keyof typeof Ionicons.glyphMap} color={color} size={size} />
  );

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: dark.surface,
          borderTopColor: dark.border,
          borderTopWidth: 1,
          height: 72,
          paddingTop: 8,
          paddingBottom: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarActiveTintColor: dark.green,
        tabBarInactiveTintColor: dark.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="pay" options={{ title: 'Pay', tabBarIcon: icon('swap-horizontal', 'swap-horizontal-outline') }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: icon('compass', 'compass-outline') }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Wallet', tabBarIcon: icon('wallet', 'wallet-outline') }} />

      {/* hidden screens — still accessible via router.push */}
      <Tabs.Screen name="bot" options={{ href: null }} />
      <Tabs.Screen name="social" options={{ href: null }} />
    </Tabs>
  );
}
