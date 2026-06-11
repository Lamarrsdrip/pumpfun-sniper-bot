import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Switch, Text, View } from 'react-native';
import { Button, Card, Page, SectionHeader, StatusPill } from '@/components';
import { dark } from '@/theme';

export default function SecurityScreen() {
  const [biometrics, setBiometrics] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [message, setMessage] = useState('');
  return <Page>
    <View><Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>Security center</Text><Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 4 }}>Protect sign-in, payments and every sensitive account change.</Text></View>
    <Card tone="green"><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#163D2C', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="shield-checkmark" color={dark.green} size={25} /></View><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontSize: 18, fontWeight: '900' }}>Strong protection</Text><Text style={{ color: dark.mutedStrong, fontSize: 11, lineHeight: 17, paddingTop: 3 }}>PIN is active and this device is trusted.</Text></View><StatusPill label="Strong" tone="success" /></View></Card>
    <SectionHeader title="Approvals" />
    <Setting title="Biometric approvals" body="Use Face ID or fingerprint after PIN setup." value={biometrics} set={setBiometrics} icon="scan-outline" />
    <Setting title="Two-factor authentication" body="Require a second factor on new devices." value={twoFactor} set={setTwoFactor} icon="key-outline" />
    <SectionHeader title="Trusted devices" action="Review" onPress={() => setMessage('Only this Demo device is active.')} />
    <Card>
      <View style={{ flexDirection: 'row', gap: 11, alignItems: 'center' }}><View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: dark.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="phone-portrait-outline" color={dark.cyan} size={22} /></View><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>This iPhone</Text><Text style={{ color: dark.muted, fontSize: 11, paddingTop: 3 }}>Lagos · active now · Demo session</Text></View><StatusPill label="Trusted" tone="success" /></View>
    </Card>
    <SectionHeader title="Account controls" />
    <Button title="Change transaction PIN" kind="secondary" icon="keypad-outline" onPress={() => setMessage('A verified identity session is required before a Live PIN change.')} />
    <Button title="Sign out other devices" kind="danger" icon="log-out-outline" onPress={() => setMessage('No other active Demo sessions were found.')} />
    {message ? <Card tone="warning"><Text selectable style={{ color: dark.yellow, lineHeight: 18 }}>{message}</Text></Card> : null}
  </Page>;
}
function Setting({ title, body, value, set, icon }: { title: string; body: string; value: boolean; set: (value: boolean) => void; icon: keyof typeof Ionicons.glyphMap }) {
  return <Card><View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: dark.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} color={dark.green} size={20} /></View><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>{title}</Text><Text style={{ color: dark.muted, fontSize: 11, lineHeight: 17, paddingTop: 3 }}>{body}</Text></View><Switch value={value} onValueChange={set} trackColor={{ false: dark.borderStrong, true: dark.greenDeep }} /></View></Card>;
}
