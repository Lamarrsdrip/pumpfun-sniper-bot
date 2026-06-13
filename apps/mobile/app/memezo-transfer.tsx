import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, TextInput, View } from 'react-native';
import { api, ApiError } from '@/api';
import { Button, Card, ModePill, Page, StatusPill, formatNaira } from '@/components';
import { demoRecipients } from '@/demo';
import { dark } from '@/theme';

type Recipient = { id: string; tag?: string; name: string; maskedPhone: string; verified: boolean };
type Stage = 'RECIPIENT' | 'DETAILS' | 'REVIEW' | 'SUCCESS';

export default function MemeZoTransferScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [stage, setStage] = useState<Stage>('RECIPIENT');
  const [query, setQuery] = useState(normalizePaymentLink(String(params.q || '')));
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [amount, setAmount] = useState('25000');
  const [narration, setNarration] = useState('MemeZo transfer');
  const [pin, setPin] = useState('');
  const [balance, setBalance] = useState('0');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState('');

  useEffect(() => {
    api<{ wallet: { availableNgn: string } }>('/v1/mobile/home')
      .then((result) => setBalance(result.wallet.availableNgn))
      .catch(() => setBalance('0'));
  }, []);

  const resolve = async (search = query) => {
    setBusy(true);
    setMessage('');
    setRecipient(null);
    try {
      const result = await api<{ recipients: Recipient[] }>(`/v1/transfers/recipients?q=${encodeURIComponent(search)}`);
      if (!result.recipients[0]) throw new ApiError('No MemeZo recipient matched that tag, phone, email, or name.', 404, 'RECIPIENT_NOT_FOUND');
      setQuery(search);
      setRecipient(result.recipients[0]);
      setStage('DETAILS');
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Recipient could not be found.');
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    if (!recipient) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await api<{ receipt: string; balanceNgn: string }>('/v1/transfers/internal', {
        method: 'POST',
        body: JSON.stringify({
          recipientId: recipient.id,
          amountNgn: Number(amount),
          narration,
          pin,
          idempotencyKey: `mobile-internal-${Date.now()}`
        })
      });
      setReceipt(result.receipt);
      setBalance(result.balanceNgn);
      setStage('SUCCESS');
      setPin('');
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'Transfer could not be completed.');
    } finally {
      setBusy(false);
    }
  };

  return <Page>
    <View>
      <Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>Send money</Text>
      <Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 4 }}>Instant transfers to a MemeZo username, phone, email, or payment QR.</Text>
    </View>
    <ModePill compact />
    <Progress stage={stage} />

    {stage === 'RECIPIENT' ? <>
      <Card>
        <Text style={{ color: dark.muted, fontSize: 11, fontWeight: '800' }}>WHO ARE YOU PAYING?</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 9, borderRadius: 12, backgroundColor: dark.surfaceRaised, paddingHorizontal: 12 }}>
          <Ionicons name="search-outline" color={dark.muted} size={19} />
          <TextInput autoCapitalize="none" value={query} onChangeText={setQuery} placeholder="@username, phone, email or MemeZo QR link" placeholderTextColor={dark.muted} style={{ minHeight: 52, flex: 1, color: dark.text, paddingHorizontal: 9 }} />
        </View>
        <View style={{ paddingTop: 10 }}><Button title="Continue" busy={busy} disabled={query.trim().length < 2} onPress={() => resolve()} /></View>
      </Card>
      <View style={{ gap: 9 }}>
        <Text style={{ color: dark.text, fontSize: 17, fontWeight: '900' }}>Favorites and recent</Text>
        {demoRecipients.map((item) => <Pressable key={item.id} onPress={() => resolve(item.tag)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 14, backgroundColor: dark.surface }}>
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: `${item.color}22`, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: item.color, fontWeight: '900' }}>{item.initials}</Text></View>
          <View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>{item.name}</Text><Text style={{ color: dark.muted, paddingTop: 2 }}>{item.tag} · MemeZo</Text></View>
          <Ionicons name={item.favorite ? 'star' : 'time-outline'} color={item.favorite ? dark.yellow : dark.muted} size={18} />
        </Pressable>)}
      </View>
    </> : null}

    {stage === 'DETAILS' && recipient ? <Card tone="green">
      <RecipientHeader recipient={recipient} />
      <Text style={{ color: dark.muted, fontSize: 11, fontWeight: '800', paddingTop: 8 }}>AMOUNT</Text>
      <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="Amount in Naira" placeholderTextColor={dark.muted} style={{ minHeight: 62, marginTop: 7, borderRadius: 12, backgroundColor: dark.surfaceRaised, color: dark.text, paddingHorizontal: 13, fontSize: 28, fontWeight: '900' }} />
      <Text style={{ color: dark.muted, paddingTop: 7 }}>Available {formatNaira(balance)}</Text>
      <TextInput value={narration} onChangeText={setNarration} placeholder="What is this for?" placeholderTextColor={dark.muted} style={{ minHeight: 50, marginTop: 10, borderRadius: 11, backgroundColor: dark.surfaceRaised, color: dark.text, paddingHorizontal: 13 }} />
      <View style={{ paddingTop: 12, gap: 8 }}>
        <Button title="Review transfer" disabled={Number(amount) <= 0 || Number(amount) > Number(balance)} onPress={() => setStage('REVIEW')} />
        <Button title="Choose another person" kind="ghost" onPress={() => { setStage('RECIPIENT'); setRecipient(null); }} />
      </View>
    </Card> : null}

    {stage === 'REVIEW' && recipient ? <Card>
      <Text style={{ color: dark.text, fontSize: 20, fontWeight: '900' }}>Review transfer</Text>
      <RecipientHeader recipient={recipient} compact />
      <ReviewLine label="Amount" value={formatNaira(amount)} strong />
      <ReviewLine label="Fee" value="₦0.00" />
      <ReviewLine label="Recipient gets" value={formatNaira(amount)} />
      <ReviewLine label="Balance after" value={formatNaira(Math.max(0, Number(balance) - Number(amount)))} />
      <ReviewLine label="Security" value="Verified recipient · duplicate and velocity checks" />
      <TextInput secureTextEntry value={pin} onChangeText={setPin} keyboardType="number-pad" maxLength={6} placeholder="Transaction PIN · Demo 1234" placeholderTextColor={dark.muted} style={{ minHeight: 52, marginTop: 8, borderRadius: 11, backgroundColor: dark.surfaceRaised, color: dark.text, paddingHorizontal: 13 }} />
      <View style={{ paddingTop: 11, gap: 8 }}>
        <Button title={`Confirm ${formatNaira(amount)}`} icon="lock-closed-outline" busy={busy} disabled={pin.length < 4} onPress={send} />
        <Button title="Edit transfer" kind="ghost" onPress={() => setStage('DETAILS')} />
      </View>
    </Card> : null}

    {stage === 'SUCCESS' ? <Card tone="green">
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 8 }}>
        <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: dark.greenSoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="checkmark" color={dark.green} size={34} /></View>
        <Text style={{ color: dark.text, fontSize: 23, fontWeight: '900' }}>Money sent</Text>
        <Text style={{ color: dark.muted, textAlign: 'center' }}>{formatNaira(amount)} was sent to {recipient?.name}.</Text>
        <Text selectable style={{ color: dark.textSoft, fontWeight: '800' }}>{receipt}</Text>
      </View>
      <Button title="Send another transfer" kind="secondary" onPress={() => { setStage('RECIPIENT'); setRecipient(null); setReceipt(''); setMessage(''); }} />
    </Card> : null}

    {message ? <Text selectable style={{ color: dark.yellow, lineHeight: 19 }}>{message}</Text> : null}
  </Page>;
}

function Progress({ stage }: { stage: Stage }) {
  const steps: Stage[] = ['RECIPIENT', 'DETAILS', 'REVIEW', 'SUCCESS'];
  const active = steps.indexOf(stage);
  return <View style={{ flexDirection: 'row', gap: 6 }}>{steps.map((item, index) => <View key={item} style={{ height: 4, flex: 1, borderRadius: 2, backgroundColor: index <= active ? dark.green : dark.border }} />)}</View>;
}

function RecipientHeader({ recipient, compact = false }: { recipient: Recipient; compact?: boolean }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: compact ? 8 : 0 }}>
    <View style={{ flex: 1 }}><Text style={{ color: dark.text, fontSize: compact ? 16 : 19, fontWeight: '900' }}>{recipient.name}</Text><Text style={{ color: dark.muted, paddingTop: 3 }}>{recipient.tag || recipient.maskedPhone}</Text></View>
    <StatusPill label={recipient.verified ? 'VERIFIED' : 'BASIC ACCOUNT'} tone={recipient.verified ? 'success' : 'warning'} />
  </View>;
}

function ReviewLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: dark.border }}><Text style={{ color: dark.muted }}>{label}</Text><Text numberOfLines={2} style={{ color: strong ? dark.text : dark.textSoft, fontWeight: strong ? '900' : '700', flex: 1, textAlign: 'right' }}>{value}</Text></View>;
}

function normalizePaymentLink(value: string) {
  const match = value.match(/memezo:\/\/pay\/([^?]+)/i);
  return match ? decodeURIComponent(match[1]) : value;
}
