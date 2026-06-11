import { useMemo, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssetIcon, ModePill, ProviderNotice, StatusPill } from '@/components';
import { demoTokens } from '@/demo';
import { dark } from '@/theme';

const modes = [
  { key: 'DEX', title: 'DEX Mode', body: 'Liquid multi-chain pairs', color: dark.green },
  { key: 'EARLY_SOLANA', title: 'Early Solana', body: 'Pump.fun · high risk', color: dark.yellow },
  { key: 'WATCHLIST', title: 'Watchlist', body: 'Your selected contracts', color: dark.cyan }
] as const;
const chains = ['All chains', 'Solana', 'Ethereum', 'Base', 'BNB Chain', 'Polygon', 'Arbitrum', 'Optimism', 'Tron'];

export default function DiscoverScreen() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'DEX' | 'EARLY_SOLANA' | 'WATCHLIST'>('DEX');
  const [chain, setChain] = useState('All chains');
  const shown = useMemo(() => demoTokens
    .filter((token) => mode === 'WATCHLIST' ? token.score >= 82 : token.sourceMode === mode)
    .filter((token) => chain === 'All chains' || token.chain === chain)
    .filter((token) => `${token.name} ${token.symbol} ${token.mint} ${token.chain}`.toLowerCase().includes(query.toLowerCase())), [query, mode, chain]);
  return <ScrollView style={{ flex: 1, backgroundColor: dark.background }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 54 }} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
    <View><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>Market intelligence</Text><Text style={{ color: dark.muted, lineHeight: 20, marginTop: 4 }}>DEX liquidity first. Early Solana launches stay clearly separated.</Text></View>
    <ModePill />
    <TextInput value={query} onChangeText={setQuery} placeholder="Search token, symbol, chain or contract" placeholderTextColor={dark.muted} style={{ minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surface, color: dark.text, paddingHorizontal: 15 }} />
    <View style={{ flexDirection: 'row', gap: 8 }}>{modes.map((item) => <Pressable key={item.key} onPress={() => setMode(item.key)} style={{ flex: 1, minHeight: 75, padding: 10, borderRadius: 12, backgroundColor: mode === item.key ? `${item.color}18` : dark.surface, borderWidth: 1, borderColor: mode === item.key ? item.color : dark.border }}><Text numberOfLines={1} adjustsFontSizeToFit style={{ color: mode === item.key ? item.color : dark.text, fontSize: 11, fontWeight: '900' }}>{item.title}</Text><Text numberOfLines={2} style={{ color: dark.muted, fontSize: 9, lineHeight: 13, paddingTop: 5 }}>{item.body}</Text></Pressable>)}</View>
    {mode === 'EARLY_SOLANA' ? <ProviderNotice title="High-risk launch stream" body="Early Solana tokens may have thin liquidity, concentrated wallets and incomplete authority data. Demo values are simulated." /> : <ProviderNotice title="Data source status" body="DEX Screener-style Demo records are shown. Live mode requires connected market providers and never invents pairs." />}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>{chains.map((item) => <Pressable key={item} onPress={() => setChain(item)} style={{ paddingHorizontal: 11, paddingVertical: 8, borderRadius: 99, backgroundColor: chain === item ? dark.cyan : dark.surface }}><Text style={{ color: chain === item ? dark.black : dark.muted, fontSize: 10, fontWeight: '900' }}>{item}</Text></Pressable>)}</ScrollView>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: dark.text, fontSize: 19, fontWeight: '900' }}>{modes.find((item) => item.key === mode)?.title}</Text><StatusPill label="SIMULATED FEED" tone="warning" /></View>
    {shown.map((token) => <Pressable key={token.mint} onPress={() => router.push(`/token/${token.mint}`)} style={{ backgroundColor: dark.surface, borderRadius: 14, borderWidth: 1, borderColor: token.risk >= 60 ? '#58451D' : dark.border, padding: 14, gap: 11 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}><AssetIcon symbol={token.symbol} color={token.color} /><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ color: dark.text, fontSize: 16, fontWeight: '900' }}>{token.name}</Text><Text numberOfLines={1} style={{ color: dark.muted, fontSize: 10 }}>{token.symbol} · {token.chain} · {token.age}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={{ color: dark.green, fontSize: 23, fontWeight: '900' }}>{token.score}</Text><Text style={{ color: token.risk > 55 ? dark.red : dark.yellow, fontSize: 9 }}>Risk {token.risk}</Text></View></View>
      <View style={{ height: 40, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>{[20, 26, 18, 31, 28, 39, 34, 48, 43, 54, 49, 60, 57, 69, 64, 80, 74, 92].map((height, index) => <View key={index} style={{ flex: 1, height: height / 2.5, borderRadius: 2, backgroundColor: index > 12 ? token.color : `${token.color}55` }} />)}</View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Stat label="24h" value={`+${token.change}%`} color={dark.green} /><Stat label="Liquidity" value={token.liquidity} /><Stat label="Volume" value={token.volume} /><Stat label="Buy pressure" value={`${token.buyPressure}%`} color={dark.cyan} /></View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><StatusPill label={token.source} tone={token.sourceMode === 'EARLY_SOLANA' ? 'warning' : 'success'} /><View style={{ flex: 1 }} />{token.warnings.length ? <Ionicons name="warning-outline" color={dark.yellow} size={16} /> : <Ionicons name="shield-checkmark-outline" color={dark.green} size={16} />}</View>
    </Pressable>)}
    {!shown.length ? <View style={{ padding: 32, alignItems: 'center' }}><Text style={{ color: dark.text, fontWeight: '900' }}>No matching opportunities</Text><Text style={{ color: dark.muted, textAlign: 'center', paddingTop: 6 }}>Try another chain, mode or contract search.</Text></View> : null}
  </ScrollView>;
}
function Stat({ label, value, color = dark.text }: { label: string; value: string; color?: string }) { return <View style={{ maxWidth: '25%' }}><Text style={{ color: dark.muted, fontSize: 8 }}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={{ color, fontSize: 10, fontWeight: '900', marginTop: 3 }}>{value}</Text></View>; }
