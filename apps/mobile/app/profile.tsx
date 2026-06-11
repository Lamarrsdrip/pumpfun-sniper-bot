import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { AssetIcon, ModePill, Page, SectionHeader } from '@/components';
import { dark } from '@/theme';

const rows = [
  { title: 'Security and transaction PIN', detail: 'Biometrics, 2FA and devices', route: '/security' },
  { title: 'Business account', detail: 'KYB, higher limits and reports', route: '/business' },
  { title: 'Transaction history', detail: 'Payments, swaps and receipts', route: '/transactions' },
  { title: 'Help and support', detail: 'Open a support request', route: '/support' }
] as const;

export default function ProfileScreen() {
  const [alerts, setAlerts] = useState(true);
  return <Page>
    <View style={{ flexDirection: 'row', gap: 13, alignItems: 'center' }}><AssetIcon symbol="AN" size={58} /><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontSize: 23, fontWeight: '900' }}>Ada Nwosu</Text><Text style={{ color: dark.muted }}>ada@demo.memezo.ng</Text></View></View>
    <ModePill />
    <View style={{ flexDirection: 'row', gap: 9 }}><Status label="KYC" value="Verified" color={dark.green} /><Status label="Security" value="Strong" color={dark.cyan} /><Status label="Tier" value="2" color={dark.purple} /></View>
    <SectionHeader title="Account" />
    {rows.map((item) => <Pressable key={item.title} onPress={() => router.push(item.route)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: dark.border }}><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '800' }}>{item.title}</Text><Text style={{ color: dark.muted, fontSize: 11, paddingTop: 3 }}>{item.detail}</Text></View><Text style={{ color: dark.muted, fontSize: 20 }}>›</Text></Pressable>)}
    <SectionHeader title="Preferences" />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}><View style={{ flex: 1 }}><Text style={{ color: dark.text }}>Smart alerts</Text><Text style={{ color: dark.muted, fontSize: 11, paddingTop: 3 }}>Payments, account security and watched markets</Text></View><Switch value={alerts} onValueChange={setAlerts} trackColor={{ true: dark.green }} /></View>
    <Text style={{ color: dark.muted, fontSize: 11, lineHeight: 17 }}>Privacy · Terms · Risk disclosures · Delete account through Support · App version 0.3.0</Text>
    <Text style={{ color: dark.yellow, fontSize: 11, lineHeight: 17 }}>Administration is a separate, role-protected web application. It is never exposed in a normal user profile.</Text>
  </Page>;
}

function Status({ label, value, color }: { label: string; value: string; color: string }) {
  return <View style={{ flex: 1, padding: 11, borderRadius: 10, backgroundColor: dark.surface }}><Text style={{ color: dark.muted, fontSize: 9 }}>{label}</Text><Text style={{ color, fontWeight: '900', marginTop: 4 }}>{value}</Text></View>;
}
