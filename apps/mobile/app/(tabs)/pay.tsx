import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppHeader, ModePill, ProviderNotice, SectionHeader, StatusPill } from '@/components';
import { dark, depth } from '@/theme';

const actions = [
  { title: 'Send to MemeZo', body: 'Instant transfer by tag or phone', icon: 'send' as const, route: '/memezo-transfer', color: dark.cyan },
  { title: 'AI Pay', body: 'Type or scan payment details', icon: 'sparkles' as const, route: '/ai-pay', color: dark.green },
  { title: 'WhatsApp', body: 'Prepare payments from chat', icon: 'logo-whatsapp' as const, route: '/whatsapp', color: '#25D366' },
  { title: 'Bills', body: 'Airtime, data and utilities', icon: 'receipt' as const, route: '/bills', color: dark.yellow },
  { title: 'Cards', body: 'Virtual card controls', icon: 'card' as const, route: '/cards', color: dark.purple },
  { title: 'P2P Manager', body: 'Merchant payout automation', icon: 'people' as const, route: '/p2p', color: dark.cyan },
  { title: 'Transactions', body: 'Receipts and payment status', icon: 'time' as const, route: '/transactions', color: dark.blue }
];

export default function PayScreen() {
  return <ScrollView style={{ flex: 1, backgroundColor: dark.background }} contentContainerStyle={{ padding: 16, gap: 15, paddingBottom: 54 }} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
    <AppHeader greeting="Payments" title="What would you like to do?" onNotifications={() => router.push('/notifications')} onProfile={() => router.push('/profile')} unread={2} />
    <ModePill compact />
    <LinearGradient colors={['#15513A', '#0D2E22', '#101C17']} style={{ padding: 18, borderRadius: 18, borderWidth: 1, borderColor: '#2F7054', gap: 8, boxShadow: depth.raised }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#B7D8C8', fontSize: 11, fontWeight: '900' }}>AVAILABLE BALANCE</Text><StatusPill label="SECURED" tone="success" icon="lock-closed" /></View>
      <Text selectable style={{ color: dark.white, fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'] }}>₦318,450.00</Text>
      <Pressable onPress={() => router.push('/ai-pay')} style={{ minHeight: 50, marginTop: 8, borderRadius: 12, backgroundColor: dark.green, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}><Ionicons name="sparkles" color={dark.black} size={18} /><Text style={{ color: dark.black, fontWeight: '900' }}>Start a smart payment</Text></Pressable>
    </LinearGradient>
    <SectionHeader title="Pay and manage" />
    <View style={{ backgroundColor: dark.surface, borderRadius: 14, paddingHorizontal: 14 }}>
      {actions.map((action) => <Pressable key={action.title} onPress={() => router.push(action.route as never)} style={({ pressed }) => ({ minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: dark.border, opacity: pressed ? 0.7 : 1 })}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: `${action.color}18`, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={action.icon} color={action.color} size={21} /></View>
        <View style={{ flex: 1 }}><Text style={{ color: dark.text, fontSize: 14, fontWeight: '900' }}>{action.title}</Text><Text numberOfLines={1} style={{ color: dark.muted, fontSize: 10, paddingTop: 3 }}>{action.body}</Text></View>
        <Ionicons name="chevron-forward" color={dark.muted} size={18} />
      </Pressable>)}
    </View>
    <ProviderNotice title="Approval stays with you" body="MemeZo can prepare and risk-check payments. Money moves only after PIN, biometric approval, or a bounded trusted rule." />
  </ScrollView>;
}
