import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, ModePill, Page, ProviderNotice, SectionHeader, StatusPill, TransactionRow } from '@/components';
import { dark, depth } from '@/theme';

export default function CardsScreen() {
  const [frozen, setFrozen] = useState(false);
  const [online, setOnline] = useState(true);
  const [international, setInternational] = useState(false);
  const [message, setMessage] = useState('');
  const cardReady = false;
  return <Page><View><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>MemeZo Cards</Text><Text style={{ color: dark.muted, paddingTop: 4 }}>Separate online spending from your main balance.</Text></View><ModePill />
    <LinearGradient colors={['#31554A', '#1B2739', '#301F4E']} style={{ minHeight: 214, borderRadius: 20, padding: 20, justifyContent: 'space-between', boxShadow: depth.raised }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.white, fontSize: 19, fontWeight: '900' }}>MemeZo</Text><StatusPill label="PREVIEW" tone="warning" /></View>
      <View><Text style={{ color: '#C8D7D0', fontSize: 10 }}>AVAILABLE CARD BALANCE</Text><Text style={{ color: dark.white, fontSize: 25, fontWeight: '900', paddingTop: 4 }}>$0.00</Text></View>
      <Text style={{ color: dark.white, fontSize: 21, letterSpacing: 2 }}>••••  ••••  ••••  ••••</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: '#CFD5D1' }}>ADA NWOSU</Text><Text style={{ color: '#CFD5D1' }}>--/--</Text></View>
    </LinearGradient>
    <ProviderNotice title="Card issuer not connected" body="No card number, balance or card transaction exists until an approved issuing provider confirms creation." />
    <View style={{ flexDirection: 'row', gap: 10 }}><CardAction icon="add-circle-outline" label="Top up" disabled /><CardAction icon="arrow-down-circle-outline" label="Withdraw" disabled /><CardAction icon="refresh-outline" label="Reissue" disabled /></View>
    <SectionHeader title="Card controls" />
    <View style={{ padding: 15, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 15 }}>
      <Toggle title="Freeze card" body="Temporarily stop all card spending" value={frozen} set={setFrozen} disabled={!cardReady} />
      <Toggle title="Online payments" body="Allow ecommerce transactions" value={online} set={setOnline} disabled={!cardReady} />
      <Toggle title="International payments" body="Allow merchants outside Nigeria" value={international} set={setInternational} disabled={!cardReady} />
      <Line label="Monthly spending limit" value="Not set" /><Line label="Merchant controls" value="Standard" /><Line label="Issuer" value="Not connected" />
    </View>
    {message ? <Text selectable style={{ color: dark.yellow }}>{message}</Text> : null}
    <Button title="Create virtual card" onPress={() => setMessage('Card creation remains unavailable until the card provider passes a live health check.')} />
    <SectionHeader title="Card activity" />
    <TransactionRow item={{ title: 'No issued card yet', detail: 'Transactions appear after provider confirmation', amount: '$0.00', time: '—', status: 'UNAVAILABLE', kind: 'card' }} />
  </Page>;
}
function Toggle({ title, body, value, set, disabled }: { title: string; body: string; value: boolean; set: (value: boolean) => void; disabled?: boolean }) { return <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>{title}</Text><Text style={{ color: dark.muted, fontSize: 10, paddingTop: 3 }}>{body}</Text></View><Switch value={value} onValueChange={set} disabled={disabled} trackColor={{ true: dark.greenDeep }} /></View>; }
function Line({ label, value }: { label: string; value: string }) { return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.muted }}>{label}</Text><Text style={{ color: dark.text, fontWeight: '900' }}>{value}</Text></View>; }
function CardAction({ icon, label, disabled }: { icon: keyof typeof Ionicons.glyphMap; label: string; disabled?: boolean }) { return <Pressable disabled={disabled} style={{ flex: 1, alignItems: 'center', gap: 6, opacity: disabled ? 0.42 : 1 }}><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: dark.surface, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} color={dark.green} size={21} /></View><Text style={{ color: dark.text, fontSize: 10, fontWeight: '800' }}>{label}</Text></Pressable>; }
