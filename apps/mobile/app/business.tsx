import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button, ModePill, Page, SectionHeader } from '@/components';
import { dark } from '@/theme';

export default function BusinessScreen() {
  const [form, setForm] = useState({ name: '', type: '', registration: '', address: '' });
  const [submitted, setSubmitted] = useState(false);
  const field = (key: keyof typeof form, label: string) => <View><Text style={{ color: dark.muted, fontSize: 11, paddingBottom: 5 }}>{label}</Text><TextInput value={form[key]} onChangeText={(value) => setForm({ ...form, [key]: value })} style={{ minHeight: 48, color: dark.text, borderRadius: 10, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surface, paddingHorizontal: 12 }} /></View>;
  return <Page><View><Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>Business account</Text><Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 4 }}>Apply for higher limits, reporting, team access and future APIs.</Text></View><ModePill />
    <SectionHeader title="Business details" />{field('name', 'Registered business name')}{field('type', 'Business type')}{field('registration', 'BN or RC number')}{field('address', 'Registered address')}
    <View style={{ padding: 14, borderRadius: 12, backgroundColor: dark.surface }}><Text style={{ color: dark.text, fontWeight: '900' }}>Documents</Text><Text style={{ color: dark.muted, lineHeight: 19, paddingTop: 5 }}>CAC documents, director identity and proof of address are collected through the configured KYB provider.</Text></View>
    {submitted ? <Text style={{ color: dark.green }}>Application draft saved. No verification status was changed.</Text> : null}<Button title="Save application draft" disabled={!form.name || !form.type || !form.registration} onPress={() => setSubmitted(true)} />
  </Page>;
}
