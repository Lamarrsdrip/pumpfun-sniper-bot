import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Text, View } from 'react-native';
import { AssetIcon, Button, ModePill, Page } from '@/components';
import { dark } from '@/theme';
export default function CryptoDeposit() {
  const [asset, setAsset] = useState('USDT'); const [copied, setCopied] = useState(false); const address = '9wNairaMemeDemoWallet7fG2pQk4VxSolana';
  return <Page><ModePill /><Text style={{ color: dark.text, fontSize: 27, fontWeight: '900' }}>Receive crypto</Text><Text style={{ color: dark.muted, lineHeight: 20 }}>Select the exact asset and network. Sending on the wrong network can permanently lose funds.</Text>
    <View style={{ flexDirection: 'row', gap: 8 }}>{['USDT', 'USDC', 'SOL'].map(x => <Text key={x} onPress={() => setAsset(x)} style={{ padding: 10, borderRadius: 8, backgroundColor: asset === x ? dark.green : dark.surface, color: asset === x ? '#06110D' : dark.text, fontWeight: '900' }}>{x}</Text>)}</View>
    <View style={{ padding: 18, borderRadius: 16, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, alignItems: 'center', gap: 14 }}><AssetIcon symbol={asset} size={52} /><Text style={{ color: dark.text, fontSize: 18, fontWeight: '900' }}>{asset} on Solana</Text><View style={{ width: 180, height: 180, backgroundColor: dark.white, padding: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>{Array.from({ length: 64 }).map((_, i) => <View key={i} style={{ width: 15, height: 15, backgroundColor: (i * 7 + i % 5) % 3 ? '#08100C' : '#FFF' }} />)}</View><Text selectable style={{ color: dark.cyan, textAlign: 'center', lineHeight: 20 }}>{address}</Text><Button title={copied ? 'Address copied' : 'Copy address'} kind="secondary" onPress={async () => { await Clipboard.setStringAsync(address); setCopied(true); }} /></View>
    <Text style={{ color: dark.yellow, fontSize: 12, lineHeight: 18 }}>Demo address only. Live deposit addresses appear only after audited custody is enabled.</Text>
  </Page>;
}
