import { StyleSheet, Text } from 'react-native';
import { Button, Card, Screen } from '@/components';
import { dark, spacing } from '@/theme';
export default function Deposit() { return <Screen><Card><Text style={styles.title}>Bank transfer deposit</Text><Text style={styles.body}>A dedicated virtual account will appear after the payment provider, webhook verification, reconciliation worker, and your KYC tier are ready.</Text></Card><Button title="Deposit provider not configured" disabled /></Screen>; }
const styles = StyleSheet.create({ title: { color: dark.text, fontSize: 20, fontWeight: '900' }, body: { color: dark.muted, lineHeight: 21, marginTop: spacing.sm } });
