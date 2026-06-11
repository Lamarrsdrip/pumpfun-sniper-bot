import { useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AssetIcon, Button, ModePill, Page, ProviderNotice, SectionHeader, StatusPill } from '@/components';
import { demoAssets } from '@/demo';
import { dark } from '@/theme';

const demoAddresses: Record<string, string> = {
  Bitcoin: 'bc1qmemezodemo3u7m9xw4r0s8a2',
  Ethereum: '0x7c9D0DemoMemeZo0A8D83A5B4E11',
  'BNB Chain': '0x7c9D0DemoMemeZo0A8D83A5B4E11',
  Tron: 'TMeMeZoDemo7dK38vF9N2qP4x',
  Solana: '9wMemeZoDemoWallet7fG2pQk4VxSolana',
  Polygon: '0x7c9D0DemoMemeZo0A8D83A5B4E11',
  Base: '0x7c9D0DemoMemeZo0A8D83A5B4E11',
  Arbitrum: '0x7c9D0DemoMemeZo0A8D83A5B4E11',
  Optimism: '0x7c9D0DemoMemeZo0A8D83A5B4E11',
  TON: 'UQD_MemeZoDemoWallet_9Ft0'
};

export default function CryptoDeposit() {
  const cryptoAssets = demoAssets.filter((item) => item.symbol !== 'NGN');
  const [asset, setAsset] = useState(cryptoAssets[0]);
  const [network, setNetwork] = useState(asset.networks[0]);
  const [copied, setCopied] = useState(false);
  const address = useMemo(() => demoAddresses[network] || 'Demo address unavailable', [network]);
  const chooseAsset = (symbol: string) => { const next = cryptoAssets.find((item) => item.symbol === symbol) || cryptoAssets[0]; setAsset(next); setNetwork(next.networks[0]); setCopied(false); };
  return <Page>
    <View><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>Receive crypto</Text><Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 4 }}>Choose the asset and exact network before copying an address.</Text></View>
    <ModePill />
    <ProviderNotice title="Demo address only" body="No live custody address is generated. Live receiving remains disabled until an audited custody provider is connected." />
    <SectionHeader title="1. Choose asset" />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{cryptoAssets.map((item) => <Pressable key={item.symbol} onPress={() => chooseAsset(item.symbol)} style={{ flexDirection: 'row', gap: 7, alignItems: 'center', paddingHorizontal: 11, paddingVertical: 9, borderRadius: 99, backgroundColor: asset.symbol === item.symbol ? dark.greenSoft : dark.surface, borderWidth: 1, borderColor: asset.symbol === item.symbol ? dark.green : dark.border }}><AssetIcon symbol={item.symbol} color={item.color} size={25} /><Text style={{ color: dark.text, fontWeight: '900', fontSize: 11 }}>{item.symbol}</Text></Pressable>)}</ScrollView>
    <SectionHeader title="2. Choose network" />
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{asset.networks.map((item) => <Pressable key={item} onPress={() => { setNetwork(item); setCopied(false); }} style={{ paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, backgroundColor: network === item ? dark.cyan : dark.surface }}><Text style={{ color: network === item ? dark.black : dark.textSoft, fontWeight: '900', fontSize: 11 }}>{item}</Text></Pressable>)}</View>
    <View style={{ padding: 18, borderRadius: 16, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, alignItems: 'center', gap: 14 }}>
      <AssetIcon symbol={asset.symbol} color={asset.color} size={54} />
      <View style={{ alignItems: 'center', gap: 6 }}><Text style={{ color: dark.text, fontSize: 18, fontWeight: '900' }}>{asset.symbol} on {network}</Text><StatusPill label="SIMULATED ADDRESS" tone="warning" /></View>
      <View style={{ width: 190, height: 190, backgroundColor: dark.white, padding: 13, flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>{Array.from({ length: 100 }).map((_, index) => <View key={index} style={{ width: 13, height: 13, backgroundColor: (index * 7 + index % 5) % 3 ? '#08100C' : '#FFF' }} />)}</View>
      <Text selectable style={{ color: dark.cyan, textAlign: 'center', lineHeight: 20 }}>{address}</Text>
      <Button title={copied ? 'Address copied' : 'Copy address'} kind="secondary" icon="copy-outline" onPress={async () => { await Clipboard.setStringAsync(address); setCopied(true); }} />
    </View>
    <View style={{ flexDirection: 'row', gap: 10, padding: 13, borderRadius: 12, backgroundColor: '#21180E', borderWidth: 1, borderColor: '#5A431E' }}><Ionicons name="warning-outline" color={dark.yellow} size={21} /><Text style={{ color: dark.mutedStrong, fontSize: 11, lineHeight: 17, flex: 1 }}>Only send {asset.symbol} using the {network} network. Sending a different asset or network can permanently lose funds.</Text></View>
  </Page>;
}
