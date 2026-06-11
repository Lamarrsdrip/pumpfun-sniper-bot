import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button, Page, SectionHeader } from '@/components';
import { dark } from '@/theme';

export default function SupportScreen() {
  const [message, setMessage] = useState(''); const [sent, setSent] = useState(false);
  return <Page><View><Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>Help and support</Text><Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 4 }}>Report a deposit, withdrawal, trade, card, bill or P2P problem.</Text></View>
    <SectionHeader title="New support request" /><TextInput multiline value={message} onChangeText={setMessage} placeholder="Describe what happened and include a transaction reference" placeholderTextColor={dark.muted} style={{ minHeight: 150, color: dark.text, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, borderRadius: 12, padding: 14, textAlignVertical: 'top' }} />{sent ? <Text style={{ color: dark.yellow }}>Draft saved on this device. Connect the support provider before live tickets can be submitted.</Text> : null}<Button title="Save support draft" disabled={message.trim().length < 15} onPress={() => setSent(true)} />
    <View style={{ padding: 14, borderRadius: 12, backgroundColor: dark.surface, gap: 8 }}><Text style={{ color: dark.text, fontWeight: '900' }}>Safety reminder</Text><Text style={{ color: dark.muted, lineHeight: 19 }}>MemeZo support will never ask for your private key, seed phrase, transaction PIN, OTP or card CVV.</Text></View>
  </Page>;
}
