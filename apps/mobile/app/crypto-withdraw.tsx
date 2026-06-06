import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button, ModePill, Page } from '@/components';
import { dark } from '@/theme';
export default function CryptoWithdraw() {
  const [address, setAddress] = useState(''); const [amount, setAmount] = useState(''); const [message, setMessage] = useState('');
  return <Page><ModePill /><Text style={{ color: dark.text, fontSize: 27, fontWeight: '900' }}>Send crypto</Text><Text style={{ color: dark.muted }}>USDT · Solana network</Text><Field label="Wallet address" value={address} set={setAddress} /><Field label="Amount USDT" value={amount} set={setAmount} numeric /><View style={{ padding: 14, borderRadius: 12, backgroundColor: dark.surface, gap: 9 }}><Line label="Network fee" value="0.02 USDT" /><Line label="You receive" value={`${Math.max(0, Number(amount || 0) - .02).toFixed(2)} USDT`} /><Line label="Status" value="Demo preview" /></View>{message ? <Text style={{ color: dark.green }}>{message}</Text> : null}<Button title="Review demo withdrawal" disabled={!address || !Number(amount)} onPress={() => setMessage('Preview created. Live withdrawals require PIN, KYC, and an audited custody provider.')} /></Page>;
}
function Field({ label, value, set, numeric }: { label: string; value: string; set: (v: string) => void; numeric?: boolean }) { return <View><Text style={{ color: dark.muted, fontSize: 12, marginBottom: 6 }}>{label}</Text><TextInput value={value} onChangeText={set} keyboardType={numeric ? 'decimal-pad' : 'default'} style={{ minHeight: 50, borderRadius: 12, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, color: dark.text, paddingHorizontal: 14 }} /></View>; }
function Line({ label, value }: { label: string; value: string }) { return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.muted }}>{label}</Text><Text style={{ color: dark.text, fontWeight: '800' }}>{value}</Text></View>; }
