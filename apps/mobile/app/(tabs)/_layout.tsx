import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { dark } from '@/theme';

const icon = (name: keyof typeof Ionicons.glyphMap) => ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} color={color} size={size} />;

export default function TabsLayout() {
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarStyle: { backgroundColor: '#0B1410', borderTopColor: '#17271F', height: 76, paddingTop: 7, paddingBottom: 9, position: 'absolute' },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
    tabBarActiveTintColor: dark.green,
    tabBarInactiveTintColor: dark.muted
  }}>
    <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home') }} />
    <Tabs.Screen name="discover" options={{ title: 'Discover', tabBarIcon: icon('compass') }} />
    <Tabs.Screen name="portfolio" options={{ title: 'Wallet', tabBarIcon: icon('wallet') }} />
    <Tabs.Screen name="pay" options={{ title: 'Pay', tabBarIcon: icon('sparkles') }} />
    <Tabs.Screen name="bot" options={{ title: 'Sniper', tabBarIcon: icon('flash') }} />
    <Tabs.Screen name="social" options={{ href: null }} />
  </Tabs>;
}
