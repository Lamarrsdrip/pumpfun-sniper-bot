import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, ModePill, Page, SectionHeader } from '@/components';
import { dark } from '@/theme';

const bounties = [
  { id: 'video', category: 'Video', title: 'Create the best Naija Frog launch video', sponsor: 'Naija Frog Community', reward: '₦250,000', days: '7 days left', people: 184, color: '#58C7E8' },
  { id: 'research', category: 'Alpha Hunter', title: 'Find the next Nigerian meme community', sponsor: 'NairaMeme Research', reward: '₦150,000', days: '10 days left', people: 92, color: '#A989FF' },
  { id: 'trade', category: 'Competition', title: 'Best risk-adjusted demo portfolio', sponsor: 'NairaMeme', reward: '₦500,000', days: '14 days left', people: 421, color: '#F6C85F' }
];
export default function EarnScreen() {
  return <Page>
    <View><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>Turn attention into income</Text><Text style={{ color: dark.muted, lineHeight: 20, marginTop: 4 }}>Bounties, alpha hunts, and verified competitions.</Text></View><ModePill />
    <LinearGradient colors={['#3B285C', '#19152B']} style={{ padding: 18, borderRadius: 18, gap: 8 }}><Text style={{ color: '#D7C7FF', fontWeight: '800' }}>AVAILABLE REWARDS</Text><Text style={{ color: dark.white, fontSize: 30, fontWeight: '900' }}>₦900,000</Text><Text style={{ color: '#B8ADD0' }}>Across 3 verified campaigns</Text></LinearGradient>
    <Button title="Create a funded bounty" kind="secondary" onPress={() => router.push('/create-bounty')} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>{['Featured', 'Highest rewards', 'Easy tasks', 'My work'].map((x, i) => <View key={x} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: i ? dark.surface : dark.green }}><Text style={{ color: i ? dark.muted : '#06110D', fontWeight: '800', fontSize: 11 }}>{x}</Text></View>)}</ScrollView>
    <SectionHeader title="Featured bounties" />
    {bounties.map(item => <Pressable key={item.id} onPress={() => router.push(`/bounty/${item.id}`)} style={{ padding: 16, backgroundColor: dark.surface, borderRadius: 14, borderWidth: 1, borderColor: dark.border, gap: 10 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: item.color, fontWeight: '900' }}>{item.category}</Text><Text style={{ color: dark.green, fontSize: 17, fontWeight: '900' }}>{item.reward}</Text></View><Text style={{ color: dark.text, fontSize: 17, lineHeight: 22, fontWeight: '900' }}>{item.title}</Text><Text style={{ color: dark.muted, fontSize: 12 }}>{item.sponsor}</Text><View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: dark.yellow, fontSize: 11 }}>{item.days}</Text><Text style={{ color: dark.muted, fontSize: 11 }}>{item.people} participants</Text></View></Pressable>)}
  </Page>;
}
