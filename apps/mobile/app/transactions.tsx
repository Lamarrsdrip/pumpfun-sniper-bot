import { Text, View } from 'react-native';
import { ModePill, Page, SectionHeader } from '@/components';
import { demoTransactions } from '@/demo';
import { dark } from '@/theme';

export default function TransactionsScreen() {
  return <Page><View><Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>Transaction history</Text><Text style={{ color: dark.muted, paddingTop: 4 }}>Money movement, crypto, swaps and automation receipts.</Text></View><ModePill /><SectionHeader title="Recent" />
    {demoTransactions.map((item, index) => <View key={`${item.title}-${index}`} style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 12, backgroundColor: dark.surface }}><View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: item.amount.startsWith('+') ? '#123A2B' : '#312A17', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: item.amount.startsWith('+') ? dark.green : dark.yellow, fontWeight: '900' }}>{item.amount.startsWith('+') ? '↓' : '↑'}</Text></View><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '800' }}>{item.title}</Text><Text style={{ color: dark.muted, fontSize: 11, paddingTop: 3 }}>{item.detail} · {item.time}</Text></View><Text style={{ color: item.amount.startsWith('+') ? dark.green : dark.text, fontWeight: '900' }}>{item.amount}</Text></View>)}
  </Page>;
}
