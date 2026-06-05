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
        <Stack.Screen name="auth" options={{ title: 'Welcome to NairaMeme' }} />
        <Stack.Screen name="kyc" options={{ title: 'Secure your account' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="deposit" options={{ title: 'Deposit Naira', presentation: 'modal' }} />
        <Stack.Screen name="withdraw" options={{ title: 'Withdraw Naira', presentation: 'modal' }} />
        <Stack.Screen name="token/[mint]" options={{ title: 'Token intelligence' }} />
        <Stack.Screen name="trade/[mint]" options={{ title: 'Review trade', presentation: 'modal' }} />
      </Stack>
    </>
  );
}
