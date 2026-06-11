import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { api, ApiError } from '@/api';
import { Button, ModePill, Page, SectionHeader, formatNaira } from '@/components';
import { dark } from '@/theme';

type P2pOrder = { id: string; exchange: string; externalOrderId: string; sellerName: string; bankName: string; accountNumber: string; accountName: string; amountMinor: string; status: string; riskFlags: string[]; createdAt: string };

export default function P2pScreen() {
  const [orders, setOrders] = useState<P2pOrder[]>([]);
  const [mode, setMode] = useState<'MANUAL' | 'HYBRID' | 'FULL_AUTO'>('HYBRID');
  const [message, setMessage] = useState('');
  const load = async () => {
    try { setOrders((await api<{ orders: P2pOrder[] }>('/v1/p2p/orders')).orders); }
    catch { setMessage('P2P orders could not be loaded.'); }
  };
  useEffect(() => { void load(); }, []);
  const decide = async (order: P2pOrder, action: 'approve' | 'reject') => {
    setMessage('');
    try { await api(`/v1/p2p/orders/${order.id}/${action}`, { method: 'POST', body: JSON.stringify({ pin: '1234', idempotencyKey: `mobile-${order.id}-${action}` }) }); setMessage(`Order ${action === 'approve' ? 'paid in Demo Mode' : 'rejected'}.`); await load(); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : 'Order could not be updated.'); }
  };
  return <Page>
    <View><Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>P2P Manager</Text><Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 4 }}>Control merchant payouts without losing track of orders, rules or receipts.</Text></View><ModePill />
    <View style={{ flexDirection: 'row', gap: 7 }}>{(['MANUAL', 'HYBRID', 'FULL_AUTO'] as const).map((item) => <Pressable key={item} onPress={() => { setMode(item); setMessage(`${item.replace('_', ' ')} selected as a local policy preview. Connect the exchange and payout adapters to activate it.`); }} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: mode === item ? dark.green : dark.surface, alignItems: 'center' }}><Text adjustsFontSizeToFit numberOfLines={1} style={{ color: mode === item ? '#04110B' : dark.muted, fontSize: 10, fontWeight: '900' }}>{item.replace('_', ' ')}</Text></Pressable>)}</View>
    <View style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 9 }}><Rule label="Known seller required" /><Rule label="Verified bank account" /><Rule label="Manual approval above ₦500,000" /><Text style={{ color: dark.muted, fontSize: 11 }}>Max order ₦250,000 · Daily payout ₦2,000,000</Text></View>
    <SectionHeader title="Pending orders" action={`${orders.filter((item) => item.status === 'PENDING').length} waiting`} />
    {orders.map((order) => <View key={order.id} style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>{order.sellerName}</Text><Text style={{ color: dark.muted, fontSize: 11 }}>{order.exchange} · {order.externalOrderId}</Text></View><Text style={{ color: dark.green, fontSize: 18, fontWeight: '900' }}>{formatNaira(Number(order.amountMinor) / 100)}</Text></View>
      <Text selectable style={{ color: dark.cyan, fontSize: 12 }}>{order.bankName} · {order.accountNumber}</Text>
      <Text style={{ color: order.riskFlags.length ? dark.yellow : dark.green, fontSize: 11, fontWeight: '800' }}>{order.riskFlags.length ? order.riskFlags.join(' · ') : 'LOW RISK'} · {order.status}</Text>
      {['PENDING', 'REVIEW'].includes(order.status) ? <View style={{ flexDirection: 'row', gap: 9 }}><View style={{ flex: 1 }}><Button title="Approve & pay" disabled={order.riskFlags.length > 0} onPress={() => decide(order, 'approve')} /></View><View style={{ flex: 1 }}><Button title="Reject" kind="secondary" onPress={() => decide(order, 'reject')} /></View></View> : null}
    </View>)}
    {message ? <Text selectable style={{ color: dark.yellow }}>{message}</Text> : null}
    <Text style={{ color: dark.muted, fontSize: 11, lineHeight: 17 }}>Exchange API sync remains disabled until an authenticated provider adapter is configured. Manual order entry and Demo rules remain testable.</Text>
  </Page>;
}
function Rule({ label }: { label: string }) { return <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: dark.text }}>{label}</Text><Switch value disabled trackColor={{ true: dark.green }} /></View>; }
