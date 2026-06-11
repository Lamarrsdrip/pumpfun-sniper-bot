import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ModePill, Page, SectionHeader } from '@/components';
import { dark } from '@/theme';

const actions = [
  { title: 'AI Pay', body: 'Paste a payment instruction or review details from an image.', icon: 'sparkles' as const, route: '/ai-pay', color: dark.green },
  { title: 'P2P Manager', body: 'Review merchant orders, rules, payouts and reconciliation.', icon: 'people' as const, route: '/p2p', color: dark.cyan },
  { title: 'Bills', body: 'Airtime, data, electricity, TV and other supported services.', icon: 'receipt' as const, route: '/bills', color: dark.yellow },
  { title: 'Cards', body: 'Create and control virtual cards when a card provider is connected.', icon: 'card' as const, route: '/cards', color: dark.purple }
];

export default function PayScreen() {
  return <Page>
    <View><Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>Pay without the paperwork</Text><Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 5 }}>One balance for transfers, merchant payouts, bills and cards.</Text></View>
    <ModePill />
    <LinearGradient colors={['#103D2D', '#101B17']} style={{ padding: 18, borderRadius: 18, borderWidth: 1, borderColor: '#246649', gap: 10 }}>
      <Text style={{ color: '#A9D8C2', fontSize: 11, fontWeight: '800' }}>AVAILABLE MEMEZO BALANCE</Text>
      <Text selectable style={{ color: dark.white, fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'] }}>₦318,450.00</Text>
      <Pressable onPress={() => router.push('/ai-pay')} style={{ minHeight: 48, borderRadius: 12, backgroundColor: dark.green, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#04110B', fontWeight: '900' }}>Start a smart payment</Text></Pressable>
    </LinearGradient>
    <SectionHeader title="Choose what to do" />
    {actions.map((action) => <Pressable key={action.title} onPress={() => router.push(action.route as never)} style={({ pressed }) => ({ flexDirection: 'row', gap: 13, alignItems: 'center', padding: 15, borderRadius: 14, borderWidth: 1, borderColor: dark.border, backgroundColor: pressed ? dark.surfaceRaised : dark.surface })}>
      <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: `${action.color}18`, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={action.icon} color={action.color} size={23} /></View>
      <View style={{ flex: 1 }}><Text style={{ color: dark.text, fontSize: 16, fontWeight: '900' }}>{action.title}</Text><Text style={{ color: dark.muted, fontSize: 12, lineHeight: 18, paddingTop: 3 }}>{action.body}</Text></View>
      <Ionicons name="chevron-forward" color={dark.muted} size={18} />
    </Pressable>)}
    <View style={{ padding: 14, borderRadius: 14, backgroundColor: '#17140D', borderWidth: 1, borderColor: '#42371D' }}><Text style={{ color: dark.yellow, fontWeight: '900' }}>Approval stays with you</Text><Text style={{ color: dark.muted, lineHeight: 19, paddingTop: 5 }}>MemeZo prepares and checks payments. PIN, biometric approval, or an explicit trusted rule is required before money moves.</Text></View>
  </Page>;
}
