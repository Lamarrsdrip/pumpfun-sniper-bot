import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AssetIcon, IconButton, ModePill, Page, SectionHeader } from '@/components';
import { demoPosts, demoTokens } from '@/demo';
import { dark } from '@/theme';

export default function HomeScreen() {
  return <Page>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <View><Text style={{ color: dark.muted, fontSize: 13 }}>Good morning, Ada</Text><Text style={{ color: dark.text, fontSize: 26, fontWeight: '900' }}>Make your next move</Text></View>
      <Pressable onPress={() => router.push('/profile')} style={{ width: 44, height: 44, borderRadius: 16, backgroundColor: dark.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: dark.green, fontWeight: '900' }}>AN</Text></Pressable>
    </View>
    <ModePill />
    <LinearGradient colors={['#164D38', '#0D2D23', '#111B17']} style={{ padding: 20, borderRadius: 18, borderWidth: 1, borderColor: '#2F7358', gap: 8 }}>
      <Text style={{ color: '#B6D4C5', fontSize: 12 }}>Total balance</Text>
      <Text selectable style={{ color: dark.white, fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'] }}>₦500,000.00</Text>
      <Text style={{ color: dark.green, fontWeight: '800' }}>+₦8,420 today · +1.71%</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14 }}>
        <IconButton icon="add" label="Deposit" onPress={() => router.push('/deposit')} />
        <IconButton icon="arrow-up" label="Withdraw" onPress={() => router.push('/withdraw')} color={dark.cyan} />
        <IconButton icon="swap-horizontal" label="Swap" onPress={() => router.push('/swap')} color={dark.purple} />
        <IconButton icon="rocket" label="Buy meme" onPress={() => router.push('/(tabs)/discover')} color={dark.yellow} />
      </View>
    </LinearGradient>
    <SectionHeader title="Runner AI radar" action="See all" onPress={() => router.push('/(tabs)/discover')} />
    <Pressable onPress={() => router.push(`/token/${demoTokens[0].mint}`)}>
      <LinearGradient colors={['#17251F', '#101513']} style={{ borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#335444', gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View style={{ flexDirection: 'row', gap: 11, alignItems: 'center' }}><AssetIcon symbol="NF" /><View><Text style={{ color: dark.text, fontSize: 17, fontWeight: '900' }}>Naija Frog</Text><Text style={{ color: dark.muted, fontSize: 11 }}>NFROG · 1,842 holders</Text></View></View><View><Text style={{ color: dark.green, fontSize: 28, fontWeight: '900' }}>91</Text><Text style={{ color: dark.muted, fontSize: 9 }}>RUNNER</Text></View></View>
        <View style={{ height: 54, flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>{[18, 24, 20, 30, 27, 39, 36, 48, 43, 54, 49, 63, 70, 66, 82, 76, 92].map((h, i) => <View key={i} style={{ flex: 1, height: h / 2, backgroundColor: i > 11 ? dark.green : '#315346', borderRadius: 2 }} />)}</View>
        <Text style={{ color: dark.text, lineHeight: 20 }}>Holder growth and buy pressure accelerated while liquidity stayed healthy. Risk remains moderate.</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}><Tag text="+146.2%" color={dark.green} /><Tag text="Risk 28" color={dark.yellow} /><Tag text="Explosive" color={dark.purple} /></View>
      </LinearGradient>
    </Pressable>
    <SectionHeader title="Trending now" action="Market" onPress={() => router.push('/(tabs)/discover')} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {demoTokens.slice(0, 3).map((token) => <Pressable key={token.mint} onPress={() => router.push(`/token/${token.mint}`)} style={{ width: 164, padding: 14, borderRadius: 12, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 8 }}><AssetIcon symbol={token.symbol} color={token.color} size={38} /><Text style={{ color: dark.text, fontWeight: '900' }}>{token.name}</Text><Text style={{ color: dark.green, fontWeight: '900' }}>+{token.change}%</Text><Text style={{ color: dark.muted, fontSize: 11 }}>{token.marketCap} mcap</Text></Pressable>)}
    </ScrollView>
    <SectionHeader title="Smart alerts" action="Network" onPress={() => router.push('/network')} />
    {demoPosts.slice(0, 2).map((post, index) => <View key={post.handle} style={{ flexDirection: 'row', gap: 12, paddingVertical: 10 }}><View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: index ? '#2B2345' : '#173C2D', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: index ? dark.purple : dark.green, fontWeight: '900' }}>{index ? 'W' : 'R'}</Text></View><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '800' }}>{index ? 'Whale activity on SABI' : 'NFROG score moved 78 → 91'}</Text><Text style={{ color: dark.muted, fontSize: 12, lineHeight: 18, marginTop: 3 }}>{index ? 'A tracked wallet accumulated ₦3.8M over 11 buys.' : 'Volume acceleration confirmed the early runner signal.'}</Text></View></View>)}
  </Page>;
}
function Tag({ text, color }: { text: string; color: string }) { return <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, backgroundColor: `${color}18` }}><Text style={{ color, fontSize: 10, fontWeight: '900' }}>{text}</Text></View>; }
