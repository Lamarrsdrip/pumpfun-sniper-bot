import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AssetIcon, Button, ModePill, Page } from '@/components';
import { dark } from '@/theme';
const assets = ['NGN', 'USDT', 'SOL', 'NFROG'];
export default function SwapScreen() {
  const [from, setFrom] = useState('NGN'); const [to, setTo] = useState('USDT'); const [amount, setAmount] = useState('50000'); const [done, setDone] = useState(false);
  const receive = from === 'NGN' ? (Number(amount || 0) / 1570).toFixed(2) : (Number(amount || 0) * 1570).toFixed(2);
  return <Page><ModePill /><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>Swap simply</Text><Text style={{ color: dark.muted }}>A clear quote before anything moves.</Text>
    <View style={{ padding: 17, borderRadius: 16, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 14 }}>
      <AssetBox label="You pay" asset={from} amount={amount} setAmount={setAmount} />
      <Pressable onPress={() => { setFrom(to); setTo(from); }} style={{ alignSelf: 'center', width: 42, height: 42, borderRadius: 15, backgroundColor: dark.green, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>⇅</Text></Pressable>
      <AssetBox label="You receive" asset={to} amount={receive} />
      <Text style={{ color: dark.muted, fontSize: 12 }}>Choose assets</Text><View style={{ flexDirection: 'row', gap: 7 }}>{assets.map(a => <Pressable key={a} onPress={() => a !== from && setTo(a)} style={{ padding: 9, borderRadius: 8, backgroundColor: a === to ? dark.green : dark.surfaceRaised }}><Text style={{ color: a === to ? '#06110D' : dark.text, fontWeight: '800', fontSize: 11 }}>{a}</Text></Pressable>)}</View>
      <Line label="Rate" value="1 USDT = ₦1,570.00" /><Line label="Service + route fee" value="₦325.00" /><Line label="Price impact" value="0.18%" /><Line label="Max slippage" value="1.0%" />
      {done ? <Text style={{ color: dark.green, fontWeight: '800' }}>Demo swap completed. Your Wallet has been updated for this preview session.</Text> : null}
      <Button title={done ? 'Swap completed' : 'Confirm demo swap'} disabled={done} onPress={() => setDone(true)} />
    </View>
  </Page>;
}
function AssetBox({ label, asset, amount, setAmount }: { label: string; asset: string; amount: string; setAmount?: (v: string) => void }) { return <View style={{ padding: 15, borderRadius: 12, backgroundColor: dark.surfaceRaised }}><Text style={{ color: dark.muted, fontSize: 11 }}>{label}</Text><View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 9 }}><AssetIcon symbol={asset} size={36} /><Text style={{ color: dark.text, fontWeight: '900' }}>{asset}</Text><TextInput editable={!!setAmount} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={{ flex: 1, color: dark.text, textAlign: 'right', fontSize: 24, fontWeight: '900' }} /></View></View>; }
function Line({ label, value }: { label: string; value: string }) { return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.muted, fontSize: 12 }}>{label}</Text><Text style={{ color: dark.text, fontSize: 12, fontWeight: '800' }}>{value}</Text></View>; }
