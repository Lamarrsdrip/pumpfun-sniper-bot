import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { Button, ModePill, Page } from '@/components';
import { dark } from '@/theme';
export default function BountyDetail() {
  const { id } = useLocalSearchParams<{ id: string }>(); const [link, setLink] = useState(''); const [submitted, setSubmitted] = useState(false);
  const alpha = id === 'research';
  return <Page><ModePill /><Text style={{ color: dark.purple, fontWeight: '900' }}>{alpha ? 'ALPHA HUNTER' : 'FEATURED BOUNTY'}</Text><Text style={{ color: dark.text, fontSize: 27, lineHeight: 33, fontWeight: '900' }}>{alpha ? 'Find the next Nigerian meme community' : 'Create the best Naija Frog launch video'}</Text><Text style={{ color: dark.green, fontSize: 27, fontWeight: '900' }}>{alpha ? '₦150,000' : '₦250,000'}</Text>
    <View style={{ padding: 15, borderRadius: 12, backgroundColor: dark.surface, gap: 10 }}><Text style={{ color: dark.text, fontWeight: '900' }}>What to do</Text><Text style={{ color: dark.muted, lineHeight: 20 }}>{alpha ? 'Document a growing community, its public links, holder momentum, and why it deserves review. Do not promote or coordinate purchases.' : 'Create an original short-form video explaining the community, token risk, and public contract information.'}</Text><Text style={{ color: dark.text, fontWeight: '900' }}>Rules</Text><Text style={{ color: dark.muted, lineHeight: 20 }}>Original work only · No guaranteed-profit claims · No spam or market manipulation · One submission per user.</Text></View>
    <TextInput value={link} onChangeText={setLink} placeholder="Paste your submission link" placeholderTextColor={dark.muted} style={{ minHeight: 52, borderRadius: 10, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surface, color: dark.text, paddingHorizontal: 13 }} />{submitted ? <Text style={{ color: dark.green }}>Submission received for demo review. Status: Pending.</Text> : null}<Button title={submitted ? 'Submission pending' : 'Submit entry'} disabled={!link || submitted} onPress={() => setSubmitted(true)} />
  </Page>;
}
