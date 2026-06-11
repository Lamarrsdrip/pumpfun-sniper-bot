import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '@/api';
import { Button, Card, ModePill, Page, formatNaira } from '@/components';
import { dark } from '@/theme';

type Draft = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  amountMinor: string;
  narration: string;
  riskFlags: string[];
  status: string;
};

export default function AiPayScreen() {
  const [instruction, setInstruction] = useState('Send ₦50,000 to 0123456789 Access Bank for inventory');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const prepare = async () => {
    setBusy(true); setMessage('');
    try { setDraft((await api<{ payment: Draft }>('/v1/ai-pay/prepare', { method: 'POST', body: JSON.stringify({ instruction, source: 'TEXT' }) })).payment); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : 'Payment details could not be prepared.'); }
    finally { setBusy(false); }
  };
  const approve = async () => {
    if (!draft) return;
    setBusy(true); setMessage('');
    try {
      const result = await api<{ receipt: string }>(`/v1/ai-pay/${draft.id}/approve`, { method: 'POST', body: JSON.stringify({ pin, idempotencyKey: `mobile-${draft.id}`, confirmDuplicate: false }) });
      setMessage(`Payment completed in Demo Mode. Receipt ${result.receipt}.`);
    } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Payment approval failed.'); }
    finally { setBusy(false); }
  };
  return <Page>
    <View><Text style={{ color: dark.green, fontSize: 11, fontWeight: '900' }}>MEMEZO ASSISTANT</Text><Text style={{ color: dark.text, fontSize: 29, lineHeight: 34, fontWeight: '900', paddingTop: 5 }}>Tell MemeZo who to pay</Text><Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 5 }}>The assistant extracts details and prepares a draft. You review every field before approval.</Text></View>
    <ModePill />
    {!draft ? <Card>
      <Text style={{ color: dark.muted, fontSize: 12 }}>Payment instruction</Text>
      <TextInput multiline value={instruction} onChangeText={setInstruction} placeholder="Example: Send ₦25,000 to 0123456789 GTBank" placeholderTextColor={dark.muted} style={{ minHeight: 125, color: dark.text, backgroundColor: dark.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: dark.border, padding: 14, marginTop: 8, textAlignVertical: 'top' }} />
      <Pressable onPress={() => setMessage('Image OCR is unavailable until the configured AI vision provider passes its health check. Typed instructions work in Demo Mode.')} style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 14 }}><Ionicons name="image-outline" size={20} color={dark.cyan} /><Text style={{ color: dark.cyan, fontWeight: '800' }}>Read a payment screenshot</Text></Pressable>
      {message ? <Text selectable style={{ color: dark.yellow, lineHeight: 18, paddingBottom: 10 }}>{message}</Text> : null}
      <Button title={busy ? 'Reading instruction...' : 'Prepare payment'} disabled={busy || instruction.trim().length < 10} onPress={prepare} />
    </Card> : <Card tone={draft.riskFlags.length ? 'warning' : 'green'}>
      <Text style={{ color: dark.text, fontSize: 19, fontWeight: '900' }}>Review payment</Text>
      <Detail label="Bank" value={draft.bankName} /><Detail label="Account" value={draft.accountNumber} /><Detail label="Verified name" value={draft.accountName} /><Detail label="Amount" value={formatNaira(Number(draft.amountMinor) / 100)} /><Detail label="Narration" value={draft.narration} />
      <View style={{ padding: 12, borderRadius: 10, backgroundColor: draft.riskFlags.length ? '#35171B' : dark.surfaceRaised }}><Text style={{ color: draft.riskFlags.length ? dark.red : dark.green, fontWeight: '900' }}>{draft.riskFlags.length ? draft.riskFlags.join(' · ') : 'Risk checks passed · no duplicate found'}</Text></View>
      <TextInput secureTextEntry maxLength={6} value={pin} onChangeText={setPin} keyboardType="number-pad" placeholder="Enter transaction PIN" placeholderTextColor={dark.muted} style={{ minHeight: 50, color: dark.text, backgroundColor: dark.surfaceRaised, borderRadius: 10, borderWidth: 1, borderColor: dark.border, paddingHorizontal: 13 }} />
      {message ? <Text selectable style={{ color: message.startsWith('Payment') ? dark.green : dark.red, lineHeight: 18 }}>{message}</Text> : null}
      <Button title={busy ? 'Approving...' : 'Approve and pay'} disabled={busy || pin.length !== 4 || draft.riskFlags.length > 0} onPress={approve} />
      <Button title="Edit instruction" kind="secondary" onPress={() => { setDraft(null); setPin(''); setMessage(''); }} />
    </Card>}
    <Text style={{ color: dark.muted, fontSize: 11, lineHeight: 17 }}>MemeZo never silently transfers money. Trusted automation rules are separate, limited, and revocable.</Text>
  </Page>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark.border }}><Text style={{ color: dark.muted }}>{label}</Text><Text selectable numberOfLines={2} style={{ color: dark.text, fontWeight: '800', flex: 1, textAlign: 'right' }}>{value}</Text></View>;
}
