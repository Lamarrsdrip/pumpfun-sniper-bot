import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api';
import { Amount, Card, EmptyState, formatNaira, Label } from '@/components';
import { dark, spacing } from '@/theme';

type Portfolio = { balanceNgn: string; positions: Array<{ id: string; tokenId: string; quantity: string; costMinor: string; token?: { name: string; symbol: string; priceNgn: string } }>; trades: Array<{ id: string; side: string; amountMinor: string; feeMinor: string; createdAt: string; tokenId: string }>; transactions: Array<{ id: string; type: string; amountMinor: string; status: string; createdAt: string }> };

export default function PortfolioScreen() {
  const [data, setData] = useState<Portfolio | null>(null);
  const load = useCallback(() => { api<Portfolio>('/v1/portfolio').then(setData).catch(() => setData(null)); }, []);
  useEffect(load, [load]); useFocusEffect(load);
  const positionValue = (data?.positions || []).reduce((sum, item) => sum + Number(item.quantity) * Number(item.token?.priceNgn || 0), 0);
  const fees = (data?.trades || []).reduce((sum, item) => sum + Number(item.feeMinor) / 100, 0);
  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <Card tone="green"><Label>Total portfolio</Label><Amount>{formatNaira(Number(data?.balanceNgn || 0) + positionValue)}</Amount><Text style={styles.muted}>Cash {formatNaira(data?.balanceNgn || 0)} · Assets {formatNaira(positionValue)}</Text></Card>
    <View style={styles.stats}><Card><Label>Open positions</Label><Text style={styles.stat}>{data?.positions.length || 0}</Text></Card><Card><Label>Fees paid</Label><Text style={styles.stat}>{formatNaira(fees)}</Text></Card></View>
    <Text style={styles.title}>Holdings</Text>
    {data?.positions.length ? data.positions.map((item) => <Card key={item.id}><View style={styles.line}><View><Text style={styles.name}>{item.token?.name || item.tokenId}</Text><Text style={styles.muted}>{Number(item.quantity).toLocaleString()} {item.token?.symbol}</Text></View><Text style={styles.value}>{formatNaira(Number(item.quantity) * Number(item.token?.priceNgn || 0))}</Text></View></Card>) : <EmptyState title="No open positions" body="Completed Demo or Live holdings will appear here with their actual mode." />}
    <Text style={styles.title}>Trade history</Text>
    {data?.trades.length ? data.trades.map((item) => <View style={styles.history} key={item.id}><View><Text style={styles.name}>{item.side} · {item.tokenId.replace('token-', '').toUpperCase()}</Text><Text style={styles.muted}>{new Date(item.createdAt).toLocaleString('en-NG')}</Text></View><View style={styles.end}><Text style={styles.value}>{formatNaira(Number(item.amountMinor) / 100)}</Text><Text style={styles.fee}>Fee {formatNaira(Number(item.feeMinor) / 100)}</Text></View></View>) : <EmptyState title="No trade history yet" body="Trades appear after a confirmed server execution. Failed actions are never shown as completed." />}
  </ScrollView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: dark.background }, content: { padding: spacing.md, gap: 12, paddingBottom: 40 }, muted: { color: dark.muted, marginTop: 5, fontSize: 12 }, stats: { flexDirection: 'row', gap: 10 }, stat: { color: dark.text, fontWeight: '900', fontSize: 20, marginTop: 5 }, title: { color: dark.text, fontSize: 18, fontWeight: '900', marginTop: 8 }, line: { flexDirection: 'row', justifyContent: 'space-between' }, name: { color: dark.text, fontWeight: '800' }, value: { color: dark.text, fontWeight: '900' }, history: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: dark.border }, end: { alignItems: 'flex-end' }, fee: { color: dark.yellow, fontSize: 10, marginTop: 4 } });
