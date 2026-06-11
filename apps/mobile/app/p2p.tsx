import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '@/api';
import { Button, ModePill, Page, ProviderNotice, SectionHeader, StatusPill, formatNaira } from '@/components';
import { dark } from '@/theme';

type P2pOrder = { id: string; exchange: string; externalOrderId: string; sellerName: string; bankName: string; accountNumber: string; accountName: string; amountMinor: string; status: string; riskFlags: string[]; createdAt: string };
const tabs = ['OVERVIEW', 'PENDING', 'PAID', 'FAILED', 'RULES', 'RECEIPTS'] as const;

export default function P2pScreen() {
  const [orders, setOrders] = useState<P2pOrder[]>([]);
  const [mode, setMode] = useState<'MANUAL' | 'HYBRID' | 'FULL_AUTO'>('HYBRID');
  const [tab, setTab] = useState<typeof tabs[number]>('OVERVIEW');
  const [message, setMessage] = useState('');
  const load = async () => { try { setOrders((await api<{ orders: P2pOrder[] }>('/v1/p2p/orders')).orders); } catch { setMessage('P2P orders could not be loaded.'); } };
  useEffect(() => { void load(); }, []);
  const decide = async (order: P2pOrder, action: 'approve' | 'reject') => { setMessage(''); try { await api(`/v1/p2p/orders/${order.id}/${action}`, { method: 'POST', body: JSON.stringify({ pin: '1234', idempotencyKey: `mobile-${order.id}-${action}-${Date.now()}` }) }); setMessage(`Order ${action === 'approve' ? 'paid in Demo Mode' : 'rejected'}.`); await load(); } catch (error) { setMessage(error instanceof ApiError ? error.message : 'Order could not be updated.'); } };
  const pending = orders.filter((item) => ['PENDING', 'REVIEW'].includes(item.status));
  const shown = tab === 'PENDING' ? pending : tab === 'PAID' ? orders.filter((item) => item.status === 'PAID') : tab === 'FAILED' ? orders.filter((item) => item.status === 'FAILED') : orders;
  return <Page>
    <View><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>P2P Manager</Text><Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 4 }}>Automate merchant payouts while risk rules watch every exception.</Text></View><ModePill />
    <View style={{ flexDirection: 'row', gap: 8 }}><Metric label="Paid today" value="₦185k" color={dark.green} /><Metric label="Pending" value={String(pending.length)} color={dark.yellow} /><Metric label="Success" value="98.7%" color={dark.cyan} /></View>
    <View style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 11 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><View><Text style={{ color: dark.text, fontWeight: '900' }}>Automation mode</Text><Text style={{ color: dark.muted, fontSize: 10, paddingTop: 3 }}>Full Auto is capped by your saved rules.</Text></View><StatusPill label={mode.replace('_', ' ')} tone={mode === 'FULL_AUTO' ? 'success' : 'info'} /></View>
      <View style={{ flexDirection: 'row', gap: 7 }}>{(['MANUAL', 'HYBRID', 'FULL_AUTO'] as const).map((item) => <Pressable key={item} onPress={() => { setMode(item); setMessage(`${item.replace('_', ' ')} selected as a Demo policy. Live activation requires exchange and payout adapters.`); }} style={{ flex: 1, paddingVertical: 10, borderRadius: 9, backgroundColor: mode === item ? dark.green : dark.surfaceRaised, alignItems: 'center' }}><Text adjustsFontSizeToFit numberOfLines={1} style={{ color: mode === item ? dark.black : dark.muted, fontSize: 9, fontWeight: '900' }}>{item.replace('_', ' ')}</Text></Pressable>)}</View>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>{tabs.map((item) => <Pressable key={item} onPress={() => setTab(item)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: tab === item ? dark.cyan : dark.surface }}><Text style={{ color: tab === item ? dark.black : dark.muted, fontSize: 9, fontWeight: '900' }}>{item}</Text></Pressable>)}</ScrollView>
    {tab === 'RULES' ? <Rules /> : <>
      <SectionHeader title={tab === 'OVERVIEW' ? 'Latest orders' : `${tab.toLowerCase()} orders`} action={`${shown.length} records`} />
      {shown.map((order) => <View key={order.id} style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: order.riskFlags.length ? '#5A461D' : dark.border, gap: 9 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>{order.sellerName}</Text><Text style={{ color: dark.muted, fontSize: 10, paddingTop: 2 }}>{order.exchange} · {order.externalOrderId}</Text></View><Text style={{ color: dark.green, fontSize: 17, fontWeight: '900' }}>{formatNaira(Number(order.amountMinor) / 100)}</Text></View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text selectable style={{ color: dark.cyan, fontSize: 11 }}>{order.bankName} · ••••{order.accountNumber.slice(-4)}</Text><StatusPill label={order.status} tone={order.status === 'PAID' ? 'success' : order.riskFlags.length ? 'warning' : 'info'} /></View>
        <Text style={{ color: order.riskFlags.length ? dark.yellow : dark.muted, fontSize: 10 }}>{order.riskFlags.length ? `Manual review: ${order.riskFlags.join(' · ')}` : 'Verified bank · known payout pattern'}</Text>
        {['PENDING', 'REVIEW'].includes(order.status) ? <View style={{ flexDirection: 'row', gap: 9 }}><View style={{ flex: 1 }}><Button title="Approve & pay" disabled={order.riskFlags.length > 0} onPress={() => decide(order, 'approve')} /></View><View style={{ flex: 1 }}><Button title="Reject" kind="secondary" onPress={() => decide(order, 'reject')} /></View></View> : null}
      </View>)}
    </>}
    {message ? <Text selectable style={{ color: dark.yellow, lineHeight: 18 }}>{message}</Text> : null}
    <Pressable onPress={() => router.push('/whatsapp')} style={{ flexDirection: 'row', gap: 11, padding: 14, borderRadius: 13, backgroundColor: '#123528' }}><Ionicons name="logo-whatsapp" color="#25D366" size={23} /><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>Merchant alerts on WhatsApp</Text><Text style={{ color: dark.muted, fontSize: 10, paddingTop: 3 }}>Order, failure, low balance and receipt notifications.</Text></View><Ionicons name="chevron-forward" color={dark.muted} size={18} /></Pressable>
    <ProviderNotice body="Exchange sync and automatic live payouts remain unavailable until authenticated provider adapters and webhook reconciliation are enabled." />
  </Page>;
}
function Rules() { return <View style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 14 }}><SectionHeader title="Auto-pay rules" /><Rule label="Verified bank required" value /><Rule label="Known seller required" value /><Rule label="Fraud detection" value /><Rule label="Manual approval above ₦500,000" value /><Line label="Maximum order" value="₦250,000" /><Line label="Daily payout limit" value="₦2,000,000" /><Line label="Available merchant balance" value="₦318,450" /></View>; }
function Rule({ label, value }: { label: string; value: boolean }) { return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: dark.text, flex: 1 }}>{label}</Text><Switch value={value} disabled trackColor={{ true: dark.greenDeep }} /></View>; }
function Line({ label, value }: { label: string; value: string }) { return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.muted }}>{label}</Text><Text style={{ color: dark.text, fontWeight: '900' }}>{value}</Text></View>; }
function Metric({ label, value, color }: { label: string; value: string; color: string }) { return <View style={{ flex: 1, padding: 11, borderRadius: 12, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border }}><Text style={{ color: dark.muted, fontSize: 9 }}>{label}</Text><Text numberOfLines={1} adjustsFontSizeToFit style={{ color, fontSize: 17, fontWeight: '900', paddingTop: 4 }}>{value}</Text></View>; }
