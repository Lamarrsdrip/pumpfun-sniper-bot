import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { AppHeader, AssetIcon, IconButton, ModePill, ProviderNotice, SectionHeader, StatusPill, TransactionRow } from '@/components';
import { demoAssets, demoTransactions } from '@/demo';
import { useSession } from '@/store';
import { dark, depth } from '@/theme';
import { api } from '@/api';

export default function WalletScreen() {
  const [account, setAccount] = useState<{ bankName: string; accountName: string; accountNumber: string } | null>(null);
  const [walletAssets, setWalletAssets] = useState(demoAssets);
  const [assetsError, setAssetsError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const { enabledAssets, balancesVisible, setBalancesVisible } = useSession();
  useEffect(() => {
    api<{ account: { bankName: string; accountName: string; accountNumber: string } }>('/v1/virtual-account').then((value) => setAccount(value.account)).catch(() => setAccount(null));
    api<{ assets: Array<{ symbol: string; name: string; balance: number; valueNgn: string; networks: string[] }> }>('/v1/wallet/assets')
      .then((result) => {
        setWalletAssets(result.assets.map((asset) => ({
          ...asset,
          value: Number(asset.valueNgn),
          change: demoAssets.find((item) => item.symbol === asset.symbol)?.change || 0,
          color: demoAssets.find((item) => item.symbol === asset.symbol)?.color || dark.green
        })));
        setAssetsError('');
      })
      .catch(() => setAssetsError('Wallet balances could not be refreshed. The last labelled Demo values remain visible.'));
  }, []);
  const assets = walletAssets.filter((asset) => enabledAssets.includes(asset.symbol));
  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0);
  return <ScrollView style={{ flex: 1, backgroundColor: dark.background }} contentContainerStyle={{ padding: 16, gap: 15, paddingBottom: 54 }} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
    <AppHeader greeting="MemeZo Wallet" title="Money across every network" onNotifications={() => router.push('/notifications')} onProfile={() => router.push('/profile')} unread={2} />
    <ModePill compact />
    <LinearGradient colors={['#152E23', '#0D1B15']} style={{ padding: 19, borderRadius: 18, borderWidth: 1, borderColor: '#345848', gap: 6, boxShadow: depth.raised }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.mutedStrong }}>Total wallet value</Text><Pressable onPress={() => setBalancesVisible(!balancesVisible)}><Ionicons name={balancesVisible ? 'eye-outline' : 'eye-off-outline'} color={dark.textSoft} size={20} /></Pressable></View>
      <Text selectable style={{ color: dark.text, fontSize: 34, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{balancesVisible ? `₦${totalValue.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '₦••••••••'}</Text>
      <Text style={{ color: dark.green, fontWeight: '900' }}>{balancesVisible ? 'Available across enabled assets' : 'Performance hidden'}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14 }}><IconButton icon="add" label="Deposit" onPress={() => router.push('/deposit')} /><IconButton icon="send" label="Send" onPress={() => router.push('/memezo-transfer')} color={dark.cyan} /><IconButton icon="swap-horizontal" label="Swap" onPress={() => router.push('/swap')} color={dark.purple} /><IconButton icon="qr-code-outline" label="Receive" onPress={() => router.push('/crypto-deposit')} color={dark.yellow} /></View>
    </LinearGradient>
    {assetsError ? <ProviderNotice title="Wallet refresh delayed" body={assetsError} /> : null}
    <View style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.muted, fontSize: 10, fontWeight: '900' }}>YOUR NAIRA ACCOUNT</Text><StatusPill label={account ? 'ACTIVE' : 'UNAVAILABLE'} tone={account ? 'success' : 'warning'} /></View>
      {account ? <><Text selectable style={{ color: dark.text, fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{account.accountNumber}</Text><Text style={{ color: dark.muted, fontSize: 11 }}>{account.bankName} · {account.accountName}</Text><Pressable onPress={async () => { await Clipboard.setStringAsync(account.accountNumber); setCopyMessage('Account number copied'); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 }}><Ionicons name="copy-outline" color={dark.cyan} size={16} /><Text style={{ color: dark.cyan, fontWeight: '900' }}>Copy account number</Text></Pressable></> : <ProviderNotice body="Start the MemeZo API for Demo account details. Live virtual accounts require an enabled payment provider." />}
      {copyMessage ? <Text style={{ color: dark.green, fontSize: 11 }}>{copyMessage}</Text> : null}
    </View>
    <SectionHeader title="Your assets" action="Manage" onPress={() => router.push('/manage-assets')} />
    <View style={{ backgroundColor: dark.surface, borderRadius: 14, borderWidth: 1, borderColor: dark.border, paddingHorizontal: 13 }}>
      {assets.map((asset) => <Pressable key={asset.symbol} onPress={() => asset.symbol === 'NGN' ? router.push('/deposit') : router.push('/swap')} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: dark.border }}><AssetIcon symbol={asset.symbol} color={asset.color} /><View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: dark.text, fontWeight: '900' }}>{asset.name}</Text><Text numberOfLines={1} style={{ color: dark.muted, fontSize: 10, marginTop: 3 }}>{asset.networks.slice(0, 3).join(' · ')}</Text></View><View style={{ alignItems: 'flex-end', maxWidth: 118 }}><Text numberOfLines={1} adjustsFontSizeToFit style={{ color: dark.text, fontWeight: '900' }}>{balancesVisible ? `₦${asset.value.toLocaleString()}` : '••••••'}</Text><Text style={{ color: asset.change >= 0 ? dark.green : dark.red, fontSize: 10 }}>{asset.change ? `${asset.change > 0 ? '+' : ''}${asset.change}%` : 'Naira balance'}</Text></View></Pressable>)}
    </View>
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <WalletAction icon="arrow-down-circle-outline" title="Receive crypto" color={dark.green} onPress={() => router.push('/crypto-deposit')} />
      <WalletAction icon="arrow-up-circle-outline" title="Send crypto" color={dark.cyan} onPress={() => router.push('/crypto-withdraw')} />
    </View>
    <SectionHeader title="Recent transactions" action="See all" onPress={() => router.push('/transactions')} />
    <View style={{ backgroundColor: dark.surface, borderRadius: 14, borderWidth: 1, borderColor: dark.border, paddingHorizontal: 13 }}>{demoTransactions.slice(0, 4).map((item) => <TransactionRow key={item.id} item={item} onPress={() => router.push('/transactions')} />)}</View>
  </ScrollView>;
}

function WalletAction({ icon, title, color, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; color: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={{ flex: 1, minHeight: 68, padding: 12, borderRadius: 13, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, flexDirection: 'row', alignItems: 'center', gap: 9 }}><Ionicons name={icon} color={color} size={22} /><Text numberOfLines={2} style={{ color: dark.text, fontSize: 12, fontWeight: '900', flex: 1 }}>{title}</Text></Pressable>;
}
