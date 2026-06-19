import { ReactNode, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { dark, depth, radius, spacing } from './theme';

// ─── Layout ─────────────────────────────────────────────

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>;
}

export function Page({ children, noPad }: { children: ReactNode; noPad?: boolean }) {
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={[styles.pageContent, noPad && { paddingHorizontal: 0 }]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

// ─── Header ─────────────────────────────────────────────

export function AppHeader({
  greeting, title, initials = 'MZ', onProfile, onNotifications, unread = 0
}: {
  greeting?: string; title: string; initials?: string;
  onProfile?: () => void; onNotifications?: () => void; unread?: number;
}) {
  return (
    <View style={styles.appHeader}>
      <View style={{ flex: 1 }}>
        {greeting ? <Text style={styles.greeting}>{greeting}</Text> : null}
        <Text numberOfLines={2} style={styles.pageTitle}>{title}</Text>
      </View>
      {onNotifications ? (
        <Pressable accessibilityLabel="Notifications" onPress={onNotifications} style={styles.headerIcon}>
          <Ionicons name="notifications-outline" size={20} color={dark.text} />
          {unread > 0 ? (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}
      {onProfile ? (
        <Pressable accessibilityLabel="Open profile" onPress={onProfile} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials.slice(0, 2)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Cards ───────────────────────────────────────────────

export function Card({ children, tone = 'normal', style }: { children: ReactNode; tone?: 'normal' | 'green' | 'warning' | 'danger'; style?: object }) {
  return (
    <View style={[
      styles.card,
      tone === 'green' && styles.cardGreen,
      tone === 'warning' && styles.cardWarning,
      tone === 'danger' && styles.cardDanger,
      style,
    ]}>
      {children}
    </View>
  );
}

export function InfoRow({ label, value, copy, mono }: { label: string; value: string; copy?: boolean; mono?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!copy) return;
    const Clipboard = await import('expo-clipboard');
    await Clipboard.default.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Pressable onPress={copy ? handleCopy : undefined} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text selectable style={[styles.infoValue, mono && { fontFamily: 'monospace', letterSpacing: 0.5 }]}>{copied ? 'Copied!' : value}</Text>
        {copy ? <Ionicons name={copied ? 'checkmark' : 'copy-outline'} color={copied ? dark.green : dark.muted} size={13} /> : null}
      </Pressable>
    </View>
  );
}

// ─── Balance Hero Card ───────────────────────────────────

export function BalanceHero({
  label = 'Total balance',
  amount,
  sub,
  change,
  changePositive,
  visible,
  onToggle,
  children,
}: {
  label?: string;
  amount: string;
  sub?: string;
  change?: string;
  changePositive?: boolean;
  visible: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <LinearGradient
      colors={['#0D2A40', '#091A2E', '#09091A']}
      style={styles.balanceHero}
    >
      <View style={styles.balanceHeroTop}>
        <Text style={styles.balanceLabel}>{label}</Text>
        <Pressable
          accessibilityLabel={visible ? 'Hide balance' : 'Show balance'}
          onPress={onToggle}
          style={styles.eyeBtn}
        >
          <Ionicons
            name={visible ? 'eye-outline' : 'eye-off-outline'}
            size={19}
            color="#B8D9CA"
          />
        </Pressable>
      </View>
      <Text selectable style={styles.balanceAmount}>
        {visible ? amount : '₦ ••••••••'}
      </Text>
      {sub ? (
        <Text style={styles.balanceSub}>{visible ? sub : '—'}</Text>
      ) : null}
      {change ? (
        <View style={styles.changeRow}>
          <Ionicons
            name={changePositive ? 'trending-up' : 'trending-down'}
            size={14}
            color={changePositive ? dark.greenBright : dark.red}
          />
          <Text style={[styles.changeText, { color: changePositive ? dark.greenBright : dark.red }]}>
            {visible ? change : '——'}
          </Text>
          <Text style={styles.changePeriod}>today</Text>
        </View>
      ) : null}
      {children ? <View style={styles.heroActions}>{children}</View> : null}
    </LinearGradient>
  );
}

// ─── Buttons ─────────────────────────────────────────────

export function Button({
  title, onPress, kind = 'primary', disabled = false, icon, busy = false, fullWidth = true,
}: {
  title: string; onPress?: () => void;
  kind?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  disabled?: boolean; icon?: keyof typeof Ionicons.glyphMap;
  busy?: boolean; fullWidth?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        kind === 'secondary' && styles.buttonSecondary,
        kind === 'danger' && styles.buttonDanger,
        kind === 'ghost' && styles.buttonGhost,
        kind === 'outline' && styles.buttonOutline,
        !fullWidth && { alignSelf: 'flex-start', paddingHorizontal: spacing.lg },
        (disabled || busy) && styles.disabled,
        pressed && { transform: [{ scale: 0.984 }], opacity: 0.82 },
      ]}
    >
      {busy
        ? <ActivityIndicator color={kind === 'ghost' || kind === 'outline' ? dark.green : dark.white} />
        : <>
          {icon ? <Ionicons name={icon} color={kind === 'ghost' || kind === 'outline' ? dark.green : dark.white} size={18} /> : null}
          <Text style={[styles.buttonText, (kind === 'ghost' || kind === 'outline') && { color: dark.green }]}>{title}</Text>
        </>
      }
    </Pressable>
  );
}

export function IconButton({
  icon, label, onPress, color = dark.green, badge,
}: {
  icon: keyof typeof Ionicons.glyphMap; label: string;
  onPress?: () => void; color?: string; badge?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconAction, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.iconCircleWrap}>
        <View style={[styles.iconCircle, { backgroundColor: `${color}20`, borderColor: `${color}35` }]}>
          <Ionicons name={icon} size={22} color={color} />
        </View>
        {badge ? (
          <View style={styles.iconBadge}>
            <Text style={styles.iconBadgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={styles.iconLabel}>{label}</Text>
    </Pressable>
  );
}

// ─── Section Header ──────────────────────────────────────

export function SectionHeader({
  title, action, onPress, caption,
}: {
  title: string; action?: string; onPress?: () => void; caption?: string;
}) {
  return (
    <View style={styles.sectionHead}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
      </View>
      {action ? (
        <Pressable onPress={onPress} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Pills ───────────────────────────────────────────────

export function ModePill({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.mode, compact && { paddingVertical: 4, paddingHorizontal: 8 }]}>
      <View style={styles.modeDot} />
      <Text style={styles.modeText}>DEMO · SIMULATED MONEY</Text>
    </View>
  );
}

export function StatusPill({
  label, tone = 'neutral', icon,
}: {
  label: string; tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; icon?: keyof typeof Ionicons.glyphMap;
}) {
  const color = tone === 'success' ? dark.green
    : tone === 'warning' ? dark.yellow
      : tone === 'danger' ? dark.red
        : tone === 'info' ? dark.cyan
          : dark.mutedStrong;
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}14`, borderColor: `${color}30` }]}>
      {icon ? <Ionicons name={icon} color={color} size={11} /> : null}
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Provider Notice ─────────────────────────────────────

export function ProviderNotice({
  title = 'Provider not connected', body,
}: {
  title?: string; body: string;
}) {
  return (
    <View style={styles.providerNotice}>
      <Ionicons name="cloud-offline-outline" color={dark.yellow} size={19} />
      <View style={{ flex: 1 }}>
        <Text style={styles.providerTitle}>{title}</Text>
        <Text style={styles.providerBody}>{body}</Text>
      </View>
    </View>
  );
}

// ─── Asset Icon ──────────────────────────────────────────

export function AssetIcon({
  symbol, color = dark.green, size = 42,
}: {
  symbol: string; color?: string; size?: number;
}) {
  return (
    <LinearGradient
      colors={[`${color}40`, `${color}14`]}
      style={[styles.assetIcon, { width: size, height: size, borderRadius: size * 0.36, borderColor: `${color}60` }]}
    >
      <Text style={[styles.assetText, { color, fontSize: Math.max(9, size * 0.25) }]}>
        {symbol.slice(0, 4)}
      </Text>
    </LinearGradient>
  );
}

// ─── Transaction Row ─────────────────────────────────────

export type TransactionItem = {
  id: string; title: string; detail: string; amount: string;
  time: string; status?: string; kind?: string;
};

export function TransactionRow({
  item, onPress,
}: {
  item: TransactionItem; onPress?: () => void;
}) {
  const incoming = item.amount.startsWith('+');
  const icon: keyof typeof Ionicons.glyphMap =
    item.kind === 'bill' ? 'receipt-outline'
      : item.kind === 'card' ? 'card-outline'
        : item.kind === 'crypto' ? 'swap-horizontal'
          : incoming ? 'arrow-down' : 'arrow-up';
  const status = item.status ?? 'SUCCESSFUL';
  const statusColor = status === 'SUCCESSFUL' ? dark.green
    : status === 'PENDING' ? dark.yellow
      : status === 'REVERSED' ? dark.cyan
        : dark.red;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.txRow, pressed && { opacity: 0.7 }]}>
      <View style={[styles.txIcon, { backgroundColor: incoming ? '#142E20' : '#2A2315' }]}>
        <Ionicons name={icon} size={17} color={incoming ? dark.green : dark.yellow} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={styles.txTitle}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.txDetail}>{item.detail} · {item.time}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingTop: 2 }}>
          <View style={[styles.txDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.txStatus, { color: statusColor }]}>{status}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text numberOfLines={1} style={[styles.txAmount, { color: incoming ? dark.green : dark.text }]}>
          {item.amount}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── Empty State ─────────────────────────────────────────

export function EmptyState({
  title, body, loading = false, icon = 'file-tray-outline', action, onAction,
}: {
  title: string; body: string; loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: string; onAction?: () => void;
}) {
  return (
    <View style={styles.empty}>
      {loading
        ? <ActivityIndicator color={dark.green} size="large" />
        : <View style={styles.emptyIcon}><Ionicons name={icon} color={dark.green} size={26} /></View>}
      {!loading ? (
        <>
          <Text style={styles.emptyTitle}>{title}</Text>
          <Text style={styles.emptyBody}>{body}</Text>
          {action ? <Pressable onPress={onAction} style={styles.emptyAction}>
            <Text style={styles.emptyActionText}>{action}</Text>
          </Pressable> : null}
        </>
      ) : null}
    </View>
  );
}

// ─── Skeleton ────────────────────────────────────────────

export function Skeleton({ width, height = 16, radius: r = 8, style }: { width?: number | `${number}%`; height?: number; radius?: number; style?: object }) {
  return (
    <View
      style={[
        { width: width ?? '100%', height, borderRadius: r, backgroundColor: dark.surfaceRaised },
        style,
      ]}
    />
  );
}

// ─── Input ───────────────────────────────────────────────

export function FormInput({
  label, value, onChangeText, placeholder, numeric, secure, error, hint, prefix,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; numeric?: boolean; secure?: boolean;
  error?: string; hint?: string; prefix?: string;
}) {
  const [show, setShow] = useState(!secure);
  return (
    <View style={styles.formGroup}>
      <Text style={styles.formLabel}>{label}</Text>
      <View style={[styles.inputWrap, error ? styles.inputError : undefined]}>
        {prefix ? <Text style={styles.inputPrefix}>{prefix}</Text> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={dark.muted}
          keyboardType={numeric ? 'number-pad' : 'default'}
          secureTextEntry={secure && !show}
          style={[styles.input, prefix ? { paddingLeft: 0 } : undefined]}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {secure ? (
          <Pressable onPress={() => setShow(!show)} style={{ padding: 4 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={dark.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

// ─── Confirm Sheet ───────────────────────────────────────

export function ConfirmSheet({
  visible, onClose, onConfirm, title, body, cta = 'Confirm', danger = false, busy = false, children,
}: {
  visible: boolean; onClose: () => void; onConfirm: () => void;
  title: string; body?: string; cta?: string; danger?: boolean; busy?: boolean;
  children?: ReactNode;
}) {
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{title}</Text>
        {body ? <Text style={styles.sheetBody}>{body}</Text> : null}
        {children}
        <View style={{ gap: 10, marginTop: 8 }}>
          <Button title={cta} onPress={onConfirm} kind={danger ? 'danger' : 'primary'} busy={busy} />
          <Button title="Cancel" onPress={onClose} kind="ghost" disabled={busy} />
        </View>
      </View>
    </Modal>
  );
}

// ─── Receipt Card ────────────────────────────────────────

export function ReceiptCard({
  title, status, rows, onClose,
}: {
  title: string; status: 'success' | 'pending' | 'failed';
  rows: Array<{ label: string; value: string; copy?: boolean }>;
  onClose?: () => void;
}) {
  const color = status === 'success' ? dark.green : status === 'pending' ? dark.yellow : dark.red;
  const icon: keyof typeof Ionicons.glyphMap = status === 'success' ? 'checkmark-circle' : status === 'pending' ? 'time' : 'close-circle';

  return (
    <View style={[styles.receipt, { borderColor: `${color}30` }]}>
      <View style={{ alignItems: 'center', gap: 8, paddingBottom: 16 }}>
        <Ionicons name={icon} color={color} size={42} />
        <Text style={[styles.receiptTitle, { color }]}>{title}</Text>
      </View>
      {rows.map((row) => (
        <InfoRow key={row.label} label={row.label} value={row.value} copy={row.copy} />
      ))}
      {onClose ? (
        <Pressable onPress={onClose} style={{ paddingTop: 16 }}>
          <Text style={{ color: dark.green, fontWeight: '900', textAlign: 'center' }}>Done</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Notice Banner ───────────────────────────────────────

export function Notice({
  tone = 'info', title, body, icon,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string; body: string; icon?: keyof typeof Ionicons.glyphMap;
}) {
  const color = tone === 'success' ? dark.green : tone === 'warning' ? dark.yellow : tone === 'danger' ? dark.red : dark.cyan;
  const fallbackIcon: keyof typeof Ionicons.glyphMap = tone === 'success' ? 'checkmark-circle-outline' : tone === 'warning' ? 'warning-outline' : tone === 'danger' ? 'alert-circle-outline' : 'information-circle-outline';
  return (
    <View style={[styles.notice, { backgroundColor: `${color}10`, borderColor: `${color}28` }]}>
      <Ionicons name={icon ?? fallbackIcon} color={color} size={18} />
      <View style={{ flex: 1 }}>
        {title ? <Text style={[styles.noticeTitle, { color }]}>{title}</Text> : null}
        <Text style={[styles.noticeBody, title ? undefined : { color }]}>{body}</Text>
      </View>
    </View>
  );
}

// ─── Trust Stripe ────────────────────────────────────────

export function TrustStripe() {
  return (
    <View style={styles.trust}>
      {[
        { icon: 'shield-checkmark' as const, label: 'Bank-grade security' },
        { icon: 'lock-closed' as const, label: 'Encrypted funds' },
        { icon: 'checkmark-circle' as const, label: 'CBN compliant' },
      ].map((item) => (
        <View key={item.label} style={styles.trustItem}>
          <Ionicons name={item.icon} color={dark.green} size={13} />
          <Text style={styles.trustText}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Label (compat) ─────────────────────────────────────

export function Label({ children }: { children: ReactNode }) {
  return <Text style={{ color: dark.muted, fontSize: 12, fontWeight: '700', marginBottom: 4 }}>{children}</Text>;
}

// ─── Helpers ─────────────────────────────────────────────

export function formatNaira(value: string | number): string {
  const n = Number(value || 0);
  if (isNaN(n)) return '₦0.00';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 2,
  }).format(n);
}

export function AmountDisplay({
  value, size = 34, color,
}: {
  value: string | number; size?: number; color?: string;
}) {
  return (
    <Text selectable style={{ color: color ?? dark.text, fontSize: size, fontWeight: '900', fontVariant: ['tabular-nums'] }}>
      {formatNaira(value)}
    </Text>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: dark.background },
  page: { flex: 1, backgroundColor: dark.background },
  pageContent: { paddingHorizontal: 20, paddingTop: 8, gap: 20, paddingBottom: 100 },

  // Header — clean, minimal like Moniepoint
  appHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  greeting: { color: dark.muted, fontSize: 13, fontWeight: '500', marginBottom: 2 },
  pageTitle: { color: dark.text, fontSize: 22, fontWeight: '800', lineHeight: 28 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, alignItems: 'center', justifyContent: 'center' },
  unreadBadge: { position: 'absolute', right: -2, top: -2, minWidth: 15, height: 15, borderRadius: 8, paddingHorizontal: 3, backgroundColor: dark.red, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: dark.background },
  unreadText: { color: dark.white, fontSize: 8, fontWeight: '900' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: dark.greenSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: dark.green, fontWeight: '800', fontSize: 14 },

  // Cards
  card: { backgroundColor: dark.surface, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: dark.border },
  cardGreen: { borderColor: `${dark.green}30`, backgroundColor: '#0A1E18' },
  cardWarning: { borderColor: `${dark.yellow}30`, backgroundColor: '#1A1608' },
  cardDanger: { borderColor: `${dark.red}30`, backgroundColor: '#1A0A0A' },

  // Info rows
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: dark.border },
  infoLabel: { color: dark.muted, fontSize: 13 },
  infoValue: { color: dark.text, fontWeight: '700', maxWidth: '60%', textAlign: 'right', fontSize: 13 },

  // Balance hero — cleaner, darker gradient
  balanceHero: { padding: 22, borderRadius: 20, gap: 4 },
  balanceHeroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '500', letterSpacing: 0.2 },
  eyeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  balanceAmount: { color: dark.white, fontSize: 38, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 8, letterSpacing: -0.5 },
  balanceSub: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '500', marginTop: 2 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  changeText: { fontSize: 13, fontWeight: '700' },
  changePeriod: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
  heroActions: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 22, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', marginTop: 18 },

  // Buttons — pill for primary, clean for others
  button: { minHeight: 54, borderRadius: 14, backgroundColor: dark.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, flexDirection: 'row', gap: 8 },
  buttonSecondary: { backgroundColor: dark.surfaceRaised, borderWidth: 1, borderColor: dark.borderStrong },
  buttonDanger: { backgroundColor: dark.red },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: `${dark.green}40` },
  buttonOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: dark.border },
  buttonText: { color: dark.white, fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },

  // Icon action buttons — cleaner, rounder
  iconAction: { flex: 1, alignItems: 'center', gap: 8 },
  iconCircleWrap: { position: 'relative' },
  iconCircle: { width: 52, height: 52, borderRadius: 26, borderWidth: 0, alignItems: 'center', justifyContent: 'center' },
  iconBadge: { position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: dark.red, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: dark.background },
  iconBadgeText: { color: dark.white, fontSize: 8, fontWeight: '900' },
  iconLabel: { color: dark.textSoft, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Section headers
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: dark.text, fontSize: 16, fontWeight: '700' },
  sectionCaption: { color: dark.muted, fontSize: 11, marginTop: 1 },
  sectionAction: { color: dark.green, fontSize: 13, fontWeight: '700' },

  // Mode pill
  mode: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: 'rgba(251,191,36,0.08)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)' },
  modeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: dark.yellow },
  modeText: { color: dark.yellow, fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },

  // Status pill
  statusPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.1 },

  // Provider notice
  providerNotice: { flexDirection: 'row', gap: 11, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: `${dark.yellow}25`, backgroundColor: `${dark.yellow}08`, alignItems: 'flex-start' },
  providerTitle: { color: dark.yellow, fontWeight: '700', fontSize: 13 },
  providerBody: { color: dark.mutedStrong, fontSize: 12, lineHeight: 18, paddingTop: 2 },

  // Asset icon
  assetIcon: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  assetText: { fontWeight: '800' },

  // Transaction rows — clean Moniepoint style
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: dark.border },
  txIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  txTitle: { color: dark.text, fontSize: 14, fontWeight: '600' },
  txDetail: { color: dark.muted, fontSize: 12, paddingTop: 1 },
  txDot: { width: 5, height: 5, borderRadius: 3 },
  txStatus: { fontSize: 10, fontWeight: '700', letterSpacing: 0.1 },
  txAmount: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'right' },

  // Empty state
  empty: { minHeight: 200, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: dark.greenSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { color: dark.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  emptyBody: { color: dark.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 260 },
  emptyAction: { marginTop: 4, paddingHorizontal: 22, paddingVertical: 11, borderRadius: 99, backgroundColor: dark.greenSoft, borderWidth: 1, borderColor: `${dark.green}40` },
  emptyActionText: { color: dark.green, fontWeight: '700', fontSize: 14 },

  // Form inputs
  formGroup: { gap: 8 },
  formLabel: { color: dark.textSoft, fontSize: 13, fontWeight: '600' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', minHeight: 54, borderWidth: 1, borderColor: dark.border, backgroundColor: dark.surface, borderRadius: 12, paddingHorizontal: 16 },
  inputError: { borderColor: dark.red },
  inputPrefix: { color: dark.muted, fontSize: 16, marginRight: 6 },
  input: { flex: 1, color: dark.text, fontSize: 15, paddingVertical: 12 },
  fieldError: { color: dark.red, fontSize: 12, marginTop: 2 },
  fieldHint: { color: dark.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },

  // Bottom sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: { backgroundColor: dark.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, gap: 14, borderTopWidth: 1, borderTopColor: dark.border },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: dark.border, alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { color: dark.text, fontSize: 20, fontWeight: '800' },
  sheetBody: { color: dark.muted, fontSize: 14, lineHeight: 22 },

  // Receipt
  receipt: { backgroundColor: dark.surface, borderRadius: 18, padding: 20, borderWidth: 1, gap: 0 },
  receiptTitle: { fontSize: 18, fontWeight: '800' },

  // Notice banner
  notice: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start' },
  noticeTitle: { fontWeight: '700', fontSize: 13, marginBottom: 2 },
  noticeBody: { color: dark.mutedStrong, fontSize: 12, lineHeight: 18 },

  // Trust stripe
  trust: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingVertical: 8 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  trustText: { color: dark.muted, fontSize: 11, fontWeight: '600' },
});
