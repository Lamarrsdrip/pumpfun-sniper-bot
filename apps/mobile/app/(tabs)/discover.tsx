import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { AssetIcon, ModePill, Page } from '@/components';
import { demoTokens } from '@/demo';
import { dark } from '@/theme';

const filters = ['Early runners', 'Pump.fun launches', 'Trending', 'Near migration', 'Migrated', 'Top volume', 'High risk'];
export default function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(filters[0]);
  const shown = useMemo(() => demoTokens.filter(t => `${t.name} ${t.symbol} ${t.mint}`.toLowerCase().includes(query.toLowerCase())), [query]);
  return <Page>
    <View><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>Discover before the crowd</Text><Text style={{ color: dark.muted, lineHeight: 20, marginTop: 4 }}>Fresh launches and runner signals, newest first.</Text></View>
    <ModePill />
    <TextInput value={query} onChangeText={setQuery} placeholder="Search token or contract" placeholderTextColor={dark.muted} style={{ minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surface, color: dark.text, paddingHorizontal: 15 }} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{filters.map(item => <Pressable key={item} onPress={() => setActive(item)} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 99, backgroundColor: active === item ? dark.green : dark.surface }}><Text style={{ color: active === item ? '#06110D' : dark.muted, fontSize: 12, fontWeight: '900' }}>{item}</Text></Pressable>)}</ScrollView>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.text, fontSize: 19, fontWeight: '900' }}>{active}</Text><Text style={{ color: dark.yellow, fontSize: 12, fontWeight: '800' }}>DEMO SCAN</Text></View>
    {shown.map(token => <Pressable key={token.mint} onPress={() => router.push(`/token/${token.mint}`)} style={{ backgroundColor: dark.surface, borderRadius: 14, borderWidth: 1, borderColor: dark.border, padding: 14, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}><AssetIcon symbol={token.symbol} color={token.color} /><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontSize: 16, fontWeight: '900' }}>{token.name}</Text><Text style={{ color: dark.muted, fontSize: 11 }}>{token.symbol} · {token.holders.toLocaleString()} holders</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={{ color: dark.green, fontSize: 24, fontWeight: '900' }}>{token.score}</Text><Text style={{ color: token.risk > 55 ? dark.red : dark.yellow, fontSize: 10 }}>Risk {token.risk}</Text></View></View>
      <View style={{ height: 42, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>{[20, 26, 18, 31, 28, 39, 34, 48, 43, 54, 49, 60, 57, 69, 64, 80, 74, 92].map((h, i) => <View key={i} style={{ flex: 1, height: h / 2.4, borderRadius: 2, backgroundColor: i > 12 ? token.color : `${token.color}55` }} />)}</View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Stat label="24h" value={`+${token.change}%`} color={dark.green} /><Stat label="Market cap" value={token.marketCap} /><Stat label="Curve" value={`${Math.min(96, token.score - 18)}%`} /><Stat label="Signal" value={token.score > 85 ? 'Explosive' : token.score > 77 ? 'Strong' : 'Watch'} color={token.color} /></View>
    </Pressable>)}
  </Page>;
}
function Stat({ label, value, color = dark.text }: { label: string; value: string; color?: string }) { return <View><Text style={{ color: dark.muted, fontSize: 9 }}>{label}</Text><Text style={{ color, fontSize: 11, fontWeight: '800', marginTop: 3 }}>{value}</Text></View>; }
