import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, Label } from '@/components';
import { dark, spacing } from '@/theme';
export default function TokenDetail() {
  const { mint } = useLocalSearchParams<{ mint: string }>();
  return <ScrollView style={styles.root} contentContainerStyle={styles.content}><Card><Label>Contract</Label><Text selectable style={styles.mint}>{mint}</Text></Card><EmptyState title="Intelligence loading requires live token data" body="Runner, trust, liquidity, community, whale, momentum and risk evidence will be rendered from versioned backend analysis." /><View style={styles.actions}><Button title="Trading unavailable" disabled /><Button title="Sign in to watch" kind="secondary" disabled /></View></ScrollView>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: dark.background }, content: { padding: spacing.md, gap: 12 }, mint: { color: dark.text, marginTop: 5, fontSize: 12 }, actions: { flexDirection: 'row', gap: 10 } });
