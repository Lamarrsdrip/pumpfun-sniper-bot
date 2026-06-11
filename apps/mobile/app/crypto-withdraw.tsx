import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { AssetIcon, Button, ModePill, Page, ProviderNotice, SectionHeader } from '@/components';
import { demoAssets } from '@/demo';
import { dark } from '@/theme';

const networkFees: Record<string, number> = { Bitcoin: 0.00008, Ethereum: 0.004, 'BNB Chain': 0.0005, Tron: 1, Solana: 0.00002, Polygon: 0.01, Base: 0.0002, Arbitrum: 0.0002, Optimism: 0.0002, TON: 0.02 };

export default function CryptoWithdraw() {
  const assets = demoAssets.filter((item) => item.symbol !== 'NGN');
  const [asset, setAsset] = useState(assets[0]);
  const [network, setNetwork] = useState(asset.networks[0]);
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const fee = networkFees[network] || 0;
  const chooseAsset = (symbol: string) => { const next = assets.find((item) => item.symbol === symbol) || assets[0]; setAsset(next); setNetwork(next.networks[0]); };
  return <Page>
    <View><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>Send crypto</Text><Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 4 }}>Review the address, network fee and full wallet deduction before approval.</Text></View><ModePill />
    <ProviderNotice body="Live crypto withdrawals require KYC, PIN/biometric approval and an audited custody provider. This screen creates no blockchain transaction." />
    <SectionHeader title="Asset and network" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{assets.map((item) => <Pressable key={item.symbol} onPress={() => chooseAsset(item.symbol)} style={{ padding: 9, borderRadius: 10, backgroundColor: asset.symbol === item.symbol ? dark.greenSoft : dark.surface, borderWidth: 1, borderColor: asset.symbol === item.symbol ? dark.green : dark.border }}><AssetIcon symbol={item.symbol} color={item.color} size={30} /></Pressable>)}</ScrollView>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{asset.networks.map((item) => <Pressable key={item} onPress={() => setNetwork(item)} style={{ paddingHorizontal: 11, paddingVertical: 8, borderRadius: 8, backgroundColor: network === item ? dark.cyan : dark.surface }}><Text style={{ color: network === item ? dark.black : dark.text, fontSize: 10, fontWeight: '900' }}>{item}</Text></Pressable>)}</View>
    <Field label={`${network} wallet address`} value={address} set={setAddress} />
    <Field label={`Amount (${asset.symbol})`} value={amount} set={setAmount} numeric />
    <View style={{ padding: 14, borderRadius: 13, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 10 }}><Line label="Amount" value={`${Number(amount || 0).toFixed(6)} ${asset.symbol}`} /><Line label="Estimated network fee" value={`${fee} ${asset.symbol}`} /><Line label="Total wallet deduction" value={`${(Number(amount || 0) + fee).toFixed(6)} ${asset.symbol}`} /><Line label="Network" value={network} /></View>
    <Field label="Transaction PIN" value={pin} set={setPin} numeric secure />
    {message ? <Text selectable style={{ color: dark.yellow, lineHeight: 18 }}>{message}</Text> : null}
    <Button title="Review withdrawal" disabled={!address || !Number(amount) || pin.length !== 4} onPress={() => setMessage('Demo preview created. No crypto was sent because a live custody provider is not connected.')} />
  </Page>;
}
function Field({ label, value, set, numeric, secure }: { label: string; value: string; set: (value: string) => void; numeric?: boolean; secure?: boolean }) { return <View><Text style={{ color: dark.muted, fontSize: 11, paddingBottom: 6 }}>{label}</Text><TextInput value={value} onChangeText={set} secureTextEntry={secure} keyboardType={numeric ? 'decimal-pad' : 'default'} placeholderTextColor={dark.muted} style={{ minHeight: 50, borderRadius: 12, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, color: dark.text, paddingHorizontal: 14 }} /></View>; }
function Line({ label, value }: { label: string; value: string }) { return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={{ color: dark.muted, flex: 1 }}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={{ color: dark.text, fontWeight: '900', maxWidth: '55%', textAlign: 'right' }}>{value}</Text></View>; }
