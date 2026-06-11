import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, View } from 'react-native';
import { Button, Card, ModePill, Page, ProviderNotice, SectionHeader, StatusPill } from '@/components';
import { dark } from '@/theme';

const steps = ['Business', 'Owners', 'Documents', 'Address', 'Review'];

export default function BusinessScreen() {
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: '', type: '', registration: '', director: '', address: '' });
  const input = (key: keyof typeof form, label: string, placeholder: string) => <View style={{ gap: 6 }}>
    <Text style={{ color: dark.mutedStrong, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    <TextInput value={form[key]} placeholder={placeholder} placeholderTextColor={dark.muted} onChangeText={(value) => setForm({ ...form, [key]: value })} style={{ minHeight: 50, color: dark.text, borderRadius: 12, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surfaceRaised, paddingHorizontal: 13 }} />
  </View>;
  const valid = step === 0 ? Boolean(form.name && form.type && form.registration) : step === 1 ? Boolean(form.director) : step === 3 ? Boolean(form.address) : true;

  return <Page>
    <View><Text style={{ color: dark.text, fontSize: 29, fontWeight: '900' }}>Business account</Text><Text style={{ color: dark.muted, lineHeight: 20, paddingTop: 4 }}>Higher limits, team controls, reports and future API access.</Text></View>
    <ModePill />
    <View style={{ flexDirection: 'row', gap: 5 }}>
      {steps.map((label, index) => <View key={label} style={{ flex: 1, gap: 5 }}><View style={{ height: 4, borderRadius: 2, backgroundColor: index <= step ? dark.green : dark.border }} /><Text numberOfLines={1} style={{ color: index === step ? dark.text : dark.muted, fontSize: 8, textAlign: 'center' }}>{label}</Text></View>)}
    </View>
    <Card tone="green">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Ionicons name="business-outline" color={dark.green} size={23} /><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '900' }}>Unlock business limits</Text><Text style={{ color: dark.mutedStrong, fontSize: 11, lineHeight: 17, paddingTop: 3 }}>Bulk transfers, P2P automation, statements and role-based team access.</Text></View></View>
    </Card>
    <SectionHeader title={`Step ${step + 1} of ${steps.length}`} />
    <Card>
      {step === 0 && <View style={{ gap: 13 }}>{input('name', 'Registered business name', 'Example Ventures Limited')}{input('type', 'Business type', 'Limited company, sole proprietor…')}{input('registration', 'BN or RC number', 'RC 1234567')}</View>}
      {step === 1 && <View style={{ gap: 13 }}>{input('director', 'Director or beneficial owner', 'Full legal name')}<Text style={{ color: dark.muted, fontSize: 11, lineHeight: 18 }}>All directors and beneficial owners above the configured ownership threshold must be verified.</Text></View>}
      {step === 2 && <View style={{ gap: 12 }}><DocumentRow title="CAC certificate" /><DocumentRow title="Company status report" /><DocumentRow title="Director identification" /><ProviderNotice body="Document upload and validation require the configured KYB provider. Demo mode records the checklist only." /></View>}
      {step === 3 && <View style={{ gap: 13 }}>{input('address', 'Registered operating address', 'Street, city and state')}<DocumentRow title="Proof of business address" /></View>}
      {step === 4 && <View style={{ gap: 11 }}><Review label="Business" value={form.name || 'Not provided'} /><Review label="Type" value={form.type || 'Not provided'} /><Review label="Registration" value={form.registration || 'Not provided'} /><Review label="Director" value={form.director || 'Not provided'} /><Review label="Address" value={form.address || 'Not provided'} /><StatusPill label="Draft · not submitted to a provider" tone="warning" /></View>}
    </Card>
    {saved ? <StatusPill label="Application draft saved locally" tone="success" icon="checkmark-circle" /> : null}
    <View style={{ flexDirection: 'row', gap: 9 }}>
      {step > 0 ? <View style={{ flex: 1 }}><Button title="Back" kind="secondary" onPress={() => setStep(step - 1)} /></View> : null}
      <View style={{ flex: 1 }}><Button title={step === steps.length - 1 ? 'Save draft' : 'Continue'} disabled={!valid} onPress={() => step === steps.length - 1 ? setSaved(true) : setStep(step + 1)} /></View>
    </View>
  </Page>;
}

function DocumentRow({ title }: { title: string }) {
  return <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8 }}><View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: dark.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="document-attach-outline" color={dark.cyan} size={20} /></View><View style={{ flex: 1 }}><Text style={{ color: dark.text, fontWeight: '800' }}>{title}</Text><Text style={{ color: dark.muted, fontSize: 10, paddingTop: 2 }}>Required before live submission</Text></View><StatusPill label="Missing" tone="warning" /></View>;
}
function Review({ label, value }: { label: string; value: string }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: dark.border }}><Text style={{ color: dark.muted }}>{label}</Text><Text numberOfLines={2} style={{ color: dark.text, fontWeight: '800', textAlign: 'right', flex: 1 }}>{value}</Text></View>;
}
