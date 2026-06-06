import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button, ModePill, Page } from '@/components';
import { dark } from '@/theme';
export default function CreateBounty() {
  const [form, setForm] = useState({ title: '', reward: '', deadline: '', details: '' }); const [created, setCreated] = useState(false);
  return <Page><ModePill /><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>Fund a clear task</Text><Text style={{ color: dark.muted, lineHeight: 20 }}>Create a bounty for design, content, research, or community work. Rewards are held until approved completion.</Text>
    <Field label="Task title" value={form.title} set={v => setForm({ ...form, title: v })} placeholder="Create 5 original TikTok videos" />
    <Field label="Reward in Naira" value={form.reward} set={v => setForm({ ...form, reward: v })} placeholder="50000" numeric />
    <Field label="Deadline" value={form.deadline} set={v => setForm({ ...form, deadline: v })} placeholder="20 June 2026" />
    <Field label="Requirements and approval rules" value={form.details} set={v => setForm({ ...form, details: v })} placeholder="Explain deliverables, originality rules, and how work will be reviewed." multiline />
    <View style={{ padding: 14, borderRadius: 12, backgroundColor: dark.surface, gap: 8 }}><Text style={{ color: dark.text, fontWeight: '900' }}>Funding preview</Text><Text style={{ color: dark.muted }}>Reward held: ₦{Number(form.reward || 0).toLocaleString()}</Text><Text style={{ color: dark.yellow, fontSize: 11, lineHeight: 17 }}>Demo creation only. Live escrow requires payment custody, dispute rules, identity checks, and legal approval.</Text></View>
    {created ? <Text style={{ color: dark.green }}>Demo bounty draft created and sent for moderation.</Text> : null}<Button title={created ? 'Draft created' : 'Review and create draft'} disabled={created || !form.title || Number(form.reward) < 1000 || !form.details} onPress={() => setCreated(true)} />
  </Page>;
}
function Field({ label, value, set, placeholder, numeric, multiline }: { label: string; value: string; set: (v: string) => void; placeholder: string; numeric?: boolean; multiline?: boolean }) { return <View><Text style={{ color: dark.muted, fontSize: 12, marginBottom: 6 }}>{label}</Text><TextInput value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={dark.muted} keyboardType={numeric ? 'number-pad' : 'default'} multiline={multiline} style={{ minHeight: multiline ? 110 : 50, textAlignVertical: multiline ? 'top' : 'center', borderRadius: 10, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surface, color: dark.text, padding: 13 }} /></View>; }
