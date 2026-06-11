import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '@/api';
import { Button, ModePill, Page, SectionHeader, formatNaira } from '@/components';
import { dark } from '@/theme';

const services = [
  { key: 'AIRTIME', title: 'Airtime', icon: 'phone-portrait' as const },
  { key: 'DATA', title: 'Data', icon: 'wifi' as const },
  { key: 'ELECTRICITY', title: 'Electricity', icon: 'flash' as const },
  { key: 'CABLE', title: 'Cable TV', icon: 'tv' as const },
  { key: 'INTERNET', title: 'Internet', icon: 'globe' as const },
  { key: 'BETTING', title: 'Betting', icon: 'football' as const }
];

export default function BillsScreen() {
  const [service, setService] = useState('AIRTIME'); const [customer, setCustomer] = useState('08030000000'); const [amount, setAmount] = useState('2000'); const [pin, setPin] = useState(''); const [message, setMessage] = useState('');
  const pay = async () => {
    setMessage('');
    try { const result = await api<{ receipt: string }>('/v1/bills/pay', { method: 'POST', body: JSON.stringify({ service, customerReference: customer, amountNgn: Number(amount), pin, idempotencyKey: `bill-${service}-${customer}-${amount}` }) }); setMessage(`${service} payment completed in Demo Mode. Receipt ${result.receipt}.`); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : 'Bill payment failed.'); }
  };
  return <Page><View><Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>Bills and everyday payments</Text><Text style={{ color: dark.muted, paddingTop: 4 }}>Choose a service, review the customer details, then approve.</Text></View><ModePill />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>{services.map((item) => <Pressable key={item.key} onPress={() => setService(item.key)} style={{ width: '31%', padding: 12, minHeight: 86, borderRadius: 12, backgroundColor: service === item.key ? dark.greenSoft : dark.surface, borderWidth: 1, borderColor: service === item.key ? dark.green : dark.border, gap: 8 }}><Ionicons name={item.icon} size={21} color={service === item.key ? dark.green : dark.muted} /><Text adjustsFontSizeToFit numberOfLines={1} style={{ color: dark.text, fontSize: 11, fontWeight: '800' }}>{item.title}</Text></Pressable>)}</View>
    <SectionHeader title="Payment details" />
    <View style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, gap: 12 }}><Field label="Phone, meter or customer ID" value={customer} set={setCustomer} /><Field label="Amount" value={amount} set={setAmount} numeric /><Field label="Demo transaction PIN (1234)" value={pin} set={setPin} numeric /><Text style={{ color: dark.muted, fontSize: 12 }}>Total from MemeZo balance: {formatNaira(Number(amount || 0) + 50)} including ₦50 Demo fee</Text>{message ? <Text selectable style={{ color: message.includes('failed') ? dark.red : dark.green }}>{message}</Text> : null}<Button title="Review and pay" disabled={!customer || Number(amount) < 50 || pin.length !== 4} onPress={pay} /></View>
  </Page>;
}
function Field({ label, value, set, numeric }: { label: string; value: string; set: (value: string) => void; numeric?: boolean }) { return <View><Text style={{ color: dark.muted, fontSize: 11, paddingBottom: 5 }}>{label}</Text><TextInput value={value} onChangeText={set} keyboardType={numeric ? 'number-pad' : 'default'} style={{ minHeight: 48, color: dark.text, borderRadius: 10, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surfaceRaised, paddingHorizontal: 12 }} /></View>; }
