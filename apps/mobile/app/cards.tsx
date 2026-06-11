import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, ModePill, Page, SectionHeader } from '@/components';
import { dark } from '@/theme';

export default function CardsScreen() {
  const [frozen, setFrozen] = useState(false);
  const [message, setMessage] = useState('');
  return <Page><View><Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>MemeZo Cards</Text><Text style={{ color: dark.muted, paddingTop: 4 }}>Control online spending from one place.</Text></View><ModePill />
    <LinearGradient colors={['#402C74', '#161A35', '#12342A']} style={{ minHeight: 205, borderRadius: 20, padding: 20, justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.white, fontSize: 18, fontWeight: '900' }}>MemeZo</Text><Text style={{ color: '#D8CEFF', fontWeight: '800' }}>CARD PREVIEW</Text></View>
      <Text style={{ color: dark.white, fontSize: 22, letterSpacing: 2 }}>••••  ••••  ••••  ••••</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#CFD5D1' }}>ISSUER REQUIRED</Text><Text style={{ color: '#CFD5D1' }}>--/--</Text></View>
    </LinearGradient>
    <SectionHeader title="Card controls" />
    <View style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, gap: 14 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><View><Text style={{ color: dark.text, fontWeight: '900' }}>Freeze card</Text><Text style={{ color: dark.muted, fontSize: 11, paddingTop: 3 }}>Available after a card is issued</Text></View><Switch value={frozen} onValueChange={setFrozen} disabled trackColor={{ true: dark.red }} /></View><Line label="Monthly limit" value="Not set" /><Line label="Spent this month" value="$0.00" /><Line label="Card provider" value="Not connected" /></View>
    {message ? <Text selectable style={{ color: dark.yellow }}>{message}</Text> : null}<Button title="Create a virtual card" onPress={() => setMessage('Card creation is unavailable until an approved issuing provider is connected and tested.')} />
    <Text style={{ color: dark.muted, fontSize: 11, lineHeight: 17 }}>No card number or usable balance is generated before an issuing provider confirms creation.</Text>
  </Page>;
}
function Line({ label, value }: { label: string; value: string }) { return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.muted }}>{label}</Text><Text style={{ color: dark.text, fontWeight: '800' }}>{value}</Text></View>; }
