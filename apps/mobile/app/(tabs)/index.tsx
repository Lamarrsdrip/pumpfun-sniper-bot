import { useEffect, useCallback } from 'react';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AppHeader, AssetIcon, BalanceHero, EmptyState,
  IconButton, ModePill, Notice, SectionHeader, Skeleton,
  StatusPill, TransactionRow, TrustStripe,
} from '@/components';
import { demoTokens, demoTransactions } from '@/demo';
import { useSession, getDisplayName, getInitials, formatNgn } from '@/store';
import { dark } from '@/theme';
import { api } from '@/api';

export default function HomeScreen() {
  const {
    balancesVisible, setBalancesVisible,
    profile, balances, notifUnread,
    mode, refreshProfile, refreshBalances, balancesLoading,
  } = useSession();

  const load = useCallback(async () => {
    await Promise.all([refreshProfile(), refreshBalances()]);
  }, []);

  useEffect(() => { load(); }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    const name = getDisplayName(profile);
    if (h < 12) return `Good morning, ${name}`;
    if (h < 17) return `Good afternoon, ${name}`;
    return `Good evening, ${name}`;
  })();

  const totalNgn = balances?.totalNgn ?? 0;
  const changeNgn = balances?.todayChangeNgn ?? 0;
  const changePct = balances?.todayChangePct ?? 0;
  const changePositive = changeNgn >= 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: dark.background }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 6, gap: 16, paddingBottom: 60 }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <AppHeader
        greeting={greeting}
        title={profile ? 'Your money is ready' : 'Welcome back'}
        initials={getInitials(profile)}
        unread={notifUnread}
        onNotifications={() => router.push('/notifications')}
        onProfile={() => router.push('/profile')}
      />

      {/* Mode + KYC status */}
      <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
        {mode === 'DEMO' ? <ModePill compact /> : null}
        {profile ? (
          <StatusPill
            label={profile.kycStatus === 'VERIFIED' ? `Tier ${profile.kycTier ?? 1} · Verified` : `KYC: ${profile.kycStatus}`}
            tone={profile.kycStatus === 'VERIFIED' ? 'success' : 'warning'}
            icon={profile.kycStatus === 'VERIFIED' ? 'shield-checkmark' : 'shield-outline'}
          />
        ) : null}
      </View>

      {/* Balance Hero */}
      {balancesLoading && !balances ? (
        <View style={{ borderRadius: 20, overflow: 'hidden', gap: 10, padding: 20, backgroundColor: dark.surfaceRaised }}>
          <Skeleton width="40%" height={12} />
          <Skeleton width="72%" height={38} radius={10} />
          <Skeleton width="50%" height={12} />
        </View>
      ) : (
        <BalanceHero
          label="Total balance"
          amount={formatNgn(totalNgn)}
          sub={`NGN ${formatNgn(balances?.ngnBalance ?? 0)} · Crypto ${formatNgn(balances?.cryptoValueNgn ?? 0)}`}
          change={`${changePositive ? '+' : ''}${formatNgn(changeNgn)} (${changePositive ? '+' : ''}${changePct.toFixed(2)}%)`}
          changePositive={changePositive}
          visible={balancesVisible}
          onToggle={() => setBalancesVisible(!balancesVisible)}
        >
          <IconButton icon="add-circle" label="Deposit" onPress={() => router.push('/deposit')} />
          <IconButton icon="arrow-up-circle" label="Withdraw" onPress={() => router.push('/withdraw')} color={dark.cyan} />
          <IconButton icon="swap-horizontal" label="Swap" onPress={() => router.push('/swap')} color={dark.purple} />
          <IconButton icon="send" label="Send" onPress={() => router.push('/memezo-transfer')} color={dark.yellow} />
        </BalanceHero>
      )}

      {/* Quick stats */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatCard icon="wallet-outline" label="Pending" value={balances ? formatNgn(balances.pendingNgn) : '—'} color={dark.yellow} />
        <StatCard icon="flash-outline" label="Crypto" value={balances ? formatNgn(balances.cryptoValueNgn) : '—'} color={dark.purple} />
        <StatCard icon="gift-outline" label="Rewards" value="₦0" color={dark.green} onPress={() => router.push('/rewards')} />
      </View>

      {/* Security nudge */}
      {profile && profile.kycStatus !== 'VERIFIED' ? (
        <Pressable
          onPress={() => router.push('/kyc')}
          style={{ flexDirection: 'row', gap: 11, padding: 14, borderRadius: 14, backgroundColor: '#1C180D', borderWidth: 1, borderColor: '#4D3E1D', alignItems: 'center' }}
        >
          <Ionicons name="shield-outline" color={dark.yellow} size={22} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: dark.text, fontWeight: '900', fontSize: 13 }}>Verify your identity</Text>
            <Text style={{ color: dark.muted, fontSize: 11, paddingTop: 2 }}>Unlock higher limits and full features</Text>
          </View>
          <Ionicons name="chevron-forward" color={dark.muted} size={17} />
        </Pressable>
      ) : null}

      {/* Recent Transactions */}
      <SectionHeader title="Recent activity" action="See all" onPress={() => router.push('/transactions')} />
      <View style={{ backgroundColor: dark.surface, borderRadius: 16, borderWidth: 1, borderColor: dark.border, paddingHorizontal: 14 }}>
        {demoTransactions.slice(0, 4).map((item) => (
          <TransactionRow key={item.id} item={item} onPress={() => router.push('/transactions')} />
        ))}
        {demoTransactions.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No transactions yet"
            body="Your deposits, withdrawals and swaps will appear here"
          />
        ) : null}
      </View>

      {/* Quick send */}
      <SectionHeader title="Quick send" action="New transfer" onPress={() => router.push('/memezo-transfer')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {quickContacts.map((contact) => (
          <Pressable
            key={contact.name}
            onPress={() => router.push({ pathname: '/memezo-transfer', params: { q: contact.name } })}
            style={{ alignItems: 'center', width: 60, gap: 6 }}
          >
            <View style={{ width: 50, height: 50, borderRadius: 17, backgroundColor: `${contact.color}18`, borderWidth: 1, borderColor: `${contact.color}30`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: contact.color, fontWeight: '900', fontSize: 15 }}>{contact.initials}</Text>
            </View>
            <Text numberOfLines={1} style={{ color: dark.textSoft, fontSize: 10, fontWeight: '800' }}>{contact.name}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push('/memezo-transfer')} style={{ alignItems: 'center', width: 60, gap: 6 }}>
          <View style={{ width: 50, height: 50, borderRadius: 17, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add" color={dark.green} size={22} />
          </View>
          <Text style={{ color: dark.muted, fontSize: 10, fontWeight: '800' }}>New</Text>
        </Pressable>
      </ScrollView>

      {/* Feature tiles */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <FeatureTile icon="gift-outline" title="Rewards" body="Cashback & referrals" color={dark.green} onPress={() => router.push('/rewards')} />
        <FeatureTile icon="lock-closed-outline" title="Savings" body="Build goals safely" color={dark.cyan} onPress={() => router.push('/savings')} />
      </View>

      {/* Market watch */}
      <SectionHeader title="Market watch" action="Discover" onPress={() => router.push('/(tabs)/discover')} caption="Trending meme tokens" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
        {demoTokens.slice(0, 4).map((token) => (
          <Pressable
            key={token.mint}
            onPress={() => router.push(`/token/${token.mint}`)}
            style={{ width: 170, padding: 14, borderRadius: 16, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 8 }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <AssetIcon symbol={token.symbol} color={token.color} size={36} />
              <StatusPill label={token.chain} tone="info" />
            </View>
            <Text numberOfLines={1} style={{ color: dark.text, fontWeight: '900', fontSize: 13 }}>{token.name}</Text>
            <Text style={{ color: token.change >= 0 ? dark.green : dark.red, fontSize: 18, fontWeight: '900' }}>
              {token.change >= 0 ? '+' : ''}{token.change}%
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: dark.muted, fontSize: 9 }}>Score {token.score}</Text>
              {token.risk > 55 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="warning" color={dark.yellow} size={10} />
                  <Text style={{ color: dark.yellow, fontSize: 9, fontWeight: '900' }}>Risk {token.risk}</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons name="shield-checkmark" color={dark.green} size={10} />
                  <Text style={{ color: dark.green, fontSize: 9, fontWeight: '700' }}>Safe</Text>
                </View>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Trust stripe */}
      <TrustStripe />
    </ScrollView>
  );
}

function StatCard({
  icon, label, value, color, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string; color: string; onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, minWidth: 0, padding: 12, borderRadius: 14, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border, gap: 6 }}
    >
      <Ionicons name={icon} color={color} size={16} />
      <Text numberOfLines={1} style={{ color: dark.muted, fontSize: 9, fontWeight: '700' }}>{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit style={{ color: dark.text, fontWeight: '900', fontSize: 13 }}>{value}</Text>
    </Pressable>
  );
}

function FeatureTile({
  icon, title, body, color, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap; title: string; body: string; color: string; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, minHeight: 110, padding: 14, borderRadius: 16, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border }}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${color}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <Ionicons name={icon} color={color} size={20} />
      </View>
      <Text style={{ color: dark.text, fontWeight: '900', fontSize: 13 }}>{title}</Text>
      <Text style={{ color: dark.muted, fontSize: 10, paddingTop: 3 }}>{body}</Text>
    </Pressable>
  );
}

const quickContacts = [
  { name: 'Chinedu', initials: 'CO', color: dark.cyan },
  { name: 'Amaka', initials: 'AO', color: dark.purple },
  { name: 'Dayo', initials: 'DA', color: dark.yellow },
  { name: 'Tolu', initials: 'TA', color: dark.green },
];
