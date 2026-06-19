import { useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { demoTransactions } from '@/demo';
import { useSession, getDisplayName, getInitials, formatNgn } from '@/store';
import { dark } from '@/theme';

export default function HomeScreen() {
  const {
    balancesVisible, setBalancesVisible,
    profile, balances, notifUnread,
    mode, refreshProfile, refreshBalances, balancesLoading, profileLoading,
  } = useSession();

  const load = useCallback(async () => {
    await Promise.all([refreshProfile(), refreshBalances()]);
  }, []);

  useEffect(() => { load(); }, []);

  const h = new Date().getHours();
  const timeGreet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.name?.split(' ')[0] ?? 'there';

  const totalNgn = balances?.totalNgn ?? 0;
  const changeNgn = balances?.todayChangeNgn ?? 0;
  const changePositive = changeNgn >= 0;
  const initials = getInitials(profile);

  return (
    <ScrollView
      style={st.root}
      contentContainerStyle={st.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────── */}
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Text style={st.greet}>{timeGreet},</Text>
          <Text style={st.name}>{firstName} 👋</Text>
        </View>
        <Pressable style={st.bellWrap} onPress={() => router.push('/notifications')}>
          <Ionicons name="notifications-outline" size={21} color={dark.textSoft} />
          {notifUnread > 0 ? <View style={st.bellDot} /> : null}
        </Pressable>
        <Pressable style={st.avatar} onPress={() => router.push('/profile')}>
          <Text style={st.avatarText}>{initials}</Text>
        </Pressable>
      </View>

      {/* ── DEMO badge ─────────────────────────────── */}
      {mode === 'DEMO' ? (
        <View style={st.demoBadge}>
          <View style={st.demoDot} />
          <Text style={st.demoText}>DEMO MODE · SIMULATED MONEY</Text>
        </View>
      ) : null}

      {/* ── Balance Card ───────────────────────────── */}
      <LinearGradient colors={['#0E2040', '#091530', '#09091A']} style={st.balanceCard}>
        {/* top row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={st.balLabel}>Total Balance</Text>
          <Pressable style={st.eyeBtn} onPress={() => setBalancesVisible(!balancesVisible)}>
            <Ionicons
              name={balancesVisible ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color="rgba(255,255,255,0.5)"
            />
          </Pressable>
        </View>

        {/* amount */}
        {balancesLoading && !balances ? (
          <View style={{ marginTop: 10 }}>
            <View style={{ height: 44, width: 180, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          </View>
        ) : (
          <Text style={st.balAmount}>
            {balancesVisible ? formatNgn(totalNgn) : '₦ ••••••••'}
          </Text>
        )}

        {/* change */}
        {balances && balancesVisible ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 }}>
            <Ionicons
              name={changePositive ? 'trending-up' : 'trending-down'}
              size={14}
              color={changePositive ? dark.green : dark.red}
            />
            <Text style={{ color: changePositive ? dark.green : dark.red, fontWeight: '700', fontSize: 13 }}>
              {changePositive ? '+' : ''}{formatNgn(Math.abs(changeNgn))} today
            </Text>
          </View>
        ) : null}

        {/* action buttons */}
        <View style={st.balActions}>
          {[
            { icon: 'add', label: 'Deposit', route: '/deposit', bg: dark.green },
            { icon: 'arrow-up', label: 'Withdraw', route: '/withdraw', bg: 'rgba(255,255,255,0.12)' },
            { icon: 'swap-horizontal', label: 'Swap', route: '/swap', bg: 'rgba(255,255,255,0.12)' },
            { icon: 'send', label: 'Send', route: '/memezo-transfer', bg: 'rgba(255,255,255,0.12)' },
          ].map((item) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [st.balAction, pressed && { opacity: 0.7 }]}
              onPress={() => router.push(item.route)}
            >
              <View style={[st.balActionIcon, { backgroundColor: item.bg }]}>
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={19} color="#fff" />
              </View>
              <Text style={st.balActionLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* ── Wallets ────────────────────────────────── */}
      <View>
        <Text style={st.sectionTitle}>Wallets</Text>
        <View style={st.walletsList}>
          <WalletRow
            icon="cash-outline"
            color={dark.green}
            label="NGN Wallet"
            sub="Nigerian Naira"
            value={balancesVisible ? formatNgn(balances?.ngnBalance ?? 0) : '••••••'}
            onPress={() => router.push('/transactions')}
          />
          <WalletRow
            icon="logo-bitcoin"
            color={dark.blue}
            label="Crypto Portfolio"
            sub="USDT · USDC · SOL · ETH"
            value={balancesVisible ? formatNgn(balances?.cryptoValueNgn ?? 0) : '••••••'}
            onPress={() => router.push('/(tabs)/portfolio')}
          />
          {(balances?.pendingNgn ?? 0) > 0 ? (
            <WalletRow
              icon="time-outline"
              color={dark.yellow}
              label="Pending"
              sub="Awaiting confirmation"
              value={balancesVisible ? formatNgn(balances?.pendingNgn ?? 0) : '••••••'}
              onPress={() => router.push('/transactions')}
            />
          ) : null}
        </View>
      </View>

      {/* ── KYC nudge ──────────────────────────────── */}
      {profile && profile.kycStatus !== 'VERIFIED' && profile.kycStatus !== 'APPROVED' ? (
        <Pressable style={st.kycNudge} onPress={() => router.push('/kyc')}>
          <View style={st.kycIcon}>
            <Ionicons name="shield-outline" size={20} color={dark.yellow} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.kycTitle}>Verify your identity</Text>
            <Text style={st.kycSub}>Unlock withdrawals and higher limits</Text>
          </View>
          <Ionicons name="chevron-forward" color={dark.muted} size={16} />
        </Pressable>
      ) : null}

      {/* ── Recent Transactions ─────────────────────── */}
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={st.sectionTitle}>Recent activity</Text>
          <Pressable onPress={() => router.push('/transactions')}>
            <Text style={st.seeAll}>See all</Text>
          </Pressable>
        </View>

        <View style={st.txCard}>
          {demoTransactions.slice(0, 5).map((item, i) => {
            const incoming = item.amount.startsWith('+');
            return (
              <Pressable
                key={item.id}
                style={[st.txRow, i === Math.min(4, demoTransactions.length - 1) && { borderBottomWidth: 0 }]}
                onPress={() => router.push('/transactions')}
              >
                <View style={[st.txIcon, { backgroundColor: incoming ? `${dark.green}15` : `${dark.muted}12` }]}>
                  <Ionicons
                    name={incoming ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={incoming ? dark.green : dark.mutedStrong}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.txTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={st.txSub} numberOfLines={1}>{item.detail}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[st.txAmount, { color: incoming ? dark.green : dark.text }]}>
                    {item.amount}
                  </Text>
                  <Text style={st.txTime}>{item.time}</Text>
                </View>
              </Pressable>
            );
          })}
          {demoTransactions.length === 0 ? (
            <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
              <Ionicons name="receipt-outline" color={dark.muted} size={28} />
              <Text style={{ color: dark.muted, fontSize: 14 }}>No transactions yet</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ── Quick features ─────────────────────────── */}
      <Text style={st.sectionTitle}>More</Text>
      <View style={st.featureGrid}>
        {[
          { icon: 'compass-outline', label: 'Discover tokens', sub: 'Trending meme coins', color: dark.purple, route: '/(tabs)/discover' },
          { icon: 'gift-outline', label: 'Rewards', sub: 'Cashback & referrals', color: dark.green, route: '/rewards' },
          { icon: 'card-outline', label: 'Virtual card', sub: 'Coming soon', color: dark.blue, route: '/cards' },
          { icon: 'lock-closed-outline', label: 'Savings', sub: 'Lock money & earn', color: dark.cyan, route: '/savings' },
        ].map((f) => (
          <Pressable
            key={f.label}
            onPress={() => router.push(f.route)}
            style={({ pressed }) => [st.featureTile, pressed && { opacity: 0.75 }]}
          >
            <View style={[st.featureIcon, { backgroundColor: `${f.color}15` }]}>
              <Ionicons name={f.icon as keyof typeof Ionicons.glyphMap} size={22} color={f.color} />
            </View>
            <Text style={st.featureLabel}>{f.label}</Text>
            <Text style={st.featureSub}>{f.sub}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function WalletRow({ icon, color, label, sub, value, onPress }: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string; label: string; sub: string; value: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st.walletRow, pressed && { opacity: 0.75 }]}>
      <View style={[st.walletIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.walletLabel}>{label}</Text>
        <Text style={st.walletSub}>{sub}</Text>
      </View>
      <Text style={st.walletValue}>{value}</Text>
      <Ionicons name="chevron-forward" color={dark.muted} size={15} />
    </Pressable>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: dark.background },
  content: { paddingBottom: 110 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 10 },
  greet: { color: dark.muted, fontSize: 13, fontWeight: '400' },
  name: { color: dark.text, fontSize: 22, fontWeight: '800', marginTop: 1 },
  bellWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellDot: { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: dark.red, borderWidth: 1.5, borderColor: dark.background },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${dark.green}20`, borderWidth: 1, borderColor: `${dark.green}40`, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: dark.green, fontWeight: '800', fontSize: 14 },

  // Demo badge
  demoBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 20, marginBottom: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, backgroundColor: `${dark.yellow}10`, borderWidth: 1, borderColor: `${dark.yellow}20`, alignSelf: 'flex-start' },
  demoDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: dark.yellow },
  demoText: { color: dark.yellow, fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },

  // Balance card
  balanceCard: { marginHorizontal: 20, borderRadius: 22, padding: 22, marginBottom: 4 },
  balLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  eyeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  balAmount: { color: '#fff', fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'], marginTop: 10, letterSpacing: -1 },
  balActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  balAction: { alignItems: 'center', gap: 7, flex: 1 },
  balActionIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  balActionLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },

  // Wallets
  sectionTitle: { color: dark.text, fontSize: 16, fontWeight: '700', paddingHorizontal: 20, marginBottom: 12, marginTop: 6 },
  walletsList: { marginHorizontal: 20, backgroundColor: dark.surface, borderRadius: 16, borderWidth: 1, borderColor: dark.border },
  walletRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: dark.border },
  walletIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  walletLabel: { color: dark.text, fontSize: 14, fontWeight: '600' },
  walletSub: { color: dark.muted, fontSize: 12, marginTop: 1 },
  walletValue: { color: dark.text, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // KYC nudge
  kycNudge: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 20, padding: 14, borderRadius: 14, backgroundColor: `${dark.yellow}08`, borderWidth: 1, borderColor: `${dark.yellow}20` },
  kycIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: `${dark.yellow}15`, alignItems: 'center', justifyContent: 'center' },
  kycTitle: { color: dark.text, fontWeight: '700', fontSize: 14 },
  kycSub: { color: dark.muted, fontSize: 12, marginTop: 1 },

  // Transactions
  seeAll: { color: dark.green, fontSize: 13, fontWeight: '700', paddingRight: 20 },
  txCard: { marginHorizontal: 20, backgroundColor: dark.surface, borderRadius: 16, borderWidth: 1, borderColor: dark.border, paddingHorizontal: 16 },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: dark.border },
  txIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  txTitle: { color: dark.text, fontSize: 14, fontWeight: '600' },
  txSub: { color: dark.muted, fontSize: 12, marginTop: 1 },
  txAmount: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  txTime: { color: dark.muted, fontSize: 11, marginTop: 1 },

  // Feature grid
  featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 },
  featureTile: { width: '47%', backgroundColor: dark.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: dark.border, gap: 6 },
  featureIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  featureLabel: { color: dark.text, fontSize: 14, fontWeight: '700' },
  featureSub: { color: dark.muted, fontSize: 12 },
});
