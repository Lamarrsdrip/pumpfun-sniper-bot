import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api, ApiError, saveSession } from '@/api';
import { Button, Page } from '@/components';
import { dark } from '@/theme';
const slides = [
  { tag: 'WELCOME TO MEMEZO', title: 'Money, crypto and automation.', body: 'Deposit Naira, make payments, swap crypto and discover meme opportunities.', color: '#20D68F' },
  { tag: 'NAIRA-FIRST WALLET', title: 'Fund like a normal Nigerian app.', body: 'Deposit Naira, buy crypto or memes, and withdraw back to your bank.', color: '#58C7E8' },
  { tag: 'RUNNER AI', title: 'See momentum before it becomes noise.', body: 'Filtered Pump.fun-style signals with clear risk and timing explanations.', color: '#A989FF' },
  { tag: 'AI PAY', title: 'Turn instructions into safe payment drafts.', body: 'Type payment details now, then review the verified recipient before approving.', color: '#F6C85F' }
];
export default function AuthScreen() {
  const [step, setStep] = useState(0); const [identifier, setIdentifier] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const enterDemo = async () => {
    setBusy(true);
    try {
      const result = await api<{ token: string }>('/v1/auth/demo', { method: 'POST', body: JSON.stringify({ userId: 'demo-user-ada' }) });
      await saveSession(result.token, 'DEMO');
      router.replace('/(tabs)');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Demo sign-in failed. Confirm the MemeZo API is running.');
    } finally {
      setBusy(false);
    }
  };
  const startLiveAuth = async () => {
    setBusy(true); setError('');
    try { await api('/v1/auth/start', { method: 'POST', body: JSON.stringify({ identifier }) }); router.push('/kyc'); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Secure sign-in could not start.'); }
    finally { setBusy(false); }
  };
  if (step < slides.length) { const slide = slides[step]; return <LinearGradient colors={['#070B0A', `${slide.color}17`, '#070B0A']} style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}><View style={{ paddingTop: 70 }}><View style={{ width: 62, height: 62, borderRadius: 20, backgroundColor: slide.color, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#06110D', fontSize: 20, fontWeight: '900' }}>MZ</Text></View><Text style={{ color: slide.color, fontSize: 12, fontWeight: '900', marginTop: 34 }}>{slide.tag}</Text><Text style={{ color: dark.text, fontSize: 40, lineHeight: 44, fontWeight: '900', marginTop: 10 }}>{slide.title}</Text><Text style={{ color: dark.muted, fontSize: 16, lineHeight: 24, marginTop: 16 }}>{slide.body}</Text></View><View style={{ gap: 14 }}><View style={{ flexDirection: 'row', gap: 6 }}>{slides.map((_, i) => <View key={i} style={{ height: 4, flex: 1, borderRadius: 2, backgroundColor: i <= step ? slide.color : dark.border }} />)}</View><Button title={step === 3 ? 'Get started' : 'Continue'} onPress={() => setStep(step + 1)} /><Pressable onPress={() => setStep(4)}><Text style={{ color: dark.muted, textAlign: 'center', padding: 6 }}>Skip introduction</Text></Pressable></View></LinearGradient>; }
  return <Page><View style={{ paddingTop: 24 }}><Text style={{ color: dark.green, fontWeight: '900' }}>MEMEZO</Text><Text style={{ color: dark.text, fontSize: 34, fontWeight: '900', marginTop: 8 }}>Welcome back</Text><Text style={{ color: dark.muted, marginTop: 7 }}>Continue with phone or email.</Text></View><TextInput value={identifier} onChangeText={setIdentifier} placeholder="Phone number or email" placeholderTextColor={dark.muted} style={{ minHeight: 54, color: dark.text, backgroundColor: dark.surface, borderColor: dark.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 }} />{error ? <Text selectable style={{ color: dark.red }}>{error}</Text> : null}<Button title={busy ? 'Connecting...' : 'Continue securely'} disabled={busy || identifier.trim().length < 5} onPress={startLiveAuth} /><Button title={busy ? 'Opening demo...' : 'Explore Demo Mode'} kind="secondary" disabled={busy} onPress={enterDemo} /><Text style={{ color: dark.yellow, fontSize: 11, lineHeight: 17 }}>Demo Mode is clearly labelled sample money and simulated execution. Live mode never uses invented balances, tokens, or transactions.</Text></Page>;
}
