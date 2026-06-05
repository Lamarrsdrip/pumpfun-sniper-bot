import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState } from '@/components';
import { dark, spacing } from '@/theme';

export default function SocialScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.head}><View><Text style={styles.title}>Meme Network</Text><Text style={styles.sub}>Verified trades, communities and people worth following.</Text></View><Button title="Sign in to post" disabled /></View>
      <Card><Text style={styles.cardTitle}>Leaderboards use verified, risk-adjusted returns</Text><Text style={styles.sub}>Rookie → Trader → Advanced → Pro → Elite → Whale → Legend. Deposits and screenshots do not count as profit.</Text></Card>
      <EmptyState title="Your feed is quiet" body="Follow verified traders and token communities. Posts remain subject to anti-scam and market-manipulation moderation." />
    </ScrollView>
  );
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: dark.background }, content: { padding: spacing.md, gap: 12 }, head: { gap: 12 }, title: { color: dark.text, fontSize: 24, fontWeight: '900' }, sub: { color: dark.muted, lineHeight: 20, marginTop: 4 }, cardTitle: { color: dark.text, fontWeight: '900', marginBottom: 7 } });
