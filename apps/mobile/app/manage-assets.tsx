import { Switch, Text, View } from 'react-native';
import { AssetIcon, ModePill, Page, ProviderNotice } from '@/components';
import { demoAssets } from '@/demo';
import { useSession } from '@/store';
import { dark } from '@/theme';

export default function ManageAssetsScreen() {
  const { enabledAssets, toggleAsset } = useSession();
  return <Page>
    <View><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>Manage assets</Text><Text style={{ color: dark.muted, lineHeight: 19, paddingTop: 4 }}>Choose which balances appear in your wallet. This does not move or delete funds.</Text></View>
    <ModePill />
    <ProviderNotice title="Demo asset catalogue" body="Prices and balances below are simulated. Live assets come from custody and market providers selected by MemeZo operations." />
    {demoAssets.map((asset) => <View key={asset.symbol} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 13, borderRadius: 13, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border }}><AssetIcon symbol={asset.symbol} color={asset.color} /><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>{asset.name}</Text><Text numberOfLines={2} style={{ color: dark.muted, fontSize: 10, paddingTop: 3 }}>{asset.networks.join(' · ')}</Text></View><Switch value={enabledAssets.includes(asset.symbol)} onValueChange={() => toggleAsset(asset.symbol)} disabled={asset.symbol === 'NGN'} trackColor={{ true: dark.greenDeep }} /></View>)}
  </Page>;
}
