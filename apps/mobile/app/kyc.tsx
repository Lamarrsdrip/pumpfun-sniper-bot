import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '@/api';
import { Button, Card, Screen } from '@/components';
import { dark, spacing } from '@/theme';

const steps = ['Verify your phone and email', 'Confirm your identity', 'Set transaction PIN and biometrics', 'Add a Nigerian bank account'];

export default function KycScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const startVerification = async () => {
    setBusy(true);
    try {
      await api('/v1/kyc/session', { method: 'POST' });
      setError('');
      router.replace('/(tabs)');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Identity verification is unavailable.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Screen>
      <Text style={styles.title}>Before money moves, identity comes first.</Text>
      <Text style={styles.body}>KYC level controls your deposit, withdrawal, trading, and copy-trading limits.</Text>
      <Card>
        {steps.map((step, index) => <View key={step} style={styles.step}><Text style={styles.index}>{index + 1}</Text><Text style={styles.stepText}>{step}</Text></View>)}
      </Card>
      <View style={{ flex: 1 }} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={busy ? 'Opening verification...' : 'Start verification'} disabled={busy} onPress={startVerification} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: dark.text, fontSize: 28, lineHeight: 34, fontWeight: '900', marginTop: spacing.lg },
  body: { color: dark.muted, fontSize: 14, lineHeight: 21, marginVertical: spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: dark.border },
  index: { width: 28, height: 28, borderRadius: 14, textAlign: 'center', textAlignVertical: 'center', backgroundColor: dark.greenSoft, color: dark.green, fontWeight: '900' },
  stepText: { color: dark.text, fontWeight: '700', flex: 1 },
  error: { color: dark.red, fontSize: 12, lineHeight: 17, marginBottom: 12 }
});
