import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { api, ApiError, saveSession } from '@/api';
import { Button, Card, Screen } from '@/components';
import { dark, spacing } from '@/theme';

export default function AuthScreen() {
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const continueSecurely = async () => {
    setBusy(true);
    try {
      await api('/v1/auth/start', { method: 'POST', body: JSON.stringify({ identifier }) });
      setError('');
      router.push('/kyc');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Authentication service unavailable.');
    } finally {
      setBusy(false);
    }
  };
  const enterDemo = async () => {
    setBusy(true);
    try {
      const result = await api<{ token: string }>('/v1/auth/demo', { method: 'POST', body: JSON.stringify({ userId: 'demo-user-ada' }) });
      await saveSession(result.token, 'DEMO');
      router.replace('/(tabs)');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Demo sign-in is unavailable.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Trade memes without learning crypto first.</Text>
        <Text style={styles.body}>Fund with Naira, understand the risk, and decide manually or enable Auto Sniper later.</Text>
      </View>
      <Card>
        <Text style={styles.cardTitle}>Continue with phone or email</Text>
        <TextInput value={identifier} onChangeText={setIdentifier} placeholder="Phone number or email" placeholderTextColor={dark.muted} style={styles.input} autoCapitalize="none" keyboardType="email-address" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={busy ? 'Checking provider...' : 'Continue securely'} disabled={busy || identifier.trim().length < 5} onPress={continueSecurely} />
        <Button title="Explore Demo Mode" kind="secondary" disabled={busy} onPress={enterDemo} />
        <Text style={styles.demo}>Demo Mode uses clearly labelled sample money and market activity. Nothing is charged or sent to a blockchain.</Text>
        <Text style={styles.legal}>By continuing, you agree to identity checks, trading risk disclosures, and the platform terms. Meme coins can lose most or all of their value.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, justifyContent: 'center', gap: spacing.md },
  title: { color: dark.text, fontSize: 36, lineHeight: 41, fontWeight: '900' },
  body: { color: dark.muted, fontSize: 16, lineHeight: 24 },
  cardTitle: { color: dark.text, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  input: { minHeight: 50, color: dark.text, backgroundColor: dark.surfaceRaised, borderColor: dark.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, marginBottom: 12 },
  error: { color: dark.red, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  legal: { color: dark.muted, fontSize: 11, lineHeight: 16, marginTop: 12 }
  ,demo: { color: dark.yellow, fontSize: 11, lineHeight: 16, marginTop: 10 }
});
