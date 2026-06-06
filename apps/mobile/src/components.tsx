import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { dark, radius, spacing } from './theme';

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Page({ children }: { children: ReactNode }) {
  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>{children}</ScrollView>;
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

export function IconButton({ icon, label, onPress, color = dark.green }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void; color?: string }) {
  return <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconAction, pressed && { opacity: 0.72 }]}>
    <View style={[styles.iconCircle, { backgroundColor: `${color}18` }]}><Ionicons name={icon} size={21} color={color} /></View>
    <Text numberOfLines={1} style={styles.iconLabel}>{label}</Text>
  </Pressable>;
}

export function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Text onPress={onPress} style={styles.sectionAction}>{action}</Text> : null}</View>;
}

export function ModePill() {
  return <View style={styles.mode}><View style={styles.modeDot} /><Text style={styles.modeText}>DEMO · NOT REAL MONEY</Text></View>;
}

export function AssetIcon({ symbol, color = dark.green, size = 42 }: { symbol: string; color?: string; size?: number }) {
  return <LinearGradient colors={[`${color}44`, `${color}16`]} style={[styles.assetIcon, { width: size, height: size, borderRadius: size / 2, borderColor: `${color}70` }]}>
    <Text style={[styles.assetText, { color, fontSize: size * 0.3 }]}>{symbol.slice(0, 2)}</Text>
  </LinearGradient>;
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
  page: { flex: 1, backgroundColor: dark.background },
  pageContent: { padding: spacing.md, gap: 14, paddingBottom: 44 },
  card: { backgroundColor: dark.surface, borderColor: dark.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, borderCurve: 'continuous' },
  cardGreen: { borderColor: dark.green, backgroundColor: dark.greenSoft },
  cardWarning: { borderColor: '#614D1D' },
  label: { color: dark.muted, fontSize: 12 },
  amount: { color: dark.text, fontSize: 28, fontWeight: '800' },
  button: { minHeight: 48, borderRadius: radius.md, backgroundColor: dark.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
  buttonSecondary: { backgroundColor: dark.surfaceRaised, borderWidth: 1, borderColor: dark.border },
  buttonDanger: { backgroundColor: dark.red },
  buttonText: { color: dark.white, fontSize: 15, fontWeight: '800' },
  iconAction: { alignItems: 'center', gap: 7, minWidth: 60 },
  iconCircle: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  iconLabel: { color: dark.text, fontSize: 11, fontWeight: '700' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  sectionTitle: { color: dark.text, fontSize: 19, fontWeight: '900' },
  sectionAction: { color: dark.green, fontSize: 13, fontWeight: '800' },
  mode: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99, backgroundColor: '#332A13' },
  modeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: dark.yellow },
  modeText: { color: dark.yellow, fontSize: 9, fontWeight: '900' },
  assetIcon: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  assetText: { fontWeight: '900' },
  disabled: { opacity: 0.45 },
  empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  emptyTitle: { color: dark.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  emptyBody: { color: dark.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' }
});
