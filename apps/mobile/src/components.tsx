import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { dark, radius, spacing } from './theme';

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Card({ children, tone = 'normal' }: { children: ReactNode; tone?: 'normal' | 'green' | 'warning' }) {
  return <View style={[styles.card, tone === 'green' && styles.cardGreen, tone === 'warning' && styles.cardWarning]}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Amount({ children, positive }: { children: ReactNode; positive?: boolean }) {
  return <Text style={[styles.amount, positive && { color: dark.green }]}>{children}</Text>;
}

export function Button({ title, onPress, kind = 'primary', disabled = false }: { title: string; onPress?: () => void; kind?: 'primary' | 'secondary' | 'danger'; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [
      styles.button,
      kind === 'secondary' && styles.buttonSecondary,
      kind === 'danger' && styles.buttonDanger,
      disabled && styles.disabled,
      pressed && { opacity: 0.8 }
    ]}>
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, body, loading = false }: { title: string; body: string; loading?: boolean }) {
  return (
    <View style={styles.empty}>
      {loading && <ActivityIndicator color={dark.green} />}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function formatNaira(value: string | number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(Number(value || 0));
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: dark.background, padding: spacing.md },
  card: { backgroundColor: dark.surface, borderColor: dark.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  cardGreen: { borderColor: dark.green, backgroundColor: dark.greenSoft },
  cardWarning: { borderColor: '#614D1D' },
  label: { color: dark.muted, fontSize: 12 },
  amount: { color: dark.text, fontSize: 28, fontWeight: '800' },
  button: { minHeight: 48, borderRadius: radius.md, backgroundColor: dark.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  buttonSecondary: { backgroundColor: dark.surfaceRaised, borderWidth: 1, borderColor: dark.border },
  buttonDanger: { backgroundColor: dark.red },
  buttonText: { color: dark.white, fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  emptyTitle: { color: dark.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  emptyBody: { color: dark.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' }
});
