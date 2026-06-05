import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Button, Card, Screen } from '@/components';
import { dark, spacing } from '@/theme';
export default function TradeReview() { const { mint } = useLocalSearchParams<{ mint: string }>(); return <Screen><Card><Text style={styles.title}>Order review</Text><Text style={styles.body}>Mint: {mint}</Text><Text style={styles.body}>A server quote must disclose price, platform fee, network fee, slippage, token output, expiry, and risk warnings before confirmation.</Text></Card><Button title="Trading provider not configured" disabled /></Screen>; }
const styles = StyleSheet.create({ title: { color: dark.text, fontSize: 20, fontWeight: '900' }, body: { color: dark.muted, lineHeight: 21, marginTop: spacing.sm } });
