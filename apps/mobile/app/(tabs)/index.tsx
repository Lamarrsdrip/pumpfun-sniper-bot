import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppHeader, AssetIcon, IconButton, ModePill, SectionHeader, StatusPill, TransactionRow } from '@/components';
import { demoNotifications, demoRecipients, demoTokens, demoTransactions } from '@/demo';
import { useSession } from '@/store';
import { dark, depth } from '@/theme';

export default function HomeScreen() {
  const { balancesVisible, setBalancesVisible } = useSession();
  return <ScrollView style={{ flex: 1, backgroundColor: dark.background }} contentContainerStyle={{ padding: 16, gap: 15, paddingBottom: 54 }} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
    <AppHeader greeting="Good morning, Ada" title="Your money is ready" unread={demoNotifications.filter((item) => item.unread).length} onNotifications={() => router.push('/notifications')} onProfile={() => router.push('/profile')} />
    <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}><ModePill compact /><StatusPill label="Tier 2 · verified" tone="success" icon="shield-checkmark" /></View>
    <LinearGradient colors={['#15583D', '#0B3526', '#101E18']} style={{ padding: 19, borderRadius: 18, gap: 8, boxShadow: depth.raised }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: '#B9D8C9', fontSize: 12, fontWeight: '700' }}>Available balance</Text><Pressable accessibilityLabel={balancesVisible ? 'Hide balance' : 'Show balance'} onPress={() => setBalancesVisible(!balancesVisible)}><Ionicons name={balancesVisible ? 'eye-outline' : 'eye-off-outline'} size={20} color="#CDE5D9" /></Pressable></View>
      <Text selectable style={{ color: dark.white, fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{balancesVisible ? '₦500,000.00' : '₦••••••••'}</Text>
      <Text style={{ color: dark.greenBright, fontWeight: '900' }}>{balancesVisible ? '+₦8,420 today · +1.71%' : 'Daily change hidden'}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 }}>
        <IconButton icon="add" label="Deposit" onPress={() => router.push('/deposit')} />
        <IconButton icon="arrow-up" label="Withdraw" onPress={() => router.push('/withdraw')} color={dark.cyan} />
        <IconButton icon="swap-horizontal" label="Swap" onPress={() => router.push('/swap')} color={dark.purple} />
        <IconButton icon="send" label="Send" onPress={() => router.push('/memezo-transfer')} color={dark.yellow} />
      </View>
    </LinearGradient>
    <View style={{ flexDirection: 'row', gap: 9 }}>
      <Insight icon="wallet-outline" label="Spent today" value="₦52,150" color={dark.cyan} />
      <Insight icon="time-outline" label="Pending" value="1 action" color={dark.yellow} />
      <Insight icon="gift-outline" label="Rewards" value="₦1,240" color={dark.green} />
    </View>
    <SectionHeader title="Recent activity" action="See all" onPress={() => router.push('/transactions')} />
    <View style={{ backgroundColor: dark.surface, borderRadius: 14, paddingHorizontal: 13 }}>{demoTransactions.slice(0, 3).map((item) => <TransactionRow key={item.id} item={item} onPress={() => router.push('/transactions')} />)}</View>
    <SectionHeader title="Send again" action="AI Pay" onPress={() => router.push('/ai-pay')} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 13 }}>
      {demoRecipients.map((recipient) => <Pressable key={recipient.name} onPress={() => router.push({ pathname: '/memezo-transfer', params: { q: recipient.name } })} style={{ alignItems: 'center', width: 61, gap: 6 }}><View style={{ width: 49, height: 49, borderRadius: 18, backgroundColor: `${recipient.color}18`, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: recipient.color, fontWeight: '900' }}>{recipient.initials}</Text></View><Text numberOfLines={1} style={{ color: dark.textSoft, fontSize: 10, fontWeight: '800' }}>{recipient.name}</Text></Pressable>)}
      <Pressable onPress={() => router.push('/memezo-transfer')} style={{ alignItems: 'center', width: 61, gap: 6 }}><View style={{ width: 49, height: 49, borderRadius: 18, backgroundColor: dark.surface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="add" color={dark.green} size={20} /></View><Text style={{ color: dark.muted, fontSize: 10, fontWeight: '800' }}>New</Text></Pressable>
    </ScrollView>
    <Pressable onPress={() => router.push('/whatsapp')}>
      <LinearGradient colors={['#123C2C', '#101E18']} style={{ padding: 13, borderRadius: 14, flexDirection: 'row', gap: 11, alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: '#25D36622', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="logo-whatsapp" color="#25D366" size={22} /></View>
        <View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>Control MemeZo from WhatsApp</Text><Text style={{ color: dark.muted, fontSize: 11, lineHeight: 17, paddingTop: 3 }}>Get alerts and prepare payments. Secure approval stays in MemeZo.</Text></View>
        <Ionicons name="chevron-forward" color={dark.muted} size={18} />
      </LinearGradient>
    </Pressable>
    <SectionHeader title="Needs your attention" />
    <Pressable onPress={() => router.push('/security')} style={{ flexDirection: 'row', gap: 11, padding: 14, borderRadius: 14, backgroundColor: '#1C180D', borderWidth: 1, borderColor: '#4D3E1D', alignItems: 'center' }}><Ionicons name="shield-checkmark-outline" color={dark.yellow} size={23} /><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>Add a backup sign-in method</Text><Text style={{ color: dark.muted, fontSize: 11, paddingTop: 3 }}>Protect withdrawals if Face ID is unavailable.</Text></View><Ionicons name="chevron-forward" color={dark.muted} /></Pressable>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <FeatureTile icon="gift-outline" title="Rewards" body="Cashback and referrals" color={dark.green} onPress={() => router.push('/rewards')} />
      <FeatureTile icon="lock-closed-outline" title="Savings" body="Build goals safely" color={dark.cyan} onPress={() => router.push('/savings')} />
    </View>
    <SectionHeader title="Market watch" action="Discover" onPress={() => router.push('/(tabs)/discover')} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {demoTokens.slice(0, 3).map((token) => <Pressable key={token.mint} onPress={() => router.push(`/token/${token.mint}`)} style={{ width: 174, padding: 14, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 8 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><AssetIcon symbol={token.symbol} color={token.color} size={38} /><StatusPill label={token.chain} tone="info" /></View><Text numberOfLines={1} style={{ color: dark.text, fontWeight: '900' }}>{token.name}</Text><Text style={{ color: dark.green, fontSize: 17, fontWeight: '900' }}>+{token.change}%</Text><Text numberOfLines={1} style={{ color: dark.muted, fontSize: 10 }}>{token.source} · Score {token.score}</Text></Pressable>)}
    </ScrollView>
  </ScrollView>;
}

function Insight({ icon, label, value, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string }) {
  return <View style={{ flex: 1, minWidth: 0, padding: 11, borderRadius: 12, backgroundColor: dark.surface }}><Ionicons name={icon} color={color} size={17} /><Text numberOfLines={1} style={{ color: dark.muted, fontSize: 9, paddingTop: 7 }}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={{ color: dark.text, fontWeight: '900', paddingTop: 3 }}>{value}</Text></View>;
}

function FeatureTile({ icon, title, body, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string; color: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={{ flex: 1, minHeight: 112, padding: 14, borderRadius: 14, backgroundColor: dark.surface }}><Ionicons name={icon} color={color} size={23} /><Text style={{ color: dark.text, fontWeight: '900', paddingTop: 14 }}>{title}</Text><Text style={{ color: dark.muted, fontSize: 10, paddingTop: 4 }}>{body}</Text></Pressable>;
}
