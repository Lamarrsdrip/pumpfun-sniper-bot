import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { TokenSummary } from '@nairameme/contracts';
import { api } from '@/api';
import { EmptyState, formatNaira } from '@/components';
import { dark, spacing } from '@/theme';

export default function DiscoverScreen() {
  const [tokens, setTokens] = useState<TokenSummary[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api<{ tokens: TokenSummary[] }>('/v1/tokens?sort=runner').then((r) => setTokens(r.tokens)).catch(() => setTokens([])).finally(() => setLoading(false)); }, []);
  return (
    <View style={styles.root}>
      <View style={styles.filters}>{['Early runners', 'Trending', 'New', 'Volume'].map((item, index) => <Text key={item} style={[styles.filter, index === 0 && styles.active]}>{item}</Text>)}</View>
      <FlatList data={tokens} keyExtractor={(item) => item.mint} contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState loading={loading} title={loading ? 'Scanning live markets' : 'No verified market data'} body="Tokens appear only when a configured source supplies real metadata and prices." />}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/token/${item.mint}`)}>
            <View style={styles.ident}><View style={styles.avatar}><Text style={styles.avatarText}>{item.symbol.slice(0, 2)}</Text></View><View><Text style={styles.name}>{item.name}</Text><Text style={styles.meta}>{item.symbol} · {Math.floor(item.ageSeconds / 60)}m</Text></View></View>
            <View style={styles.right}><Text style={styles.score}>{item.sniperScore}</Text><Text style={styles.price}>{formatNaira(item.priceNgn)}</Text></View>
          </Pressable>
        )} />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.background }, filters: { flexDirection: 'row', gap: 8, padding: spacing.md }, filter: { color: dark.muted, backgroundColor: dark.surface, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 11, fontWeight: '700' }, active: { color: dark.green, borderWidth: 1, borderColor: dark.green },
  list: { paddingHorizontal: spacing.md, paddingBottom: 32, flexGrow: 1 }, row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: dark.border },
  ident: { flexDirection: 'row', alignItems: 'center', gap: 11, flex: 1 }, avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: dark.greenSoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: dark.green, fontWeight: '900' },
  name: { color: dark.text, fontWeight: '800' }, meta: { color: dark.muted, fontSize: 12, marginTop: 3 }, right: { alignItems: 'flex-end' }, score: { color: dark.green, fontWeight: '900' }, price: { color: dark.muted, fontSize: 11, marginTop: 3 }
});
