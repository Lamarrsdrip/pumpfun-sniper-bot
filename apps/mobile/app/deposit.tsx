import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, ApiError } from '@/api';
import { Button, Card, Screen, formatNaira } from '@/components';
import { dark, spacing } from '@/theme';

type DepositResult = { request: { amountMinor: string; status: string; reference: string }; instructions: { bank: string; accountName: string; accountNumber: string; reference: string } };

export default function Deposit() {
  const [amount, setAmount] = useState('50000');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DepositResult | null>(null);
  const [error, setError] = useState('');
  const create = async () => {
    setBusy(true);
    try { setResult(await api('/v1/deposits', { method: 'POST', body: JSON.stringify({ amountNgn: Number(amount) }) })); setError(''); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Deposit request failed.'); }
    finally { setBusy(false); }
  };
  return <ScrollView style={{ flex: 1, backgroundColor: dark.background }} contentContainerStyle={{ padding: spacing.md, gap: 12 }}>
    <Text style={styles.title}>Add money</Text><Text style={styles.body}>Fund with a Nigerian bank transfer or receive supported crypto.</Text>
    <View style={{ flexDirection: 'row', gap: 9 }}><Pressable style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: dark.greenSoft, borderWidth: 1, borderColor: dark.green }}><Text style={{ color: dark.green, fontWeight: '900' }}>Naira transfer</Text><Text style={{ color: dark.muted, fontSize: 10, marginTop: 3 }}>Virtual account</Text></Pressable><Pressable onPress={() => router.push('/crypto-deposit')} style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: dark.surface }}><Text style={{ color: dark.text, fontWeight: '900' }}>Crypto deposit</Text><Text style={{ color: dark.muted, fontSize: 10, marginTop: 3 }}>USDT · USDC · SOL</Text></Pressable></View>
    {!result ? <Card><Text style={styles.label}>Amount</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" style={styles.input} placeholderTextColor={dark.muted} /><Text style={styles.preview}>{formatNaira(amount)}</Text>{error ? <Text style={styles.error}>{error}</Text> : null}<Button title={busy ? 'Creating reference...' : 'Create bank transfer'} disabled={busy || Number(amount) < 100} onPress={create} /></Card> :
      <Card tone="green"><Text style={styles.success}>Transfer details created</Text><Detail label="Bank" value={result.instructions.bank} /><Detail label="Account name" value={result.instructions.accountName} /><Detail label="Account number" value={result.instructions.accountNumber} /><Detail label="Reference" value={result.instructions.reference} /><Text style={styles.note}>Use the exact reference. Demo transfers require admin confirmation and never move real money.</Text></Card>}
  </ScrollView>;
}
function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>; }
const styles = StyleSheet.create({ title: { color: dark.text, fontSize: 26, fontWeight: '900' }, body: { color: dark.muted, lineHeight: 21, marginVertical: spacing.md }, label: { color: dark.muted, fontSize: 12 }, input: { minHeight: 52, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surfaceRaised, color: dark.text, borderRadius: 8, paddingHorizontal: 14, fontSize: 20, marginTop: 7 }, preview: { color: dark.green, fontWeight: '900', marginVertical: 12 }, error: { color: dark.red, marginBottom: 10 }, success: { color: dark.green, fontWeight: '900', fontSize: 18, marginBottom: 12 }, detail: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark.border }, value: { color: dark.text, fontWeight: '800', marginTop: 4 }, note: { color: dark.yellow, fontSize: 11, lineHeight: 17, marginTop: 14 } });
