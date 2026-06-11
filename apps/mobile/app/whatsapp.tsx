import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '@/api';
import { Button, ModePill, Page, ProviderNotice, SectionHeader, StatusPill } from '@/components';
import { dark } from '@/theme';

type Connection = { id: string; phone: string; status: string };
type Settings = { paymentsEnabled: boolean; p2pAlertsEnabled: boolean; p2pAutoPayPaused: boolean; perTransactionLimitMinor: string; requireInAppAboveMinor: string; dailyLimitMinor: string; trustedRecipients: string[] };
type Approval = { id: string; status: string; payment?: { accountNumber: string; bankName: string; amountMinor: string; riskFlags: string[] } };
type Status = { connection: Connection | null; provider: { status: string; message: string }; commands: string[]; settings: Settings };

export default function WhatsappScreen() {
  const [status, setStatus] = useState<Status | null>(null);
  const [phone, setPhone] = useState('+2348010001001');
  const [code, setCode] = useState('');
  const [command, setCommand] = useState('Send ₦50,000 to 0123456789 Access Bank for inventory');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [demoCode, setDemoCode] = useState('');
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [pin, setPin] = useState('');
  const load = () => Promise.all([
    api<Status>('/v1/whatsapp/status'),
    api<{ approvals: Approval[] }>('/v1/whatsapp/approvals')
  ]).then(([nextStatus, nextApprovals]) => { setStatus(nextStatus); setApprovals(nextApprovals.approvals); }).catch(() => setStatus(null));
  useEffect(() => { void load(); }, []);
  const link = async () => { setBusy(true); setReply(''); try { const result = await api<{ connection: Connection; demoVerificationCode?: string; message: string }>('/v1/whatsapp/link', { method: 'POST', body: JSON.stringify({ phone }) }); setStatus((current) => ({ connection: result.connection, provider: current?.provider || { status: 'DEMO', message: result.message }, commands: current?.commands || [], settings: current?.settings || { paymentsEnabled: false, p2pAlertsEnabled: true, p2pAutoPayPaused: true, perTransactionLimitMinor: '0', requireInAppAboveMinor: '0', dailyLimitMinor: '0', trustedRecipients: [] } })); setDemoCode(result.demoVerificationCode || ''); setReply(result.message); } catch (error) { setReply(error instanceof ApiError ? error.message : 'WhatsApp link failed.'); } finally { setBusy(false); } };
  const verify = async () => { if (!status?.connection) return; setBusy(true); try { const result = await api<{ connection: Connection; message: string }>('/v1/whatsapp/verify', { method: 'POST', body: JSON.stringify({ connectionId: status.connection.id, code }) }); setStatus((current) => current ? { ...current, connection: result.connection } : current); setReply(result.message); } catch (error) { setReply(error instanceof ApiError ? error.message : 'Verification failed.'); } finally { setBusy(false); } };
  const sendCommand = async () => { if (!status?.connection) return; setBusy(true); try { const result = await api<{ reply: string; requiresInAppApproval: boolean }>('/v1/whatsapp/command', { method: 'POST', body: JSON.stringify({ connectionId: status.connection.id, text: command }) }); setReply(`${result.reply}${result.requiresInAppApproval ? '\n\nSecure approval is waiting inside MemeZo.' : ''}`); } catch (error) { setReply(error instanceof ApiError ? error.message : 'Command could not be prepared.'); } finally { setBusy(false); } };
  const saveSettings = async (patch: Partial<Settings>) => {
    if (!status) return;
    const next = { ...status.settings, ...patch };
    setBusy(true);
    try {
      const result = await api<{ settings: Settings }>('/v1/whatsapp/settings', {
        method: 'PUT',
        body: JSON.stringify({
          paymentsEnabled: next.paymentsEnabled,
          p2pAlertsEnabled: next.p2pAlertsEnabled,
          p2pAutoPayPaused: next.p2pAutoPayPaused,
          perTransactionLimitNgn: Number(next.perTransactionLimitMinor) / 100,
          requireInAppAboveNgn: Number(next.requireInAppAboveMinor) / 100,
          dailyLimitNgn: Number(next.dailyLimitMinor) / 100,
          trustedRecipients: next.trustedRecipients
        })
      });
      setStatus({ ...status, settings: result.settings });
      setReply('WhatsApp safety rules saved.');
    } catch (error) { setReply(error instanceof ApiError ? error.message : 'Safety rules could not be saved.'); }
    finally { setBusy(false); }
  };
  const approve = async (approval: Approval) => {
    setBusy(true);
    try {
      const result = await api<{ receipt: string }>(`/v1/whatsapp/approvals/${approval.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ pin, channel: 'IN_APP', idempotencyKey: `mobile-wa-${approval.id}` })
      });
      setReply(`Payment approved securely. Receipt ${result.receipt}.`);
      setPin('');
      await load();
    } catch (error) { setReply(error instanceof ApiError ? error.message : 'Approval failed.'); }
    finally { setBusy(false); }
  };
  const connected = status?.connection?.status === 'CONNECTED';
  return <Page>
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: '#25D36622', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="logo-whatsapp" color="#25D366" size={29} /></View><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontSize: 27, fontWeight: '900' }}>WhatsApp Assistant</Text><Text style={{ color: dark.muted, lineHeight: 18, paddingTop: 3 }}>Payments, alerts and merchant help from chat.</Text></View></View>
    <ModePill />
    <View style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.text, fontWeight: '900' }}>Connection</Text><StatusPill label={status?.connection?.status || 'NOT CONNECTED'} tone={connected ? 'success' : 'warning'} /></View>
      {!status?.connection ? <><TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+234..." placeholderTextColor={dark.muted} style={{ minHeight: 49, color: dark.text, borderRadius: 10, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surfaceRaised, paddingHorizontal: 13 }} /><Button title="Connect WhatsApp" icon="logo-whatsapp" busy={busy} onPress={link} /></> : !connected ? <><Text style={{ color: dark.muted, fontSize: 11 }}>Enter the six-digit verification code for {status.connection.phone}.</Text>{demoCode ? <Text selectable style={{ color: dark.yellow, fontWeight: '900' }}>Demo code: {demoCode}</Text> : null}<TextInput value={code} onChangeText={setCode} maxLength={6} keyboardType="number-pad" placeholder="Verification code" placeholderTextColor={dark.muted} style={{ minHeight: 49, color: dark.text, borderRadius: 10, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surfaceRaised, paddingHorizontal: 13 }} /><Button title="Verify number" busy={busy} disabled={code.length !== 6} onPress={verify} /></> : <Text style={{ color: dark.mutedStrong, lineHeight: 18 }}>Connected to {status.connection.phone}. Live outbound messaging still depends on Meta provider health.</Text>}
    </View>
    <SectionHeader title="What you can ask" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{['balance', 'account number', 'recent transactions', 'orders', 'pause auto pay', 'prepare payment'].map((item) => <Pressable key={item} onPress={() => setCommand(item)} style={{ paddingHorizontal: 11, paddingVertical: 8, borderRadius: 99, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border }}><Text style={{ color: dark.textSoft, fontSize: 10, fontWeight: '800' }}>{item}</Text></Pressable>)}</View>
    <View style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 10 }}><Text style={{ color: dark.muted, fontSize: 10, fontWeight: '900' }}>DEMO COMMAND</Text><TextInput multiline value={command} onChangeText={setCommand} placeholder="Ask MemeZo..." placeholderTextColor={dark.muted} style={{ minHeight: 100, color: dark.text, borderRadius: 10, backgroundColor: dark.surfaceRaised, padding: 13, textAlignVertical: 'top' }} /><Button title="Prepare in assistant" disabled={!connected || command.length < 2} busy={busy} onPress={sendCommand} />{reply ? <View style={{ padding: 12, borderRadius: 10, backgroundColor: '#123329' }}><Text selectable style={{ color: dark.textSoft, lineHeight: 19 }}>{reply}</Text></View> : null}</View>
    {approvals.filter((item) => item.status === 'AWAITING_IN_APP_APPROVAL').map((approval) => <View key={approval.id} style={{ padding: 15, borderRadius: 14, backgroundColor: '#1D180D', borderWidth: 1, borderColor: '#56461F', gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.text, fontWeight: '900' }}>Payment waiting for you</Text><StatusPill label="APPROVAL" tone="warning" /></View>
      <Text style={{ color: dark.textSoft }}>{approval.payment?.bankName} · ••••{approval.payment?.accountNumber.slice(-4)}</Text>
      <Text style={{ color: dark.green, fontSize: 22, fontWeight: '900' }}>₦{(Number(approval.payment?.amountMinor || 0) / 100).toLocaleString()}</Text>
      <TextInput secureTextEntry value={pin} onChangeText={setPin} maxLength={4} keyboardType="number-pad" placeholder="MemeZo PIN · Demo 1234" placeholderTextColor={dark.muted} style={{ minHeight: 49, color: dark.text, borderRadius: 10, backgroundColor: dark.surfaceRaised, paddingHorizontal: 13 }} />
      <Button title="Approve inside MemeZo" icon="lock-closed" busy={busy} disabled={pin.length !== 4} onPress={() => approve(approval)} />
    </View>)}
    {status?.settings ? <View style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, gap: 13 }}>
      <SectionHeader title="Safety controls" />
      <Setting label="Allow payment preparation" body="WhatsApp may prepare payments, never silently send them." value={status.settings.paymentsEnabled} onChange={(value) => saveSettings({ paymentsEnabled: value })} />
      <Setting label="Merchant alerts" body="P2P order, failure, limit and receipt notifications." value={status.settings.p2pAlertsEnabled} onChange={(value) => saveSettings({ p2pAlertsEnabled: value })} />
      <Setting label="Pause P2P auto-pay" body="Stops new automatic merchant payouts." value={status.settings.p2pAutoPayPaused} onChange={(value) => saveSettings({ p2pAutoPayPaused: value })} />
      <LimitInput label="WhatsApp PIN limit" valueMinor={status.settings.perTransactionLimitMinor} onSave={(value) => saveSettings({ perTransactionLimitMinor: value })} />
      <LimitInput label="Always review in app above" valueMinor={status.settings.requireInAppAboveMinor} onSave={(value) => saveSettings({ requireInAppAboveMinor: value })} />
      <LimitInput label="Daily WhatsApp cap" valueMinor={status.settings.dailyLimitMinor} onSave={(value) => saveSettings({ dailyLimitMinor: value })} />
      <Text style={{ color: dark.muted, fontSize: 10, lineHeight: 16 }}>Trusted recipient: {status.settings.trustedRecipients[0] || 'None saved'}. Payments outside these rules are pushed back into MemeZo for review.</Text>
    </View> : null}
    <SectionHeader title="Merchant alerts" />
    {['New P2P order detected', 'Payment failed or needs review', 'Low merchant balance', 'Receipt generated'].map((item) => <View key={item} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 7 }}><Ionicons name="checkmark-circle-outline" color={dark.green} size={18} /><Text style={{ color: dark.textSoft, flex: 1 }}>{item}</Text></View>)}
    <ProviderNotice title="Secure approval is mandatory" body="WhatsApp prepares actions but cannot silently move money. Payment approval requires MemeZo PIN, biometrics, or a bounded trusted automation rule." />
  </Page>;
}

function Setting({ label, body, value, onChange }: { label: string; body: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>{label}</Text><Text style={{ color: dark.muted, fontSize: 10, lineHeight: 15, paddingTop: 3 }}>{body}</Text></View><Switch value={value} onValueChange={onChange} trackColor={{ true: dark.greenDeep, false: dark.border }} /></View>;
}

function LimitInput({ label, valueMinor, onSave }: { label: string; valueMinor: string; onSave: (valueMinor: string) => void }) {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><Text style={{ color: dark.textSoft, flex: 1 }}>{label}</Text><View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 10, backgroundColor: dark.surfaceRaised, paddingHorizontal: 10 }}><Text style={{ color: dark.muted }}>₦</Text><TextInput defaultValue={String(Number(valueMinor) / 100)} onEndEditing={(event) => onSave(String(Math.max(0, Number(event.nativeEvent.text || 0)) * 100))} keyboardType="number-pad" style={{ color: dark.text, minWidth: 82, minHeight: 42, textAlign: 'right', fontWeight: '900' }} /></View></View>;
}
