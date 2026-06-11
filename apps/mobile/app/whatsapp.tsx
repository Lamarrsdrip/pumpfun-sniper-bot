import { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '@/api';
import { Button, ModePill, Page, ProviderNotice, SectionHeader, StatusPill } from '@/components';
import { dark } from '@/theme';

type Connection = { id: string; phone: string; status: string };
type Status = { connection: Connection | null; provider: { status: string; message: string }; commands: string[] };

export default function WhatsappScreen() {
  const [status, setStatus] = useState<Status | null>(null);
  const [phone, setPhone] = useState('+2348010001001');
  const [code, setCode] = useState('');
  const [command, setCommand] = useState('Send ₦50,000 to 0123456789 Access Bank for inventory');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [demoCode, setDemoCode] = useState('');
  const load = () => api<Status>('/v1/whatsapp/status').then(setStatus).catch(() => setStatus(null));
  useEffect(() => { void load(); }, []);
  const link = async () => { setBusy(true); setReply(''); try { const result = await api<{ connection: Connection; demoVerificationCode?: string; message: string }>('/v1/whatsapp/link', { method: 'POST', body: JSON.stringify({ phone }) }); setStatus((current) => ({ connection: result.connection, provider: current?.provider || { status: 'DEMO', message: result.message }, commands: current?.commands || [] })); setDemoCode(result.demoVerificationCode || ''); setReply(result.message); } catch (error) { setReply(error instanceof ApiError ? error.message : 'WhatsApp link failed.'); } finally { setBusy(false); } };
  const verify = async () => { if (!status?.connection) return; setBusy(true); try { const result = await api<{ connection: Connection; message: string }>('/v1/whatsapp/verify', { method: 'POST', body: JSON.stringify({ connectionId: status.connection.id, code }) }); setStatus((current) => current ? { ...current, connection: result.connection } : current); setReply(result.message); } catch (error) { setReply(error instanceof ApiError ? error.message : 'Verification failed.'); } finally { setBusy(false); } };
  const sendCommand = async () => { if (!status?.connection) return; setBusy(true); try { const result = await api<{ reply: string; requiresInAppApproval: boolean }>('/v1/whatsapp/command', { method: 'POST', body: JSON.stringify({ connectionId: status.connection.id, text: command }) }); setReply(`${result.reply}${result.requiresInAppApproval ? '\n\nSecure approval is waiting inside MemeZo.' : ''}`); } catch (error) { setReply(error instanceof ApiError ? error.message : 'Command could not be prepared.'); } finally { setBusy(false); } };
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
    <SectionHeader title="Merchant alerts" />
    {['New P2P order detected', 'Payment failed or needs review', 'Low merchant balance', 'Receipt generated'].map((item) => <View key={item} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 7 }}><Ionicons name="checkmark-circle-outline" color={dark.green} size={18} /><Text style={{ color: dark.textSoft, flex: 1 }}>{item}</Text></View>)}
    <ProviderNotice title="Secure approval is mandatory" body="WhatsApp prepares actions but cannot silently move money. Payment approval requires MemeZo PIN, biometrics, or a bounded trusted automation rule." />
  </Page>;
}
