import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
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
  return <Screen>
    <Text style={styles.title}>Deposit Naira</Text><Text style={styles.body}>Create a unique transfer reference, send the exact amount, then track confirmation in Portfolio.</Text>
    {!result ? <Card><Text style={styles.label}>Amount</Text><TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" style={styles.input} placeholderTextColor={dark.muted} /><Text style={styles.preview}>{formatNaira(amount)}</Text>{error ? <Text style={styles.error}>{error}</Text> : null}<Button title={busy ? 'Creating reference...' : 'Create bank transfer'} disabled={busy || Number(amount) < 100} onPress={create} /></Card> :
      <Card tone="green"><Text style={styles.success}>Transfer details created</Text><Detail label="Bank" value={result.instructions.bank} /><Detail label="Account name" value={result.instructions.accountName} /><Detail label="Account number" value={result.instructions.accountNumber} /><Detail label="Reference" value={result.instructions.reference} /><Text style={styles.note}>Use the exact reference. Demo transfers require admin confirmation and never move real money.</Text></Card>}
  </Screen>;
}
function Detail({ label, value }: { label: string; value: string }) { return <View style={styles.detail}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>; }
const styles = StyleSheet.create({ title: { color: dark.text, fontSize: 26, fontWeight: '900' }, body: { color: dark.muted, lineHeight: 21, marginVertical: spacing.md }, label: { color: dark.muted, fontSize: 12 }, input: { minHeight: 52, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surfaceRaised, color: dark.text, borderRadius: 8, paddingHorizontal: 14, fontSize: 20, marginTop: 7 }, preview: { color: dark.green, fontWeight: '900', marginVertical: 12 }, error: { color: dark.red, marginBottom: 10 }, success: { color: dark.green, fontWeight: '900', fontSize: 18, marginBottom: 12 }, detail: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark.border }, value: { color: dark.text, fontWeight: '800', marginTop: 4 }, note: { color: dark.yellow, fontSize: 11, lineHeight: 17, marginTop: 14 } });
