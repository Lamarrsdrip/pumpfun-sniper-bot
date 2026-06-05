import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button, Card, Label } from '@/components';
import { dark, spacing } from '@/theme';

export default function BotScreen() {
  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Card tone="warning"><Text style={styles.warning}>Auto Sniper is optional and off by default.</Text><Text style={styles.body}>It cannot promise profit. Live activation requires verified identity, explicit consent, provider readiness, and server-side risk limits.</Text></Card>
      <Card>
        <View style={styles.row}><View><Text style={styles.title}>Auto Sniper</Text><Label>Current mode: Off</Label></View><Switch value={false} disabled trackColor={{ true: dark.green }} /></View>
        {['Risk level', 'Max trade amount', 'Take profit', 'Stop loss', 'Daily loss limit', 'Whale protection', 'Rug protection'].map((item) => <View key={item} style={styles.setting}><Text style={styles.settingText}>{item}</Text><Text style={styles.value}>Configure</Text></View>)}
      </Card>
      <Button title="Review bot consent and limits" disabled />
      <Text style={styles.note}>Pattern memory stores anonymized feature/outcome records. It does not autonomously rewrite production risk rules without review and versioning.</Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: dark.background }, content: { padding: spacing.md, gap: 12 }, warning: { color: dark.yellow, fontWeight: '900', fontSize: 16 }, body: { color: dark.muted, lineHeight: 20, marginTop: 7 }, row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, title: { color: dark.text, fontSize: 20, fontWeight: '900' }, setting: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, borderTopWidth: 1, borderTopColor: dark.border }, settingText: { color: dark.text }, value: { color: dark.green, fontWeight: '800' }, note: { color: dark.muted, fontSize: 11, lineHeight: 17 } });
