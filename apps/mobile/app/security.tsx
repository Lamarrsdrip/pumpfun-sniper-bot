import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Button, Page, SectionHeader } from '@/components';
import { dark } from '@/theme';

export default function SecurityScreen() {
  const [biometrics, setBiometrics] = useState(true); const [twoFactor, setTwoFactor] = useState(false); const [message, setMessage] = useState('');
  return <Page><View><Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>Security</Text><Text style={{ color: dark.muted, paddingTop: 4 }}>Protect sign-in and every sensitive money action.</Text></View>
    <SectionHeader title="Approvals" /><Setting title="Biometric approvals" body="Use Face ID or fingerprint after PIN setup." value={biometrics} set={setBiometrics} /><Setting title="Two-factor authentication" body="Require a second factor on new devices." value={twoFactor} set={setTwoFactor} />
    <SectionHeader title="Sessions" /><View style={{ padding: 14, borderRadius: 12, backgroundColor: dark.surface, gap: 6 }}><Text style={{ color: dark.text, fontWeight: '900' }}>This iPhone · Active now</Text><Text style={{ color: dark.muted, fontSize: 11 }}>Lagos, Nigeria · Expo preview session</Text></View>
    <Button title="Change transaction PIN" kind="secondary" onPress={() => setMessage('PIN reset requires a verified identity session. The production identity provider is not connected yet.')} /><Button title="Sign out other devices" kind="danger" onPress={() => setMessage('No other active Demo sessions were found.')} />
    {message ? <Text selectable style={{ color: dark.yellow, lineHeight: 18 }}>{message}</Text> : null}
  </Page>;
}
function Setting({ title, body, value, set }: { title: string; body: string; value: boolean; set: (value: boolean) => void }) { return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: dark.surface }}><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>{title}</Text><Text style={{ color: dark.muted, fontSize: 11, lineHeight: 17, paddingTop: 3 }}>{body}</Text></View><Switch value={value} onValueChange={set} trackColor={{ true: dark.green }} /></View>; }
