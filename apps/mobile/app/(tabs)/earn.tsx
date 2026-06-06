import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/api';
import { Button, Card, EmptyState, formatNaira } from '@/components';
import { dark, spacing } from '@/theme';

type Bounty = { id: string; title: string; sponsor: string; rewardNgn: string; category: string; deadline: string };

export default function EarnScreen() {
  const [items, setItems] = useState<Bounty[]>([]);
  useEffect(() => { api<{ bounties: Bounty[] }>('/v1/bounties').then((value) => setItems(value.bounties)).catch(() => setItems([])); }, []);
  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <View><Text style={styles.title}>Earn with your skills</Text><Text style={styles.sub}>Join verified campaigns, complete clear tasks and track every reward.</Text></View>
    {items.length ? items.map((item) => <Card key={item.id}>
      <View style={styles.row}><Text style={styles.category}>{item.category}</Text><Text style={styles.reward}>{formatNaira(item.rewardNgn)}</Text></View>
      <Text style={styles.name}>{item.title}</Text><Text style={styles.sub}>{item.sponsor} · Ends {new Date(item.deadline).toLocaleDateString('en-NG')}</Text>
      <Button title="View bounty" kind="secondary" onPress={() => {}} />
    </Card>) : <EmptyState title="No open bounties" body="Verified campaigns will appear here with task, deadline, sponsor and payout terms." />}
  </ScrollView>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: dark.background }, content: { padding: spacing.md, gap: 12 }, title: { color: dark.text, fontSize: 25, fontWeight: '900' }, sub: { color: dark.muted, lineHeight: 19, marginTop: 4, marginBottom: 12 }, row: { flexDirection: 'row', justifyContent: 'space-between' }, category: { color: dark.cyan, fontWeight: '800' }, reward: { color: dark.green, fontWeight: '900' }, name: { color: dark.text, fontSize: 17, fontWeight: '900', marginTop: 12 } });
