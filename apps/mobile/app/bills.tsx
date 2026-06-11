import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '@/api';
import { Button, ModePill, Page, ProviderNotice, SectionHeader, StatusPill, formatNaira } from '@/components';
import { dark } from '@/theme';

const services = [
  { key: 'AIRTIME', title: 'Airtime', icon: 'phone-portrait' as const, color: dark.green },
  { key: 'DATA', title: 'Data', icon: 'wifi' as const, color: dark.cyan },
  { key: 'ELECTRICITY', title: 'Electricity', icon: 'flash' as const, color: dark.yellow },
  { key: 'CABLE', title: 'Cable TV', icon: 'tv' as const, color: dark.purple },
  { key: 'INTERNET', title: 'Internet', icon: 'globe' as const, color: dark.blue },
  { key: 'BETTING', title: 'Betting', icon: 'football' as const, color: dark.orange },
  { key: 'EDUCATION', title: 'Education', icon: 'school' as const, color: dark.green }
];
const favorites = [{ label: 'My MTN', detail: '0803 000 0000' }, { label: 'Home meter', detail: '4500 2187 92' }, { label: 'DStv', detail: '7012 3344 09' }];

export default function BillsScreen() {
  const [service, setService] = useState('AIRTIME'); const [customer, setCustomer] = useState('08030000000'); const [amount, setAmount] = useState('2000'); const [pin, setPin] = useState(''); const [message, setMessage] = useState('');
  const pay = async () => { setMessage(''); try { const result = await api<{ receipt: string }>('/v1/bills/pay', { method: 'POST', body: JSON.stringify({ service, customerReference: customer, amountNgn: Number(amount), pin, idempotencyKey: `bill-${service}-${customer}-${amount}-${Date.now()}` }) }); setMessage(`${service} completed in Demo Mode. Receipt ${result.receipt}.`); } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Bill payment failed.'); } };
  return <Page><View><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>Bills and subscriptions</Text><Text style={{ color: dark.muted, paddingTop: 4 }}>Pay everyday services and repeat recent billers quickly.</Text></View><ModePill />
    <SectionHeader title="Choose a service" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>{services.map((item) => <Pressable key={item.key} onPress={() => setService(item.key)} style={{ width: '31%', padding: 12, minHeight: 92, borderRadius: 13, backgroundColor: service === item.key ? `${item.color}16` : dark.surface, borderWidth: 1, borderColor: service === item.key ? item.color : dark.border, gap: 9 }}><Ionicons name={item.icon} size={22} color={item.color} /><Text adjustsFontSizeToFit numberOfLines={1} style={{ color: dark.text, fontSize: 11, fontWeight: '900' }}>{item.title}</Text></Pressable>)}</View>
    <SectionHeader title="Favorites" action="Manage" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9 }}>{favorites.map((item) => <Pressable key={item.label} onPress={() => setCustomer(item.detail.replaceAll(' ', ''))} style={{ width: 139, padding: 13, borderRadius: 13, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border }}><Text style={{ color: dark.text, fontWeight: '900' }}>{item.label}</Text><Text style={{ color: dark.muted, fontSize: 10, paddingTop: 5 }}>{item.detail}</Text></Pressable>)}</ScrollView>
    <SectionHeader title="Payment details" />
    <View style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 12 }}><Field label="Phone, meter or customer ID" value={customer} set={setCustomer} /><Field label="Amount" value={amount} set={setAmount} numeric /><Field label="Transaction PIN · Demo 1234" value={pin} set={setPin} numeric secure /><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.muted }}>Total from balance</Text><Text style={{ color: dark.text, fontWeight: '900' }}>{formatNaira(Number(amount || 0) + 50)}</Text></View>{message ? <Text selectable style={{ color: message.includes('completed') ? dark.green : dark.red }}>{message}</Text> : null}<Button title="Review and pay" disabled={!customer || Number(amount) < 50 || pin.length !== 4} onPress={pay} /></View>
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><StatusPill label="₦50 DEMO FEE" tone="warning" /><Text style={{ color: dark.muted, fontSize: 10, flex: 1 }}>The live provider quote replaces this simulated fee.</Text></View>
    <ProviderNotice body="Live airtime and bill execution needs an enabled, tested bills provider such as VTPass." />
  </Page>;
}
function Field({ label, value, set, numeric, secure }: { label: string; value: string; set: (value: string) => void; numeric?: boolean; secure?: boolean }) { return <View><Text style={{ color: dark.muted, fontSize: 11, paddingBottom: 5 }}>{label}</Text><TextInput value={value} onChangeText={set} secureTextEntry={secure} keyboardType={numeric ? 'number-pad' : 'default'} style={{ minHeight: 49, color: dark.text, borderRadius: 10, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surfaceRaised, paddingHorizontal: 12 }} /></View>; }
