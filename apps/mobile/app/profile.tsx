import { router } from 'expo-router';
import { Pressable, Switch, Text, View } from 'react-native';
import { AssetIcon, Button, ModePill, Page, SectionHeader } from '@/components';
import { dark } from '@/theme';
export default function ProfileScreen() {
  return <Page><View style={{ flexDirection: 'row', gap: 13, alignItems: 'center' }}><AssetIcon symbol="AN" size={58} /><View><Text style={{ color: dark.text, fontSize: 23, fontWeight: '900' }}>Ada Nwosu</Text><Text style={{ color: dark.muted }}>ada@demo.nairameme.ng</Text></View></View><ModePill />
    <View style={{ flexDirection: 'row', gap: 9 }}><Status label="KYC" value="Verified" color={dark.green} /><Status label="Security" value="Strong" color={dark.cyan} /><Status label="Rank" value="Trader" color={dark.purple} /></View>
    <SectionHeader title="Money & security" />{['Transaction PIN', 'Face ID / biometrics', 'Bank accounts', 'Saved crypto addresses'].map((x, i) => <Pressable key={x} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: dark.border }}><Text style={{ color: dark.text }}>{x}</Text><Text style={{ color: i < 2 ? dark.green : dark.muted }}>{i < 2 ? 'Enabled' : 'Manage'} ›</Text></Pressable>)}
    <SectionHeader title="Preferences" /><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}><Text style={{ color: dark.text }}>Smart opportunity alerts</Text><Switch value trackColor={{ true: dark.green }} /></View><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}><Text style={{ color: dark.text }}>Dark appearance</Text><Switch value trackColor={{ true: dark.green }} /></View>
    <Button title="Open Meme Network" kind="secondary" onPress={() => router.push('/network')} /><Button title="Open Admin Mode" kind="secondary" onPress={() => router.push('/admin')} />
    <Text style={{ color: dark.muted, fontSize: 11, lineHeight: 17 }}>Support center · Privacy · Terms · Risk disclosures · App version 0.2.0</Text>
  </Page>;
}
function Status({ label, value, color }: { label: string; value: string; color: string }) { return <View style={{ flex: 1, padding: 11, borderRadius: 10, backgroundColor: dark.surface }}><Text style={{ color: dark.muted, fontSize: 9 }}>{label}</Text><Text style={{ color, fontWeight: '900', marginTop: 4 }}>{value}</Text></View>; }
