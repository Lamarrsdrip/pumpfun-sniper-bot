import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '@/api';
import { EmptyState, formatNaira } from '@/components';
import { dark, spacing } from '@/theme';

type Token = { id: string; mint: string; name: string; symbol: string; priceNgn: string; marketCapNgn: string; liquidityNgn: string; volume24hNgn: string; holders: number; runnerScore: number; riskScore: number; change24h: number; observedAt: string };

export default function DiscoverScreen() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  useEffect(() => { api<{ tokens: Token[] }>('/v1/tokens').then((r) => setTokens(r.tokens)).catch(() => setTokens([])).finally(() => setLoading(false)); }, []);
  const shown = useMemo(() => tokens.filter((item) => `${item.name} ${item.symbol} ${item.mint}`.toLowerCase().includes(query.toLowerCase())), [tokens, query]);
  return <View style={styles.root}>
    <View style={styles.header}><Text style={styles.title}>Discover opportunities</Text><Text style={styles.sub}>Newest verified observations appear first.</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search name, symbol or contract" placeholderTextColor={dark.muted} style={styles.search} /></View>
    <View style={styles.filters}>{['Early runners', 'Trending', 'New', 'Top volume'].map((item, index) => <Text key={item} style={[styles.filter, index === 0 && styles.active]}>{item}</Text>)}</View>
    <FlatList data={shown} keyExtractor={(item) => item.mint}
      ListEmptyComponent={<EmptyState loading={loading} title={loading ? 'Scanning markets' : 'No matching tokens'} body={loading ? 'The scanner is loading the selected data source.' : 'Try another search or check the source status on Home.'} />}
      renderItem={({ item }) => <Pressable style={styles.row} onPress={() => router.push(`/token/${item.mint}`)}>
        <View style={styles.ident}><View style={styles.avatar}><Text style={styles.avatarText}>{item.symbol.slice(0, 2)}</Text></View><View style={styles.nameWrap}><Text style={styles.name}>{item.name}</Text><Text style={styles.meta}>{item.symbol} · {item.holders.toLocaleString()} holders</Text><Text style={styles.contract}>{item.mint.slice(0, 6)}…{item.mint.slice(-5)}</Text></View></View>
        <View style={styles.right}><Text style={styles.score}>{item.runnerScore}</Text><Text style={[styles.change, item.change24h < 0 && styles.loss]}>{item.change24h > 0 ? '+' : ''}{item.change24h.toFixed(1)}%</Text><Text style={styles.price}>{formatNaira(item.priceNgn)}</Text></View>
      </Pressable>} />
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.background }, header: { padding: spacing.md, paddingBottom: 4 }, title: { color: dark.text, fontSize: 24, fontWeight: '900' }, sub: { color: dark.muted, marginTop: 4 },
  search: { marginTop: 14, minHeight: 46, borderWidth: 1, borderColor: dark.border, borderRadius: 8, backgroundColor: dark.surface, color: dark.text, paddingHorizontal: 13 },
  filters: { flexDirection: 'row', gap: 8, padding: spacing.md, paddingTop: 10, overflow: 'hidden' }, filter: { color: dark.muted, backgroundColor: dark.surface, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10, fontWeight: '700', fontSize: 12 }, active: { color: dark.green, borderWidth: 1, borderColor: dark.green },
  row: { minHeight: 88, marginHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: dark.border },
  ident: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 }, avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: dark.greenSoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: dark.green, fontWeight: '900' },
  nameWrap: { flex: 1 }, name: { color: dark.text, fontWeight: '800' }, meta: { color: dark.muted, fontSize: 11, marginTop: 3 }, contract: { color: dark.cyan, fontSize: 10, marginTop: 3 }, right: { alignItems: 'flex-end' }, score: { color: dark.green, fontWeight: '900', fontSize: 18 }, change: { color: dark.green, fontSize: 11 }, loss: { color: dark.red }, price: { color: dark.muted, fontSize: 10, marginTop: 3 }
});
