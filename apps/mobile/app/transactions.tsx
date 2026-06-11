import { useState } from 'react';
import { Text, View } from 'react-native';
import { Card, ModePill, Page, SectionHeader, StatusPill, TransactionRow } from '@/components';
import { demoTransactions } from '@/demo';
import { dark } from '@/theme';

const filters = ['All', 'Money', 'Crypto', 'Bills', 'Cards'];

export default function TransactionsScreen() {
  const [filter, setFilter] = useState('All');
  const [receipt, setReceipt] = useState<(typeof demoTransactions)[number] | null>(null);
  const visible = demoTransactions.filter((item) => filter === 'All' || (filter === 'Money' && ['deposit', 'transfer'].includes(item.kind)) || item.kind === filter.toLowerCase().replace(/s$/, ''));
  return <Page>
    <View><Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>Transactions</Text><Text style={{ color: dark.muted, paddingTop: 4 }}>Money movement, crypto, bills, cards and automation receipts.</Text></View>
    <ModePill />
    <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>{filters.map((item) => <Text key={item} onPress={() => setFilter(item)} style={{ color: filter === item ? dark.background : dark.mutedStrong, backgroundColor: filter === item ? dark.green : dark.surface, borderWidth: 1, borderColor: filter === item ? dark.green : dark.border, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8, fontSize: 11, fontWeight: '800', overflow: 'hidden' }}>{item}</Text>)}</View>
    {receipt ? <Card tone={receipt.status === 'FAILED' ? 'danger' : receipt.status === 'PENDING' ? 'warning' : 'green'}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><View style={{ flex: 1 }}><Text style={{ color: dark.muted, fontSize: 11 }}>Receipt</Text><Text style={{ color: dark.text, fontSize: 20, fontWeight: '900', paddingTop: 3 }}>{receipt.title}</Text></View><StatusPill label={receipt.status} tone={receipt.status === 'SUCCESSFUL' ? 'success' : receipt.status === 'PENDING' ? 'warning' : 'info'} /></View>
      <Receipt label="Reference" value={receipt.id} /><Receipt label="Counterparty" value={receipt.detail} /><Receipt label="Amount" value={receipt.amount} /><Receipt label="Time" value={receipt.time} />
      <Text onPress={() => setReceipt(null)} style={{ color: dark.green, fontWeight: '900', textAlign: 'center', paddingTop: 5 }}>Close receipt</Text>
    </Card> : null}
    <SectionHeader title="Recent activity" />
    <Card>{visible.map((item) => <TransactionRow key={item.id} item={item} onPress={() => setReceipt(item)} />)}</Card>
    <Text style={{ color: dark.muted, textAlign: 'center', fontSize: 11, lineHeight: 17 }}>Tap a transaction to view its receipt. Demo receipts are simulated and clearly isolated from Live records.</Text>
  </Page>;
}
function Receipt({ label, value }: { label: string; value: string }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingTop: 10 }}><Text style={{ color: dark.muted }}>{label}</Text><Text selectable style={{ color: dark.text, fontWeight: '800', maxWidth: '65%', textAlign: 'right' }}>{value}</Text></View>;
}
