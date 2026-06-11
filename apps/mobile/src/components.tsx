import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { dark, depth, radius, spacing } from './theme';

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Page({ children }: { children: ReactNode }) {
  return <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>{children}</ScrollView>;
}

export function AppHeader({ greeting, title, onProfile, onNotifications, unread = 0 }: { greeting?: string; title: string; onProfile?: () => void; onNotifications?: () => void; unread?: number }) {
  return <View style={styles.appHeader}>
    <View style={{ flex: 1 }}>{greeting ? <Text style={styles.greeting}>{greeting}</Text> : null}<Text numberOfLines={2} style={styles.pageTitle}>{title}</Text></View>
    {onNotifications ? <Pressable accessibilityLabel="Notifications" onPress={onNotifications} style={styles.headerIcon}><Ionicons name="notifications-outline" size={21} color={dark.text} />{unread ? <View style={styles.unread}><Text style={styles.unreadText}>{unread}</Text></View> : null}</Pressable> : null}
    {onProfile ? <Pressable accessibilityLabel="Open profile" onPress={onProfile} style={styles.avatar}><Text style={styles.avatarText}>AN</Text></Pressable> : null}
  </View>;
}

export function Card({ children, tone = 'normal' }: { children: ReactNode; tone?: 'normal' | 'green' | 'warning' | 'danger' }) {
  return <View style={[styles.card, tone === 'green' && styles.cardGreen, tone === 'warning' && styles.cardWarning, tone === 'danger' && styles.cardDanger]}>{children}</View>;
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Amount({ children, positive }: { children: ReactNode; positive?: boolean }) {
  return <Text selectable style={[styles.amount, positive && { color: dark.green }, { fontVariant: ['tabular-nums'] }]}>{children}</Text>;
}

export function Button({ title, onPress, kind = 'primary', disabled = false, icon, busy = false }: { title: string; onPress?: () => void; kind?: 'primary' | 'secondary' | 'danger' | 'ghost'; disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap; busy?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [
      styles.button,
      kind === 'secondary' && styles.buttonSecondary,
      kind === 'danger' && styles.buttonDanger,
      kind === 'ghost' && styles.buttonGhost,
      (disabled || busy) && styles.disabled,
      pressed && { transform: [{ scale: 0.985 }], opacity: 0.84 }
    ]}>
      {busy ? <ActivityIndicator color={dark.white} /> : <>{icon ? <Ionicons name={icon} color={kind === 'ghost' ? dark.green : dark.white} size={18} /> : null}<Text style={[styles.buttonText, kind === 'ghost' && { color: dark.green }]}>{title}</Text></>}
    </Pressable>
  );
}

export function IconButton({ icon, label, onPress, color = dark.green }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void; color?: string }) {
  return <Pressable accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.iconAction, pressed && { opacity: 0.72 }]}>
    <View style={[styles.iconCircle, { backgroundColor: `${color}18`, borderColor: `${color}2D` }]}><Ionicons name={icon} size={21} color={color} /></View>
    <Text numberOfLines={1} style={styles.iconLabel}>{label}</Text>
  </Pressable>;
}

export function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return <View style={styles.sectionHead}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Pressable onPress={onPress}><Text style={styles.sectionAction}>{action}</Text></Pressable> : null}</View>;
}

export function ModePill({ compact = false }: { compact?: boolean }) {
  return <View style={[styles.mode, compact && { paddingVertical: 4 }]}><View style={styles.modeDot} /><Text style={styles.modeText}>DEMO · SIMULATED MONEY</Text></View>;
}

export function StatusPill({ label, tone = 'neutral', icon }: { label: string; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; icon?: keyof typeof Ionicons.glyphMap }) {
  const color = tone === 'success' ? dark.green : tone === 'warning' ? dark.yellow : tone === 'danger' ? dark.red : tone === 'info' ? dark.cyan : dark.mutedStrong;
  return <View style={[styles.statusPill, { backgroundColor: `${color}15`, borderColor: `${color}35` }]}>{icon ? <Ionicons name={icon} color={color} size={12} /> : null}<Text style={[styles.statusText, { color }]}>{label}</Text></View>;
}

export function ProviderNotice({ title = 'Provider not connected', body }: { title?: string; body: string }) {
  return <View style={styles.providerNotice}><Ionicons name="cloud-offline-outline" color={dark.yellow} size={20} /><View style={{ flex: 1 }}><Text style={styles.providerTitle}>{title}</Text><Text style={styles.providerBody}>{body}</Text></View></View>;
}

export function AssetIcon({ symbol, color = dark.green, size = 42 }: { symbol: string; color?: string; size?: number }) {
  return <LinearGradient colors={[`${color}44`, `${color}16`]} style={[styles.assetIcon, { width: size, height: size, borderRadius: size / 2, borderColor: `${color}70` }]}>
    <Text style={[styles.assetText, { color, fontSize: Math.max(10, size * 0.26) }]}>{symbol.slice(0, 4)}</Text>
  </LinearGradient>;
}

export function TransactionRow({ item, onPress }: { item: { title: string; detail: string; amount: string; time: string; status?: string; kind?: string }; onPress?: () => void }) {
  const incoming = item.amount.startsWith('+');
  const icon = item.kind === 'bill' ? 'receipt-outline' : item.kind === 'card' ? 'card-outline' : item.kind === 'crypto' ? 'swap-horizontal' : incoming ? 'arrow-down' : 'arrow-up';
  const status = item.status || 'SUCCESSFUL';
  const statusColor = status === 'SUCCESSFUL' ? dark.green : status === 'PENDING' ? dark.yellow : status === 'REVERSED' ? dark.cyan : dark.red;
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.transaction, pressed && { opacity: 0.72 }]}>
    <View style={[styles.transactionIcon, { backgroundColor: incoming ? '#153A2B' : '#25291B' }]}><Ionicons name={icon} size={18} color={incoming ? dark.green : dark.yellow} /></View>
    <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={styles.transactionTitle}>{item.title}</Text><Text numberOfLines={1} style={styles.transactionDetail}>{item.detail} · {item.time}</Text><Text style={[styles.transactionStatus, { color: statusColor }]}>{status}</Text></View>
    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.transactionAmount, { color: incoming ? dark.green : dark.text }]}>{item.amount}</Text>
  </Pressable>;
}

export function EmptyState({ title, body, loading = false, icon = 'file-tray-outline' }: { title: string; body: string; loading?: boolean; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.empty}>
      {loading ? <ActivityIndicator color={dark.green} /> : <View style={styles.emptyIcon}><Ionicons name={icon} color={dark.green} size={25} /></View>}
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
  pageContent: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: 15, paddingBottom: 52 },
  appHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  greeting: { color: dark.muted, fontSize: 12, fontWeight: '600' },
  pageTitle: { color: dark.text, fontSize: 26, lineHeight: 31, fontWeight: '900' },
  headerIcon: { width: 43, height: 43, borderRadius: 15, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surface, alignItems: 'center', justifyContent: 'center' },
  unread: { position: 'absolute', right: -2, top: -2, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 3, backgroundColor: dark.red, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: dark.white, fontSize: 8, fontWeight: '900' },
  avatar: { width: 43, height: 43, borderRadius: 15, backgroundColor: dark.greenSoft, borderWidth: 1, borderColor: '#2A674D', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: dark.green, fontWeight: '900' },
  card: { backgroundColor: dark.surface, borderColor: dark.border, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, borderCurve: 'continuous', boxShadow: depth.soft },
  cardGreen: { borderColor: '#2D7052', backgroundColor: dark.greenSoft },
  cardWarning: { borderColor: '#614D1D', backgroundColor: '#1B180E' },
  cardDanger: { borderColor: '#63303A', backgroundColor: '#211217' },
  label: { color: dark.muted, fontSize: 12 },
  amount: { color: dark.text, fontSize: 28, fontWeight: '900' },
  button: { minHeight: 50, borderRadius: radius.md, backgroundColor: dark.greenDeep, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md, flexDirection: 'row', gap: 8, borderCurve: 'continuous' },
  buttonSecondary: { backgroundColor: dark.surfaceRaised, borderWidth: 1, borderColor: dark.borderStrong },
  buttonDanger: { backgroundColor: '#BC3344' },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: dark.border },
  buttonText: { color: dark.white, fontSize: 15, fontWeight: '900' },
  iconAction: { flex: 1, alignItems: 'center', gap: 7, minWidth: 60 },
  iconCircle: { width: 48, height: 48, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  iconLabel: { color: dark.textSoft, fontSize: 11, fontWeight: '800' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8 },
  sectionTitle: { color: dark.text, fontSize: 19, fontWeight: '900' },
  sectionAction: { color: dark.green, fontSize: 13, fontWeight: '900' },
  mode: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99, backgroundColor: '#302813', borderWidth: 1, borderColor: '#59491F' },
  modeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: dark.yellow },
  modeText: { color: dark.yellow, fontSize: 9, fontWeight: '900' },
  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '900' },
  providerNotice: { flexDirection: 'row', gap: 11, padding: 13, borderRadius: 12, borderWidth: 1, borderColor: '#4F4120', backgroundColor: '#19160E' },
  providerTitle: { color: dark.yellow, fontWeight: '900', fontSize: 12 },
  providerBody: { color: dark.mutedStrong, fontSize: 11, lineHeight: 17, paddingTop: 2 },
  assetIcon: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  assetText: { fontWeight: '900' },
  transaction: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: dark.border },
  transactionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  transactionTitle: { color: dark.text, fontSize: 13, fontWeight: '900' },
  transactionDetail: { color: dark.muted, fontSize: 10, paddingTop: 2 },
  transactionStatus: { fontSize: 8, fontWeight: '900', paddingTop: 3 },
  transactionAmount: { maxWidth: 108, textAlign: 'right', fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
  disabled: { opacity: 0.42 },
  empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  emptyIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: dark.greenSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: dark.text, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyBody: { color: dark.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' }
});
