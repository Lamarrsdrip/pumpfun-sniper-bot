import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api, ApiError, saveSession } from '@/api';
import { Button, FormInput, Notice, TrustStripe } from '@/components';
import { useSession } from '@/store';
import { dark, spacing } from '@/theme';

const slides = [
  {
    tag: 'NAIRA-FIRST WALLET',
    title: 'Your Naira.\nYour Crypto.\nOne app.',
    body: 'Deposit Naira, swap to crypto, discover meme tokens, and withdraw back to your bank — all in one trusted place.',
    color: '#22D98F',
    icon: 'wallet',
  },
  {
    tag: 'INSTANT PAYMENTS',
    title: 'Send and receive money in seconds.',
    body: 'Pay friends, split bills, and transfer Naira to any Nigerian bank instantly. AI Pay helps you send money safely.',
    color: '#5BC8EB',
    icon: 'send',
  },
  {
    tag: 'MEME TOKEN DISCOVERY',
    title: 'Find the next gem before the crowd.',
    body: 'Scan trending meme tokens across Solana, Base, and Ethereum with live risk scoring and AI-powered analysis.',
    color: '#B49AFF',
    icon: 'compass',
  },
  {
    tag: 'BANK-GRADE SECURITY',
    title: 'Your money is protected 24/7.',
    body: 'PIN, biometrics, and device trust protect every action. Admin approval gates protect every withdrawal.',
    color: '#F3C969',
    icon: 'shield-checkmark',
  },
] as const;

type AuthView = 'slides' | 'login' | 'register';

export default function AuthScreen() {
  const { setAuthenticated, setMode } = useSession();
  const [view, setView] = useState<AuthView>('slides');
  const [slide, setSlide] = useState(0);

  // Login form
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  // Register form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const goDemo = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await api<{ token: string }>('/v1/auth/demo', {
        method: 'POST',
        body: JSON.stringify({ userId: 'demo-user-1' }),
      });
      await saveSession(result.token, 'DEMO');
      setAuthenticated(true);
      setMode('DEMO');
      router.replace('/(tabs)');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Demo sign-in failed. Ensure the MemeZo API is running.');
    } finally {
      setBusy(false);
    }
  };

  const doLogin = async () => {
    if (identifier.trim().length < 5) { setError('Enter a valid phone number or email'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setBusy(true); setError('');
    try {
      const result = await api<{ token: string }>('/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      await saveSession(result.token, 'LIVE');
      setAuthenticated(true);
      setMode('LIVE');
      router.replace('/(tabs)');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Sign-in failed. Check your credentials and try again.');
    } finally {
      setBusy(false);
    }
  };

  const doRegister = async () => {
    if (!firstName.trim()) { setError('Enter your first name'); return; }
    if (!email.trim() && !phone.trim()) { setError('Enter your email or phone number'); return; }
    if (regPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    setBusy(true); setError('');
    try {
      const result = await api<{ token: string }>('/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          password: regPassword,
        }),
      });
      await saveSession(result.token, 'LIVE');
      setAuthenticated(true);
      setMode('LIVE');
      router.replace('/(tabs)');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not create account. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── Onboarding slides ─────────────────────────────────
  if (view === 'slides') {
    const s = slides[slide];
    return (
      <LinearGradient colors={['#060D09', `${s.color}18`, '#060D09']} style={{ flex: 1 }}>
        <View style={st.slideTop}>
          <View style={[st.slideMark, { backgroundColor: `${s.color}22`, borderColor: `${s.color}40` }]}>
            <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} color={s.color} size={30} />
          </View>
          <Text style={[st.slideTag, { color: s.color }]}>{s.tag}</Text>
          <Text style={st.slideTitle}>{s.title}</Text>
          <Text style={st.slideBody}>{s.body}</Text>
        </View>

        <View style={st.slideBottom}>
          {/* Progress dots */}
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
            {slides.map((_, i) => (
              <Pressable key={i} onPress={() => setSlide(i)}>
                <View style={[st.dot, i === slide && { width: 22, backgroundColor: s.color }, { borderColor: s.color }]} />
              </Pressable>
            ))}
          </View>

          <View style={{ gap: 10 }}>
            {slide < slides.length - 1 ? (
              <>
                <Button title="Continue" onPress={() => setSlide(slide + 1)} />
                <Pressable onPress={() => setView('login')}>
                  <Text style={st.skip}>I already have an account</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Button title="Create my account" onPress={() => setView('register')} />
                <Button title="Sign in" kind="ghost" onPress={() => setView('login')} />
                <Button title="Try Demo Mode" kind="outline" onPress={goDemo} busy={busy} />
              </>
            )}
          </View>
          <TrustStripe />
        </View>
      </LinearGradient>
    );
  }

  // ── Login ─────────────────────────────────────────────
  if (view === 'login') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: dark.background }} contentContainerStyle={st.formPage} keyboardShouldPersistTaps="handled">
        <View style={st.formHeader}>
          <Pressable onPress={() => setView('slides')} style={{ marginBottom: 24 }}>
            <Ionicons name="arrow-back" color={dark.muted} size={22} />
          </Pressable>
          <View style={st.logoMark}><Text style={st.logoText}>MZ</Text></View>
          <Text style={st.formTitle}>Welcome back</Text>
          <Text style={st.formSub}>Sign in to your MemeZo account</Text>
        </View>

        <View style={{ gap: 14 }}>
          <FormInput
            label="Phone number or email"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="+234 800 000 0000 or you@email.com"
            hint="We'll never share your contact details"
          />
          <FormInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secure
            placeholder="Your secure password"
          />
        </View>

        <Pressable onPress={() => {}} style={{ alignSelf: 'flex-end', paddingVertical: 4 }}>
          <Text style={{ color: dark.green, fontWeight: '800', fontSize: 13 }}>Forgot password?</Text>
        </Pressable>

        {error ? <Notice tone="danger" body={error} /> : null}

        <View style={{ gap: 10, marginTop: 4 }}>
          <Button
            title={busy ? 'Signing in...' : 'Sign in'}
            onPress={doLogin}
            busy={busy}
            disabled={!identifier.trim() || !password}
          />
          <Button title="Try Demo Mode" kind="ghost" onPress={goDemo} disabled={busy} />
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, paddingTop: 8 }}>
          <Text style={{ color: dark.muted, fontSize: 13 }}>Don't have an account?</Text>
          <Pressable onPress={() => { setError(''); setView('register'); }}>
            <Text style={{ color: dark.green, fontWeight: '900', fontSize: 13 }}>Create one</Text>
          </Pressable>
        </View>

        <Notice
          tone="info"
          body="Demo Mode uses simulated money and is clearly labelled throughout the app. Live Mode never invents balances."
        />
      </ScrollView>
    );
  }

  // ── Register ──────────────────────────────────────────
  return (
    <ScrollView style={{ flex: 1, backgroundColor: dark.background }} contentContainerStyle={st.formPage} keyboardShouldPersistTaps="handled">
      <View style={st.formHeader}>
        <Pressable onPress={() => setView('slides')} style={{ marginBottom: 24 }}>
          <Ionicons name="arrow-back" color={dark.muted} size={22} />
        </Pressable>
        <View style={st.logoMark}><Text style={st.logoText}>MZ</Text></View>
        <Text style={st.formTitle}>Create your account</Text>
        <Text style={st.formSub}>Join millions building wealth with MemeZo</Text>
      </View>

      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FormInput label="First name" value={firstName} onChangeText={setFirstName} placeholder="Ada" />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput label="Last name" value={lastName} onChangeText={setLastName} placeholder="Nwosu" />
          </View>
        </View>
        <FormInput
          label="Email address"
          value={email}
          onChangeText={setEmail}
          placeholder="ada@example.com"
          hint="For account recovery and notifications"
        />
        <FormInput
          label="Phone number (optional)"
          value={phone}
          onChangeText={setPhone}
          placeholder="+234 800 000 0000"
          numeric
        />
        <FormInput
          label="Password"
          value={regPassword}
          onChangeText={setRegPassword}
          secure
          placeholder="Min. 8 characters"
          hint="Use letters, numbers and symbols for a strong password"
        />
      </View>

      {error ? <Notice tone="danger" body={error} /> : null}

      <Button
        title={busy ? 'Creating account...' : 'Create account'}
        onPress={doRegister}
        busy={busy}
        disabled={!firstName.trim() || regPassword.length < 8}
      />

      <Text style={st.terms}>
        By creating an account you agree to our{' '}
        <Text style={{ color: dark.green }}>Terms of Service</Text>
        {' '}and{' '}
        <Text style={{ color: dark.green }}>Privacy Policy</Text>.
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 5 }}>
        <Text style={{ color: dark.muted, fontSize: 13 }}>Already have an account?</Text>
        <Pressable onPress={() => { setError(''); setView('login'); }}>
          <Text style={{ color: dark.green, fontWeight: '900', fontSize: 13 }}>Sign in</Text>
        </Pressable>
      </View>

      <TrustStripe />
    </ScrollView>
  );
}

const st = StyleSheet.create({
  slideTop: { flex: 1, paddingHorizontal: 26, paddingTop: 80, gap: 16 },
  slideMark: { width: 70, height: 70, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  slideTag: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginTop: 8 },
  slideTitle: { color: dark.text, fontSize: 36, lineHeight: 42, fontWeight: '900' },
  slideBody: { color: dark.muted, fontSize: 15, lineHeight: 24 },
  slideBottom: { paddingHorizontal: 26, paddingBottom: 44, gap: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'transparent', borderWidth: 1.5 },
  skip: { color: dark.muted, textAlign: 'center', fontSize: 13, padding: 4 },

  formPage: { paddingHorizontal: spacing.md, paddingTop: 56, gap: 18, paddingBottom: 44 },
  formHeader: { gap: 6, marginBottom: 8 },
  logoMark: { width: 52, height: 52, borderRadius: 16, backgroundColor: dark.green, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { color: '#030C07', fontSize: 18, fontWeight: '900' },
  formTitle: { color: dark.text, fontSize: 30, fontWeight: '900' },
  formSub: { color: dark.muted, fontSize: 14, marginTop: 4 },
  terms: { color: dark.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' },
});
