import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { api, ApiError } from '@/api';
import { Button, Card, ModePill, Page, StatusPill, formatNaira } from '@/components';
import { dark } from '@/theme';

type Recipient = { id: string; tag?: string; name: string; maskedPhone: string; verified: boolean };

export default function MemeZoTransferScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(String(params.q || '@tobi'));
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('25000');
  const [narration, setNarration] = useState('MemeZo transfer');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState('');

  const resolve = async () => {
    setBusy(true); setMessage(''); setRecipient(null);
    try {
      const result = await api<{ recipients: Recipient[] }>(`/v1/transfers/recipients?q=${encodeURIComponent(query)}`);
      if (!result.recipients[0]) throw new ApiError('No MemeZo recipient matched that tag, phone, email, or name.', 404, 'RECIPIENT_NOT_FOUND');
      setRecipient(result.recipients[0]);
    }
    catch (error) { setMessage(error instanceof ApiError ? error.message : 'Recipient could not be found.'); }
    finally { setBusy(false); }
  };
  const send = async () => {
    if (!recipient) return;
    setBusy(true); setMessage('');
    try {
      const result = await api<{ receipt: string; balanceNgn: string }>('/v1/transfers/internal', {
        method: 'POST',
        body: JSON.stringify({ recipientId: recipient.id, amountNgn: Number(amount), narration, pin, idempotencyKey: `mobile-internal-${Date.now()}` })
      });
      setReceipt(result.receipt);
      setMessage(`Transfer complete. Available balance ${formatNaira(result.balanceNgn)}.`);
      setPin('');
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Transfer could not be completed.'); }
    finally { setBusy(false); }
  };

  return <Page>
    <View><Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>Send to MemeZo</Text><Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 4 }}>Instant, fee-free transfers using a tag, phone, email, or name.</Text></View>
    <ModePill compact />
    <Card>
      <Text style={{ color: dark.muted, fontSize: 11, fontWeight: '800' }}>FIND RECIPIENT</Text>
      <TextInput autoCapitalize="none" value={query} onChangeText={setQuery} placeholder="@tag, phone, email or name" placeholderTextColor={dark.muted} style={{ minHeight: 50, marginTop: 9, borderRadius: 11, backgroundColor: dark.surfaceRaised, color: dark.text, paddingHorizontal: 13 }} />
      <View style={{ paddingTop: 10 }}><Button title="Find MemeZo user" kind="secondary" busy={busy} disabled={query.trim().length < 2} onPress={resolve} /></View>
    </Card>
    {recipient ? <Card tone="green">
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Text style={{ color: dark.text, fontSize: 19, fontWeight: '900' }}>{recipient.name}</Text><Text style={{ color: dark.muted, paddingTop: 3 }}>{recipient.tag || recipient.maskedPhone}</Text></View><StatusPill label={recipient.verified ? 'VERIFIED' : 'BASIC ACCOUNT'} tone={recipient.verified ? 'success' : 'warning'} /></View>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount in Naira" placeholderTextColor={dark.muted} style={{ minHeight: 58, marginTop: 14, borderRadius: 11, backgroundColor: dark.surfaceRaised, color: dark.text, paddingHorizontal: 13, fontSize: 25, fontWeight: '900' }} />
      <TextInput value={narration} onChangeText={setNarration} placeholder="What is this for?" placeholderTextColor={dark.muted} style={{ minHeight: 50, marginTop: 10, borderRadius: 11, backgroundColor: dark.surfaceRaised, color: dark.text, paddingHorizontal: 13 }} />
      <TextInput secureTextEntry value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={4} placeholder="Transaction PIN · Demo 1234" placeholderTextColor={dark.muted} style={{ minHeight: 50, marginTop: 10, borderRadius: 11, backgroundColor: dark.surfaceRaised, color: dark.text, paddingHorizontal: 13 }} />
      <Text style={{ color: dark.muted, paddingVertical: 11 }}>Fee ₦0.00 · Recipient gets {formatNaira(amount)}</Text>
      <Button title={`Send ${formatNaira(amount)}`} busy={busy} disabled={pin.length !== 4 || Number(amount) <= 0} onPress={send} />
    </Card> : null}
    {receipt ? <Card tone="green"><Text style={{ color: dark.green, fontWeight: '900' }}>Transfer successful</Text><Text selectable style={{ color: dark.textSoft, paddingTop: 7 }}>{receipt}</Text></Card> : null}
    {message ? <Text selectable style={{ color: receipt ? dark.green : dark.yellow, lineHeight: 19 }}>{message}</Text> : null}
  </Page>;
}
