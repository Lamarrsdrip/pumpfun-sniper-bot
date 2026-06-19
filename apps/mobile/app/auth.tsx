import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError, saveSession } from '@/api';
import { Button, FormInput, Notice } from '@/components';
import { useSession } from '@/store';
import { dark } from '@/theme';

type View2 = 'home' | 'login' | 'register';

const SLIDES = [
  { icon: 'wallet', color: dark.green, title: 'Your money,\nyour control.', body: 'Deposit Naira, pay bills, swap to crypto — all in one secure place.' },
  { icon: 'send', color: dark.blue, title: 'Send & receive\nin seconds.', body: 'Pay anyone with a phone number or bank account instantly.' },
  { icon: 'compass', color: dark.purple, title: 'Discover the next\nbig token.', body: 'Track trending meme coins with live risk scores and AI analysis.' },
] as const;

export default function AuthScreen() {
  const { setAuthenticated, setMode } = useSession();
  const [view, setView] = useState<View2>('home');
  const [slide, setSlide] = useState(0);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const goDemo = async () => {
    setBusy(true); setError('');
    try {
      const res = await api<{ token: string }>('/v1/auth/demo', { method: 'POST', body: JSON.stringify({ userId: 'demo-user-ada' }) });
      await saveSession(res.token, 'DEMO');
      setAuthenticated(true); setMode('DEMO');
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Demo failed. Make sure the MemeZo API is running.');
    } finally { setBusy(false); }
  };

  const doLogin = async () => {
    if (!identifier.trim()) { setError('Enter your phone or email'); return; }
    if (password.length < 6) { setError('Password must be 6+ characters'); return; }
    setBusy(true); setError('');
    try {
      const res = await api<{ token: string }>('/v1/auth/login', { method: 'POST', body: JSON.stringify({ identifier: identifier.trim(), password }) });
      await saveSession(res.token, 'LIVE');
      setAuthenticated(true); setMode('LIVE');
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Login failed. Check your credentials.');
    } finally { setBusy(false); }
  };

  const doRegister = async () => {
    if (!firstName.trim()) { setError('Enter your first name'); return; }
    if (!email.trim() && !phone.trim()) { setError('Enter your email or phone number'); return; }
    if (regPassword.length < 8) { setError('Password must be 8+ characters'); return; }
    setBusy(true); setError('');
    try {
      const res = await api<{ token: string }>('/v1/auth/register', { method: 'POST', body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() || undefined, phone: phone.trim() || undefined, password: regPassword }) });
      await saveSession(res.token, 'LIVE');
      setAuthenticated(true); setMode('LIVE');
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create account. Try again.');
    } finally { setBusy(false); }
  };

  // ── Landing ────────────────────────────────────────
  if (view === 'home') {
    const s = SLIDES[slide];
    return (
      <View style={st.landingRoot}>
        {/* Slide indicator dots */}
        <View style={st.dots}>
          {SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => setSlide(i)}>
              <View style={[st.dot, i === slide && { width: 20, backgroundColor: s.color }]} />
            </Pressable>
          ))}
        </View>

        {/* Slide icon */}
        <View style={[st.slideIconWrap, { backgroundColor: `${s.color}15` }]}>
          <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={34} color={s.color} />
        </View>

        {/* Text */}
        <Text style={st.slideTitle}>{s.title}</Text>
        <Text style={st.slideBody}>{s.body}</Text>

        {/* Actions */}
        <View style={st.landingActions}>
          <Button title="Create account" onPress={() => setView('register')} />
          <Button title="I already have an account" kind="ghost" onPress={() => setView('login')} />
          <Pressable onPress={goDemo} disabled={busy}>
            <Text style={st.demoLink}>{busy ? 'Loading demo…' : 'Try demo first'}</Text>
          </Pressable>
        </View>

        {/* Slide nav */}
        {slide < SLIDES.length - 1 ? (
          <Pressable style={st.nextBtn} onPress={() => setSlide(slide + 1)}>
            <Ionicons name="chevron-forward" size={20} color={dark.muted} />
          </Pressable>
        ) : null}

        <Text style={st.trustLine}>🔒 Bank-grade encryption · CBN aware</Text>
      </View>
    );
  }

  // ── Login ──────────────────────────────────────────
  if (view === 'login') {
    return (
      <ScrollView style={st.formRoot} contentContainerStyle={st.formContent} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => { setError(''); setView('home'); }} style={{ marginBottom: 28 }}>
          <Ionicons name="arrow-back" size={22} color={dark.muted} />
        </Pressable>

        <View style={st.logoMark}>
          <Text style={st.logoText}>MZ</Text>
        </View>
        <Text style={st.formTitle}>Welcome back</Text>
        <Text style={st.formSub}>Sign in to your MemeZo account</Text>

        <View style={{ gap: 14, marginTop: 28 }}>
          <FormInput label="Phone number or email" value={identifier} onChangeText={setIdentifier} placeholder="+234 800 000 0000 or email" />
          <FormInput label="Password" value={password} onChangeText={setPassword} secure placeholder="Your password" />
        </View>

        <Pressable style={{ alignSelf: 'flex-end', paddingVertical: 4, marginTop: 6 }}>
          <Text style={{ color: dark.green, fontWeight: '700', fontSize: 13 }}>Forgot password?</Text>
        </Pressable>

        {error ? <Notice tone="danger" body={error} /> : null}

        <View style={{ gap: 10, marginTop: 10 }}>
          <Button title="Sign in" onPress={doLogin} busy={busy} disabled={!identifier || !password} />
          <Button title="Try Demo Mode" kind="ghost" onPress={goDemo} disabled={busy} />
        </View>

        <View style={st.switchRow}>
          <Text style={{ color: dark.muted, fontSize: 14 }}>Don't have an account?</Text>
          <Pressable onPress={() => { setError(''); setView('register'); }}>
            <Text style={{ color: dark.green, fontWeight: '700', fontSize: 14 }}> Create one</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  // ── Register ───────────────────────────────────────
  return (
    <ScrollView style={st.formRoot} contentContainerStyle={st.formContent} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => { setError(''); setView('home'); }} style={{ marginBottom: 28 }}>
        <Ionicons name="arrow-back" size={22} color={dark.muted} />
      </Pressable>

      <View style={st.logoMark}>
        <Text style={st.logoText}>MZ</Text>
      </View>
      <Text style={st.formTitle}>Create account</Text>
      <Text style={st.formSub}>Join MemeZo — free to start</Text>

      <View style={{ gap: 14, marginTop: 28 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FormInput label="First name" value={firstName} onChangeText={setFirstName} placeholder="Chidi" />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput label="Last name" value={lastName} onChangeText={setLastName} placeholder="Okafor" />
          </View>
        </View>
        <FormInput label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" hint="For recovery and receipts" />
        <FormInput label="Phone number" value={phone} onChangeText={setPhone} placeholder="+234 800 000 0000" numeric />
        <FormInput label="Password" value={regPassword} onChangeText={setRegPassword} secure placeholder="Min. 8 characters" hint="Use letters, numbers and symbols" />
      </View>

      {error ? <Notice tone="danger" body={error} /> : null}

      <View style={{ gap: 10, marginTop: 10 }}>
        <Button title="Create account" onPress={doRegister} busy={busy} disabled={!firstName || regPassword.length < 8} />
      </View>

      <Text style={st.termsText}>
        By signing up you agree to our{' '}
        <Text style={{ color: dark.green }}>Terms</Text> and{' '}
        <Text style={{ color: dark.green }}>Privacy Policy</Text>.
      </Text>

      <View style={st.switchRow}>
        <Text style={{ color: dark.muted, fontSize: 14 }}>Already have an account?</Text>
        <Pressable onPress={() => { setError(''); setView('login'); }}>
          <Text style={{ color: dark.green, fontWeight: '700', fontSize: 14 }}> Sign in</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  // Landing
  landingRoot: { flex: 1, backgroundColor: dark.background, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 48, justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 40 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: dark.borderStrong },
  slideIconWrap: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  slideTitle: { color: dark.text, fontSize: 36, fontWeight: '800', lineHeight: 44, marginBottom: 12 },
  slideBody: { color: dark.muted, fontSize: 16, lineHeight: 26, marginBottom: 40 },
  landingActions: { gap: 12, marginBottom: 24 },
  demoLink: { color: dark.muted, fontSize: 14, fontWeight: '600', textAlign: 'center', paddingVertical: 8 },
  nextBtn: { position: 'absolute', right: 28, top: '45%', width: 44, height: 44, borderRadius: 22, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, alignItems: 'center', justifyContent: 'center' },
  trustLine: { color: dark.muted, fontSize: 12, textAlign: 'center', marginTop: 16 },

  // Form screens
  formRoot: { flex: 1, backgroundColor: dark.background },
  formContent: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 50, gap: 0 },
  logoMark: { width: 52, height: 52, borderRadius: 16, backgroundColor: dark.green, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoText: { color: dark.black, fontSize: 20, fontWeight: '900' },
  formTitle: { color: dark.text, fontSize: 28, fontWeight: '800' },
  formSub: { color: dark.muted, fontSize: 15, marginTop: 6 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  termsText: { color: dark.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 16 },
});
