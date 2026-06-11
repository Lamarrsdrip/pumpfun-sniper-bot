import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, ModePill, Page, SectionHeader } from '@/components';
import { dark } from '@/theme';

export default function RewardsScreen() {
  return <Page><View><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>Rewards</Text><Text style={{ color: dark.muted, paddingTop: 4 }}>Cashback and referrals earned through eligible MemeZo activity.</Text></View><ModePill />
    <View style={{ padding: 18, borderRadius: 16, backgroundColor: dark.greenSoft, borderWidth: 1, borderColor: '#2B654B', gap: 6 }}><Text style={{ color: dark.mutedStrong }}>Available Demo rewards</Text><Text style={{ color: dark.green, fontSize: 32, fontWeight: '900' }}>₦1,240.00</Text><Text style={{ color: dark.muted, fontSize: 11 }}>Simulated balance. Live reward rules are configured by operations.</Text></View>
    <SectionHeader title="Invite friends" /><View style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, gap: 10 }}><View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}><Ionicons name="people-outline" color={dark.cyan} size={24} /><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>Your code: ADA-MZ</Text><Text style={{ color: dark.muted, fontSize: 11, paddingTop: 3 }}>Rewards activate only under published campaign rules.</Text></View></View><Button title="Copy invite link" kind="secondary" /></View>
    <SectionHeader title="Reward history" /><Reward title="Bill cashback" value="+₦200" date="Jun 10" /><Reward title="Referral qualified" value="+₦1,000" date="Jun 7" /><Reward title="Card cashback" value="+₦40" date="Jun 5" />
  </Page>;
}
function Reward({ title, value, date }: { title: string; value: string; date: string }) { return <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 13, backgroundColor: dark.surface }}><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>{title}</Text><Text style={{ color: dark.muted, fontSize: 10, paddingTop: 3 }}>{date} · Demo reward</Text></View><Text style={{ color: dark.green, fontWeight: '900' }}>{value}</Text></View>; }
