import { StyleSheet, Text } from 'react-native';
import { Button, Card, Screen } from '@/components';
import { dark, spacing } from '@/theme';
export default function Withdraw() { return <Screen><Card><Text style={styles.title}>Withdraw to your verified bank</Text><Text style={styles.body}>Withdrawals require account-name matching, transaction PIN, limits, risk screening, provider availability, and sometimes manual review.</Text></Card><Button title="Withdrawal provider not configured" disabled /></Screen>; }
const styles = StyleSheet.create({ title: { color: dark.text, fontSize: 20, fontWeight: '900' }, body: { color: dark.muted, lineHeight: 21, marginTop: spacing.sm } });
