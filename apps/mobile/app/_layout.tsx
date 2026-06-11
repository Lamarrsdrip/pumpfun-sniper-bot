import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { dark } from '@/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: dark.background }, headerTintColor: dark.text, contentStyle: { backgroundColor: dark.background } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ title: 'Welcome to MemeZo' }} />
        <Stack.Screen name="kyc" options={{ title: 'Secure your account' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="deposit" options={{ title: 'Deposit Naira', presentation: 'modal' }} />
        <Stack.Screen name="withdraw" options={{ title: 'Withdraw Naira', presentation: 'modal' }} />
        <Stack.Screen name="crypto-deposit" options={{ title: 'Deposit crypto' }} />
        <Stack.Screen name="crypto-withdraw" options={{ title: 'Withdraw crypto' }} />
        <Stack.Screen name="swap" options={{ title: 'Swap' }} />
        <Stack.Screen name="memezo-transfer" options={{ title: 'Send to MemeZo', presentation: 'modal' }} />
        <Stack.Screen name="ai-pay" options={{ title: 'AI Pay' }} />
        <Stack.Screen name="p2p" options={{ title: 'P2P Manager' }} />
        <Stack.Screen name="bills" options={{ title: 'Bills' }} />
        <Stack.Screen name="cards" options={{ title: 'Cards' }} />
        <Stack.Screen name="business" options={{ title: 'Business account' }} />
        <Stack.Screen name="security" options={{ title: 'Security' }} />
        <Stack.Screen name="transactions" options={{ title: 'Transactions' }} />
        <Stack.Screen name="support" options={{ title: 'Help & support' }} />
        <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
        <Stack.Screen name="manage-assets" options={{ title: 'Manage assets' }} />
        <Stack.Screen name="rewards" options={{ title: 'Rewards' }} />
        <Stack.Screen name="savings" options={{ title: 'Savings' }} />
        <Stack.Screen name="whatsapp" options={{ title: 'WhatsApp Assistant' }} />
        <Stack.Screen name="network" options={{ title: 'Meme Network' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile & settings' }} />
        <Stack.Screen name="token/[mint]" options={{ title: 'Token intelligence' }} />
        <Stack.Screen name="trade/[mint]" options={{ title: 'Review trade', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
