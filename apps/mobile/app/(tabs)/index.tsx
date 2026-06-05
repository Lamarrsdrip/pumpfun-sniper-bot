import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '@/api';
import { Amount, Button, Card, EmptyState, formatNaira, Label } from '@/components';
import { dark, spacing } from '@/theme';

type Home = {
  wallet: { totalEquityNgn: string; todayPnlNgn: string; availableNgn: string };
  runner: null | { mint: string; name: string; symbol: string; runnerScore: number; category: string; explanation: string };
  alerts: Array<{ id: string; title: string; body: string }>;
  providerState: { ready: boolean; message: string };
};

export default function HomeScreen() {
  const [data, setData] = useState<Home | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const load = async () => {
    try { setData(await api<Home>('/v1/mobile/home')); setError(''); }
    catch (e) { setError(e instanceof ApiError ? e.message : 'Backend unavailable'); }
    finally { setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={dark.green} />}>
      <View style={styles.top}><View><Text style={styles.hello}>Good day</Text><Text style={styles.title}>NairaMeme overview</Text></View><View style={styles.live}><View style={[styles.dot, !data?.providerState.ready && styles.dotOffline]} /><Text style={[styles.liveText, !data?.providerState.ready && styles.offlineText]}>{data?.providerState.ready ? 'MARKET LIVE' : 'DATA OFFLINE'}</Text></View></View>
      <Card tone="green">
        <Label>Total equity</Label>
        <Amount positive>{formatNaira(data?.wallet.totalEquityNgn || 0)}</Amount>
        <Text style={styles.pnl}>Today {formatNaira(data?.wallet.todayPnlNgn || 0)}</Text>
        <View style={styles.actions}><Button title="Deposit" onPress={() => router.push('/deposit')} /><Button title="Withdraw" kind="secondary" onPress={() => router.push('/withdraw')} /></View>
      </Card>
      <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Early Runner AI</Text><Text style={styles.sectionLink} onPress={() => router.push('/(tabs)/discover')}>See market</Text></View>
      {data?.runner ? (
        <Card>
          <View style={styles.runnerTop}><View><Text style={styles.token}>{data.runner.name}</Text><Text style={styles.symbol}>{data.runner.symbol}</Text></View><Text style={styles.score}>{data.runner.runnerScore}</Text></View>
          <Text style={styles.category}>{data.runner.category}</Text>
          <Text style={styles.explanation}>{data.runner.explanation}</Text>
          <Button title="Open intelligence" kind="secondary" onPress={() => router.push(`/token/${data.runner!.mint}`)} />
        </Card>
      ) : <EmptyState title={error || 'No verified runner yet'} body={data?.providerState.message || 'The engine will not manufacture opportunities. Connect market providers and wait for a qualified signal.'} />}
      <Text style={styles.sectionTitle}>Meaningful alerts</Text>
      {(data?.alerts || []).length ? data!.alerts.map((alert) => <Card key={alert.id}><Text style={styles.token}>{alert.title}</Text><Text style={styles.explanation}>{alert.body}</Text></Card>) : <EmptyState title="No urgent alerts" body="You will only be notified when a signal changes materially." />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.background }, content: { padding: spacing.md, gap: 12, paddingBottom: 40 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, hello: { color: dark.muted }, title: { color: dark.text, fontSize: 22, fontWeight: '900' },
  live: { flexDirection: 'row', gap: 6, alignItems: 'center' }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: dark.green }, dotOffline: { backgroundColor: dark.yellow }, liveText: { color: dark.green, fontSize: 11, fontWeight: '900' }, offlineText: { color: dark.yellow },
  pnl: { color: dark.green, marginTop: 4, fontWeight: '700' }, actions: { flexDirection: 'row', gap: 10, marginTop: 18 }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  sectionTitle: { color: dark.text, fontSize: 17, fontWeight: '900', marginTop: 8 }, sectionLink: { color: dark.green, fontWeight: '800' },
  runnerTop: { flexDirection: 'row', justifyContent: 'space-between' }, token: { color: dark.text, fontSize: 16, fontWeight: '900' }, symbol: { color: dark.muted, marginTop: 2 },
  score: { color: dark.green, fontSize: 28, fontWeight: '900' }, category: { color: dark.yellow, fontSize: 12, fontWeight: '900', marginVertical: 10 }, explanation: { color: dark.muted, lineHeight: 20, marginBottom: 14 }
});
