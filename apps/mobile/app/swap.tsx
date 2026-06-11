import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '@/api';
import { AssetIcon, Button, ModePill, Page, ProviderNotice, StatusPill } from '@/components';
import { demoAssets, type DemoAsset } from '@/demo';
import { dark } from '@/theme';

type WalletAsset = DemoAsset & { enabled?: boolean; swaps?: boolean };
type Quote = {
  id: string;
  fromAsset: string;
  toAsset: string;
  amount: string;
  sourceValueNgn: string;
  rate: string;
  feeNgn: string;
  priceImpactPercent: number;
  slippagePercent: number;
  estimatedReceive: string;
  route: string;
  liquiditySource: string;
  expiresAt: string;
};

export default function SwapScreen() {
  const [assets, setAssets] = useState<WalletAsset[]>(demoAssets.filter((asset) => ['NGN', 'USDT', 'USDC', 'BTC', 'ETH', 'SOL', 'BNB'].includes(asset.symbol)));
  const [from, setFrom] = useState('NGN');
  const [to, setTo] = useState('USDT');
  const [amount, setAmount] = useState('50000');
  const [slippage, setSlippage] = useState('1');
  const [selector, setSelector] = useState<'from' | 'to' | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [receipt, setReceipt] = useState('');

  useEffect(() => {
    api<{ assets: Array<{ symbol: string; name: string; balance: number; valueNgn: string; networks: string[]; swaps: boolean }> }>('/v1/wallet/assets')
      .then((result) => setAssets(result.assets.map((asset) => ({
        ...asset,
        value: Number(asset.valueNgn),
        change: demoAssets.find((item) => item.symbol === asset.symbol)?.change || 0,
        color: demoAssets.find((item) => item.symbol === asset.symbol)?.color || dark.green
      }))))
      .catch(() => undefined);
  }, []);

  const fromAsset = useMemo(() => assets.find((asset) => asset.symbol === from) || assets[0], [assets, from]);
  const toAsset = useMemo(() => assets.find((asset) => asset.symbol === to) || assets[1], [assets, to]);

  const preview = async () => {
    setBusy(true); setMessage(''); setReceipt('');
    try {
      const result = await api<{ quote: Quote }>('/v1/swaps/quote', {
        method: 'POST',
        body: JSON.stringify({ fromAsset: from, toAsset: to, amount: Number(amount), slippagePercent: Number(slippage) })
      });
      setQuote(result.quote);
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'A quote could not be prepared.');
    } finally { setBusy(false); }
  };

  const execute = async () => {
    if (!quote) return;
    setBusy(true); setMessage('');
    try {
      const result = await api<{ receipt: string; warning: string }>('/v1/swaps/execute', {
        method: 'POST',
        body: JSON.stringify({
          fromAsset: from,
          toAsset: to,
          amount: Number(amount),
          slippagePercent: Number(slippage),
          pin,
          idempotencyKey: `mobile-swap-${Date.now()}`
        })
      });
      setReceipt(result.receipt);
      setMessage(result.warning);
      setQuote(null);
      setPin('');
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : 'The swap could not be completed.');
    } finally { setBusy(false); }
  };

  const flip = () => { setFrom(to); setTo(from); setQuote(null); setReceipt(''); };
  return <Page>
    <View>
      <Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>Swap</Text>
      <Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 4 }}>One clear quote across every enabled MemeZo asset.</Text>
    </View>
    <ModePill compact />
    <View style={{ padding: 16, borderRadius: 18, backgroundColor: dark.surface, gap: 12 }}>
      <AssetAmount label="You pay" asset={fromAsset} amount={amount} onAmount={value => { setAmount(value); setQuote(null); }} onSelect={() => setSelector('from')} />
      <Pressable accessibilityLabel="Reverse assets" onPress={flip} style={{ alignSelf: 'center', width: 43, height: 43, borderRadius: 22, backgroundColor: dark.greenDeep, alignItems: 'center', justifyContent: 'center', marginVertical: -3 }}>
        <Ionicons name="swap-vertical" color={dark.white} size={20} />
      </Pressable>
      <AssetAmount label="You receive" asset={toAsset} amount={quote?.estimatedReceive || '—'} onSelect={() => setSelector('to')} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 3 }}>
        <Text style={{ color: dark.muted, fontSize: 12 }}>Maximum slippage</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>{['0.5', '1', '2'].map((value) => <Pressable key={value} onPress={() => { setSlippage(value); setQuote(null); }} style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: slippage === value ? dark.greenSoft : dark.surfaceRaised }}><Text style={{ color: slippage === value ? dark.green : dark.mutedStrong, fontSize: 11, fontWeight: '900' }}>{value}%</Text></Pressable>)}</View>
      </View>
      {!quote ? <Button title="Get quote" icon="swap-horizontal" busy={busy} disabled={!Number(amount) || from === to} onPress={preview} /> : <>
        <View style={{ padding: 13, borderRadius: 12, backgroundColor: dark.surfaceRaised, gap: 9 }}>
          <QuoteLine label="Rate" value={`1 ${from} = ${Number(quote.rate).toLocaleString(undefined, { maximumFractionDigits: 8 })} ${to}`} />
          <QuoteLine label="Liquidity source" value={quote.liquiditySource} />
          <QuoteLine label="Route" value={quote.route} />
          <QuoteLine label="Service + route fee" value={`₦${Number(quote.feeNgn).toLocaleString()}`} />
          <QuoteLine label="Price impact" value={`${quote.priceImpactPercent}%`} />
          <QuoteLine label="Maximum slippage" value={`${quote.slippagePercent}%`} />
          <QuoteLine label="Estimated receive" value={`${quote.estimatedReceive} ${to}`} strong />
        </View>
        <TextInput secureTextEntry value={pin} onChangeText={setPin} maxLength={4} keyboardType="number-pad" placeholder="Transaction PIN · Demo 1234" placeholderTextColor={dark.muted} style={{ minHeight: 50, borderRadius: 11, backgroundColor: dark.surfaceRaised, color: dark.text, paddingHorizontal: 13 }} />
        <Button title={`Confirm ${from} → ${to}`} busy={busy} disabled={pin.length !== 4} onPress={execute} />
        <Button title="Refresh quote" kind="ghost" onPress={preview} />
      </>}
      {receipt ? <View style={{ padding: 13, borderRadius: 12, backgroundColor: '#12382A' }}><Text style={{ color: dark.green, fontWeight: '900' }}>Swap completed in Demo Mode</Text><Text selectable style={{ color: dark.textSoft, paddingTop: 5 }}>{receipt}</Text></View> : null}
      {message ? <Text selectable style={{ color: receipt ? dark.mutedStrong : dark.yellow, lineHeight: 18 }}>{message}</Text> : null}
    </View>
    <ProviderNotice body="Demo swaps post to the isolated MemeZo ledger. Live swaps remain blocked until custody, pricing, signing and settlement providers pass verification." />
    <AssetSelector visible={selector !== null} title={selector === 'from' ? 'Choose asset to pay' : 'Choose asset to receive'} assets={assets.filter((asset) => asset.swaps !== false)} excluded={selector === 'from' ? to : from} onClose={() => setSelector(null)} onSelect={(asset) => { if (selector === 'from') setFrom(asset.symbol); else setTo(asset.symbol); setQuote(null); setReceipt(''); setSelector(null); }} />
  </Page>;
}

function AssetAmount({ label, asset, amount, onAmount, onSelect }: { label: string; asset: WalletAsset; amount: string; onAmount?: (value: string) => void; onSelect: () => void }) {
  return <View style={{ padding: 14, borderRadius: 14, backgroundColor: dark.surfaceRaised, gap: 10 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.muted, fontSize: 11 }}>{label}</Text><Text style={{ color: dark.muted, fontSize: 11 }}>Balance {asset?.balance?.toLocaleString() || '0'}</Text></View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable onPress={onSelect} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }}><AssetIcon symbol={asset?.symbol || '?'} color={asset?.color} size={38} /><View><Text style={{ color: dark.text, fontWeight: '900' }}>{asset?.symbol}</Text><Text numberOfLines={1} style={{ color: dark.muted, fontSize: 9, maxWidth: 105 }}>{asset?.networks?.[0]}</Text></View><Ionicons name="chevron-down" color={dark.muted} size={15} /></Pressable>
      <TextInput editable={Boolean(onAmount)} value={amount} onChangeText={onAmount} keyboardType="decimal-pad" style={{ flex: 1, color: dark.text, textAlign: 'right', fontSize: 24, fontWeight: '900', minWidth: 0 }} />
    </View>
  </View>;
}

function AssetSelector({ visible, title, assets, excluded, onClose, onSelect }: { visible: boolean; title: string; assets: WalletAsset[]; excluded: string; onClose: () => void; onSelect: (asset: WalletAsset) => void }) {
  const [search, setSearch] = useState('');
  const shown = assets.filter((asset) => asset.symbol !== excluded && `${asset.symbol} ${asset.name} ${asset.networks.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  return <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: dark.background, padding: 18, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: dark.text, fontSize: 22, fontWeight: '900' }}>{title}</Text><Pressable onPress={onClose} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: dark.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" color={dark.text} size={21} /></Pressable></View>
      <TextInput value={search} onChangeText={setSearch} placeholder="Search asset or network" placeholderTextColor={dark.muted} style={{ minHeight: 49, borderRadius: 12, backgroundColor: dark.surface, color: dark.text, paddingHorizontal: 14 }} />
      <ScrollView showsVerticalScrollIndicator={false}>{shown.map((asset) => <Pressable key={asset.symbol} onPress={() => onSelect(asset)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: dark.border }}><AssetIcon symbol={asset.symbol} color={asset.color} /><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>{asset.name}</Text><Text numberOfLines={1} style={{ color: dark.muted, fontSize: 10, paddingTop: 3 }}>{asset.networks.join(' · ')}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={{ color: dark.textSoft, fontWeight: '900' }}>{asset.balance.toLocaleString()}</Text><StatusPill label="ROUTE READY" tone="success" /></View></Pressable>)}</ScrollView>
    </View>
  </Modal>;
}

function QuoteLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <View style={{ flexDirection: 'row', gap: 14, justifyContent: 'space-between' }}><Text style={{ color: dark.muted, fontSize: 11 }}>{label}</Text><Text numberOfLines={2} style={{ color: strong ? dark.green : dark.textSoft, fontSize: 11, fontWeight: strong ? '900' : '700', flex: 1, textAlign: 'right' }}>{value}</Text></View>;
}
