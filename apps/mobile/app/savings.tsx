import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, ModePill, Page, ProviderNotice, SectionHeader, StatusPill } from '@/components';
import { dark } from '@/theme';

export default function SavingsScreen() {
  return <Page><View><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>Savings</Text><Text style={{ color: dark.muted, paddingTop: 4 }}>Plan goals separately from your everyday balance.</Text></View><ModePill />
    <ProviderNotice title="Savings provider not connected" body="This is a future-ready product surface. No funds are locked and no interest is promised in Demo Mode." />
    <SectionHeader title="Ways to save" />
    <Saving icon="water-outline" title="Flex savings" body="Move money in and out under published terms." />
    <Saving icon="flag-outline" title="Goal savings" body="Save toward rent, travel or business stock." />
    <Saving icon="lock-closed-outline" title="Fixed savings" body="Lock funds for a chosen period after provider activation." />
    <View style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, gap: 8 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.text, fontWeight: '900' }}>Rainy day fund</Text><StatusPill label="PREVIEW" tone="info" /></View><Text style={{ color: dark.muted }}>₦0 of ₦250,000</Text><View style={{ height: 7, backgroundColor: dark.surfaceRaised, borderRadius: 4 }} /><Button title="Create savings goal" disabled /></View>
  </Page>;
}
function Saving({ icon, title, body }: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }) { return <View style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 13, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border }}><Ionicons name={icon} color={dark.green} size={23} /><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>{title}</Text><Text style={{ color: dark.muted, fontSize: 11, lineHeight: 17, paddingTop: 3 }}>{body}</Text></View></View>; }
