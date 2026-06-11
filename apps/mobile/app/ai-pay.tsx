import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '@/api';
import { Button, Card, ModePill, Page, ProviderNotice, StatusPill, formatNaira } from '@/components';
import { dark } from '@/theme';

type Draft = { id: string; bankName: string; accountNumber: string; accountName: string; amountMinor: string; narration: string; riskFlags: string[]; status: string };

export default function AiPayScreen() {
  const [sourceAsset, setSourceAsset] = useState('NGN');
  const [instruction, setInstruction] = useState('Send ₦50,000 to 0123456789 Access Bank for inventory');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const prepare = async () => { if (sourceAsset !== 'NGN') { setMessage(`${sourceAsset} conversion is visible but unavailable until a live swap/custody route is connected. Choose NGN for the working Demo flow.`); return; } setBusy(true); setMessage(''); try { setDraft((await api<{ payment: Draft }>('/v1/ai-pay/prepare', { method: 'POST', body: JSON.stringify({ instruction, source: 'TEXT' }) })).payment); } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Payment details could not be prepared.'); } finally { setBusy(false); } };
  const approve = async () => { if (!draft) return; setBusy(true); setMessage(''); try { const result = await api<{ receipt: string }>(`/v1/ai-pay/${draft.id}/approve`, { method: 'POST', body: JSON.stringify({ pin, idempotencyKey: `mobile-${draft.id}`, confirmDuplicate: false }) }); setMessage(`Demo payment complete. Receipt ${result.receipt}.`); } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Payment approval failed.'); } finally { setBusy(false); } };
  const amount = Number(draft?.amountMinor || 0) / 100;
  const fee = draft ? Math.max(50, amount * 0.001) : 0;
  return <Page>
    <View><Text style={{ color: dark.green, fontSize: 11, fontWeight: '900' }}>MEMEZO AI PAY</Text><Text style={{ color: dark.text, fontSize: 29, lineHeight: 34, fontWeight: '900', paddingTop: 5 }}>{draft ? 'Check every detail' : 'Who are you paying?'}</Text><Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 5 }}>{draft ? 'MemeZo prepared this payment. Nothing moves until you approve.' : 'Type an instruction or add a screenshot. MemeZo extracts the details for review.'}</Text></View>
    <ModePill />
    {!draft ? <Card>
      <Text style={{ color: dark.muted, fontSize: 11, fontWeight: '800' }}>PAY FROM</Text>
      <View style={{ flexDirection: 'row', gap: 7, marginTop: 9, marginBottom: 15 }}>{['NGN', 'USDT', 'USDC', 'SOL'].map((asset) => <Pressable key={asset} onPress={() => { setSourceAsset(asset); setMessage(''); }} style={{ flex: 1, paddingVertical: 9, borderRadius: 9, backgroundColor: sourceAsset === asset ? dark.greenSoft : dark.surfaceRaised, alignItems: 'center' }}><Text style={{ color: sourceAsset === asset ? dark.green : dark.muted, fontSize: 10, fontWeight: '900' }}>{asset}</Text></Pressable>)}</View>
      <Text style={{ color: dark.muted, fontSize: 11, fontWeight: '800' }}>PAYMENT INSTRUCTION</Text>
      <TextInput multiline value={instruction} onChangeText={setInstruction} placeholder="Send ₦25,000 to 0123456789 GTBank" placeholderTextColor={dark.muted} style={{ minHeight: 128, color: dark.text, backgroundColor: dark.surfaceRaised, borderRadius: 12, borderWidth: 1, borderColor: dark.border, padding: 14, marginTop: 9, textAlignVertical: 'top', fontSize: 15, lineHeight: 22 }} />
      <Pressable onPress={() => setMessage('Image extraction needs a configured vision provider. Typed instructions remain available in Demo Mode.')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15 }}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: '#19333A', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="camera-outline" size={20} color={dark.cyan} /></View><View><Text style={{ color: dark.text, fontWeight: '900' }}>Upload payment screenshot</Text><Text style={{ color: dark.muted, fontSize: 10, paddingTop: 2 }}>Bank details, invoice or instruction</Text></View></Pressable>
      {message ? <Text selectable style={{ color: dark.yellow, lineHeight: 18, paddingBottom: 10 }}>{message}</Text> : null}
      <Button title={sourceAsset === 'NGN' ? 'Prepare payment' : `Check ${sourceAsset} route`} busy={busy} disabled={instruction.trim().length < 10} onPress={prepare} icon="sparkles" />
    </Card> : <Card tone={draft.riskFlags.length ? 'warning' : 'green'}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ color: dark.text, fontSize: 19, fontWeight: '900' }}>Payment review</Text><StatusPill label={draft.riskFlags.length ? 'CHECK REQUIRED' : 'ACCOUNT VERIFIED'} tone={draft.riskFlags.length ? 'warning' : 'success'} icon={draft.riskFlags.length ? 'warning' : 'checkmark-circle'} /></View>
      <Detail label="Funding source" value={sourceAsset} /><Detail label="Recipient" value={draft.accountName} /><Detail label="Bank" value={draft.bankName} /><Detail label="Account number" value={draft.accountNumber} /><Detail label="Amount" value={formatNaira(amount)} /><Detail label="Fee" value={formatNaira(fee)} /><Detail label="Balance after" value={formatNaira(318450 - amount - fee)} /><Detail label="Narration" value={draft.narration} />
      <View style={{ padding: 12, borderRadius: 10, backgroundColor: draft.riskFlags.length ? '#35171B' : dark.surfaceRaised }}><Text style={{ color: draft.riskFlags.length ? dark.red : dark.green, fontWeight: '900' }}>{draft.riskFlags.length ? draft.riskFlags.join(' · ') : 'Risk checks passed · no duplicate found'}</Text></View>
      <TextInput secureTextEntry maxLength={6} value={pin} onChangeText={setPin} keyboardType="number-pad" placeholder="Transaction PIN · Demo 1234" placeholderTextColor={dark.muted} style={{ minHeight: 51, color: dark.text, backgroundColor: dark.surfaceRaised, borderRadius: 10, borderWidth: 1, borderColor: dark.border, paddingHorizontal: 13 }} />
      {message ? <Text selectable style={{ color: message.startsWith('Demo payment') ? dark.green : dark.red, lineHeight: 18 }}>{message}</Text> : null}
      <Button title="Approve with PIN" busy={busy} disabled={pin.length !== 4 || draft.riskFlags.length > 0} onPress={approve} icon="lock-closed" />
      <Button title="Edit payment" kind="secondary" onPress={() => { setDraft(null); setPin(''); setMessage(''); }} />
    </Card>}
    <ProviderNotice title="No silent payments" body="WhatsApp and AI can prepare transactions, but secure approval remains required unless you configure a limited trusted rule." />
  </Page>;
}
function Detail({ label, value }: { label: string; value: string }) { return <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: dark.border }}><Text style={{ color: dark.muted }}>{label}</Text><Text selectable numberOfLines={2} style={{ color: dark.text, fontWeight: '900', flex: 1, textAlign: 'right' }}>{value}</Text></View>; }
