import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Amount, Button, Card, EmptyState, formatNaira, Label } from '@/components';
import { dark, spacing } from '@/theme';

export default function PortfolioScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Card tone="green"><Label>Portfolio value</Label><Amount>{formatNaira(0)}</Amount><Text style={styles.muted}>No open market exposure</Text></Card>
      <View style={styles.stats}><Card><Label>Realized PnL</Label><Text style={styles.stat}>{formatNaira(0)}</Text></Card><Card><Label>Fees paid</Label><Text style={styles.stat}>{formatNaira(0)}</Text></Card></View>
      <Text style={styles.title}>Positions</Text>
      <EmptyState title="No positions" body="Your real positions will appear here after a confirmed trade. Demo holdings are never inserted." />
      <Button title="No transaction history yet" kind="secondary" disabled />
    </ScrollView>
  );
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: dark.background }, content: { padding: spacing.md, gap: 12 }, muted: { color: dark.muted, marginTop: 5 }, stats: { flexDirection: 'row', gap: 10 }, stat: { color: dark.text, fontWeight: '900', marginTop: 5 }, title: { color: dark.text, fontSize: 18, fontWeight: '900', marginTop: 8 } });
