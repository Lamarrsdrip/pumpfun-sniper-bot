import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { api, ApiError } from '@/api';
import { Button, Card, Screen, formatNaira } from '@/components';
import { dark, spacing } from '@/theme';

export default function Withdraw() {
  const [form, setForm] = useState({ amountNgn: '10000', bankName: 'Access Bank', accountNumber: '', accountName: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      const result = await api<{ request: { reference: string; status: string; feeMinor: string } }>('/v1/withdrawals', { method: 'POST', body: JSON.stringify({ ...form, amountNgn: Number(form.amountNgn) }) });
      setMessage(`Withdrawal ${result.request.reference} is ${result.request.status.toLowerCase()}. Estimated fee: ${formatNaira(Number(result.request.feeMinor) / 100)}.`);
    } catch (cause) { setMessage(cause instanceof ApiError ? cause.message : 'Withdrawal request failed.'); }
    finally { setBusy(false); }
  };
  return <Screen><Text style={styles.title}>Withdraw to bank</Text><Text style={styles.body}>Account ownership and balance are checked before a request is created.</Text><Card>
    <Input label="Amount" value={form.amountNgn} onChangeText={(value) => setForm({ ...form, amountNgn: value })} numeric />
    <Input label="Bank" value={form.bankName} onChangeText={(value) => setForm({ ...form, bankName: value })} />
    <Input label="10-digit account number" value={form.accountNumber} onChangeText={(value) => setForm({ ...form, accountNumber: value })} numeric />
    <Input label="Account name" value={form.accountName} onChangeText={(value) => setForm({ ...form, accountName: value })} />
    {message ? <Text style={styles.message}>{message}</Text> : null}<Button title={busy ? 'Checking request...' : 'Review withdrawal'} onPress={submit} disabled={busy || form.accountNumber.length !== 10 || !form.accountName.trim()} />
  </Card></Screen>;
}
function Input({ label, value, onChangeText, numeric }: { label: string; value: string; onChangeText: (value: string) => void; numeric?: boolean }) { return <><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} keyboardType={numeric ? 'number-pad' : 'default'} style={styles.input} placeholderTextColor={dark.muted} /></>; }
const styles = StyleSheet.create({ title: { color: dark.text, fontSize: 26, fontWeight: '900' }, body: { color: dark.muted, lineHeight: 21, marginVertical: spacing.md }, label: { color: dark.muted, marginBottom: 5, fontSize: 12 }, input: { minHeight: 46, borderWidth: 1, borderColor: dark.border, borderRadius: 8, backgroundColor: dark.surfaceRaised, color: dark.text, paddingHorizontal: 12, marginBottom: 12 }, message: { color: dark.yellow, lineHeight: 19, marginBottom: 12 } });
