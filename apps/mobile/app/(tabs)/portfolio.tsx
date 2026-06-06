import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AssetIcon, IconButton, ModePill, Page, SectionHeader } from '@/components';
import { demoAssets, demoTransactions } from '@/demo';
import { dark } from '@/theme';

export default function WalletScreen() {
  return <Page>
    <View><Text style={{ color: dark.muted }}>NairaMeme Wallet</Text><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>Your money, one place</Text></View>
    <ModePill />
    <LinearGradient colors={['#121F1A', '#0E1512']} style={{ padding: 20, borderRadius: 18, borderWidth: 1, borderColor: dark.border, gap: 5 }}>
      <Text style={{ color: dark.muted }}>Portfolio value</Text><Text style={{ color: dark.text, fontSize: 34, fontWeight: '900' }}>₦500,000.00</Text>
      <Text style={{ color: dark.green, fontWeight: '800' }}>+₦21,640 all time · +4.52%</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16 }}><IconButton icon="add" label="Deposit" onPress={() => router.push('/deposit')} /><IconButton icon="arrow-up" label="Withdraw" onPress={() => router.push('/withdraw')} color={dark.cyan} /><IconButton icon="swap-horizontal" label="Swap" onPress={() => router.push('/swap')} color={dark.purple} /><IconButton icon="analytics" label="Portfolio" onPress={() => router.push('/(tabs)/portfolio')} color={dark.yellow} /></View>
    </LinearGradient>
    <View style={{ flexDirection: 'row', gap: 10 }}><Mini title="Realized PnL" value="+₦16,284" color={dark.green} /><Mini title="Unrealized" value="+₦5,356" color={dark.cyan} /><Mini title="Fees paid" value="₦1,284" color={dark.yellow} /></View>
    <SectionHeader title="Your assets" action="Manage" onPress={() => router.push('/profile')} />
    {demoAssets.map((asset) => <Pressable key={asset.symbol} onPress={() => asset.symbol === 'NGN' ? router.push('/deposit') : router.push('/swap')} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 }}><AssetIcon symbol={asset.symbol} color={asset.color} /><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>{asset.name}</Text><Text style={{ color: dark.muted, fontSize: 11, marginTop: 3 }}>{asset.balance.toLocaleString()} {asset.symbol}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={{ color: dark.text, fontWeight: '800' }}>₦{asset.value.toLocaleString()}</Text><Text style={{ color: asset.change >= 0 ? dark.green : dark.red, fontSize: 11 }}>{asset.change ? `+${asset.change}%` : 'Naira balance'}</Text></View></Pressable>)}
    <SectionHeader title="Recent activity" action="See all" />
    {demoTransactions.map((item) => <View key={item.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark.border }}><View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: item.tone === 'sell' ? '#15382B' : '#302819', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: item.tone === 'sell' ? dark.green : dark.yellow, fontWeight: '900' }}>{item.tone === 'sell' ? '↓' : '↑'}</Text></View><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '800' }}>{item.title}</Text><Text style={{ color: dark.muted, fontSize: 11 }}>{item.detail} · {item.time}</Text></View><Text style={{ color: item.amount.startsWith('+') ? dark.green : dark.text, fontWeight: '900' }}>{item.amount}</Text></View>)}
  </Page>;
}
function Mini({ title, value, color }: { title: string; value: string; color: string }) { return <View style={{ flex: 1, backgroundColor: dark.surface, borderRadius: 10, padding: 11, borderWidth: 1, borderColor: dark.border }}><Text style={{ color: dark.muted, fontSize: 9 }}>{title}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={{ color, fontSize: 14, fontWeight: '900', marginTop: 5 }}>{value}</Text></View>; }
