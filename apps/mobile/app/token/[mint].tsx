import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api';
import { Button, Card, EmptyState, formatNaira, Label } from '@/components';
import { dark, spacing } from '@/theme';

type TokenDetail = { token: { mint: string; name: string; symbol: string; priceNgn: string; marketCapNgn: string; liquidityNgn: string; volume24hNgn: string; holders: number; runnerScore: number; riskScore: number; change24h: number; source: string }; explanation: { summary: string; highestRisk: string; disclaimer: string }; ai: { text: string; source: string; costProtected: boolean } };

export default function TokenDetail() {
  const { mint } = useLocalSearchParams<{ mint: string }>();
  const [data, setData] = useState<TokenDetail | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => { api<TokenDetail>(`/v1/tokens/${mint}`).then(setData).catch(() => setData(null)); }, [mint]);
  if (!data) return <ScrollView style={styles.root} contentContainerStyle={styles.content}><EmptyState loading title="Loading token intelligence" body="Checking the selected mode and verified token record." /></ScrollView>;
  const token = data.token;
  const copy = async () => { await Clipboard.setStringAsync(token.mint); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <View style={styles.hero}><View><Text style={styles.name}>{token.name}</Text><Text style={styles.symbol}>{token.symbol} · {token.source}</Text></View><View style={styles.score}><Text style={styles.scoreValue}>{token.runnerScore}</Text><Text style={styles.scoreLabel}>Runner</Text></View></View>
    <Card tone={token.riskScore >= 60 ? 'warning' : 'green'}><Label>AI intelligence</Label><Text style={styles.summary}>{data.ai.text}</Text><Text style={styles.disclaimer}>{data.explanation.disclaimer}</Text></Card>
    <View style={styles.grid}><Metric label="Price" value={formatNaira(token.priceNgn)} /><Metric label="24h move" value={`${token.change24h > 0 ? '+' : ''}${token.change24h.toFixed(1)}%`} /><Metric label="Market cap" value={formatNaira(token.marketCapNgn)} /><Metric label="Liquidity" value={formatNaira(token.liquidityNgn)} /><Metric label="24h volume" value={formatNaira(token.volume24hNgn)} /><Metric label="Holders" value={token.holders.toLocaleString()} /><Metric label="Risk score" value={`${token.riskScore}/100`} /><Metric label="AI source" value={data.ai.source.replaceAll('_', ' ')} /></View>
    <Card><Label>Contract address</Label><Text selectable style={styles.mint}>{token.mint}</Text><Button title={copied ? 'Mint copied' : 'Copy contract'} kind="secondary" onPress={copy} /></Card>
    <Card tone="warning"><Text style={styles.riskTitle}>Highest risk</Text><Text style={styles.summary}>{data.explanation.highestRisk}</Text></Card>
    <View style={styles.actions}><Button title="Buy" onPress={() => router.push(`/trade/${token.mint}?side=BUY`)} /><Button title="Sell" kind="secondary" onPress={() => router.push(`/trade/${token.mint}?side=SELL`)} /></View>
  </ScrollView>;
}
function Metric({ label, value }: { label: string; value: string }) { return <View style={styles.metric}><Label>{label}</Label><Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>{value}</Text></View>; }
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: dark.background }, content: { padding: spacing.md, gap: 12, paddingBottom: 40 }, hero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, name: { color: dark.text, fontSize: 27, fontWeight: '900' }, symbol: { color: dark.muted, marginTop: 4, fontSize: 12 }, score: { alignItems: 'center' }, scoreValue: { color: dark.green, fontSize: 32, fontWeight: '900' }, scoreLabel: { color: dark.muted, fontSize: 10 }, summary: { color: dark.text, lineHeight: 21, marginTop: 8 }, disclaimer: { color: dark.yellow, fontSize: 10, lineHeight: 15, marginTop: 10 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metric: { width: '48%', minHeight: 74, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, borderRadius: 8, padding: 12 }, metricValue: { color: dark.text, fontWeight: '900', marginTop: 7 }, mint: { color: dark.cyan, marginVertical: 10, fontSize: 12, lineHeight: 18 }, riskTitle: { color: dark.yellow, fontWeight: '900' }, actions: { flexDirection: 'row', gap: 10 } });
