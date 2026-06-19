import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppHeader, Button, Card, ModePill, Notice, Page, SectionHeader, Skeleton, StatusPill } from '@/components';
import { useSession, getInitials } from '@/store';
import { dark, spacing } from '@/theme';
import { saveSession } from '@/api';

const groups = [
  {
    title: 'Account',
    rows: [
      { icon: 'person-outline' as const, title: 'Personal details', detail: 'Name, phone, email and address', route: '/kyc' },
      { icon: 'shield-checkmark-outline' as const, title: 'Security center', detail: 'PIN, biometrics, 2FA and trusted devices', route: '/security' },
      { icon: 'speedometer-outline' as const, title: 'Account limits', detail: 'Deposit, withdrawal and daily limits', route: '/kyc' },
      { icon: 'briefcase-outline' as const, title: 'Business account', detail: 'KYB, higher limits and team access', route: '/business' },
    ],
  },
  {
    title: 'Money and benefits',
    rows: [
      { icon: 'receipt-outline' as const, title: 'Transactions & receipts', detail: 'Payments, swaps and downloadable records', route: '/transactions' },
      { icon: 'gift-outline' as const, title: 'Rewards and referrals', detail: 'Invite rewards and cashback history', route: '/rewards' },
      { icon: 'lock-closed-outline' as const, title: 'Savings', detail: 'Goals, flex savings and locked plans', route: '/savings' },
    ],
  },
  {
    title: 'Help and privacy',
    rows: [
      { icon: 'help-circle-outline' as const, title: 'Support center', detail: 'Payments, trades, cards and disputes', route: '/support' },
      { icon: 'document-text-outline' as const, title: 'Legal and risk notices', detail: 'Terms, privacy and crypto disclosures', route: '/support' },
      { icon: 'logo-whatsapp' as const, title: 'WhatsApp Assistant', detail: 'Link alerts and payment preparation', route: '/whatsapp' },
      { icon: 'trash-outline' as const, title: 'Delete account', detail: 'Start the secure closure process', route: '/support' },
    ],
  },
] as const;

export default function ProfileScreen() {
  const { profile, profileLoading, notifUnread, mode, logout } = useSession();
  const [alerts, setAlerts] = useState(true);

  const handleLogout = async () => {
    await saveSession('', 'DEMO').catch(() => {});
    logout();
    router.replace('/auth');
  };

  const displayName = profile?.name || 'Loading...';
  const displayEmail = profile?.email || profile?.phone || '';
  const initials = getInitials(profile);
  const kycLabel = profile
    ? profile.kycStatus === 'VERIFIED'
      ? `Tier ${profile.kycTier ?? 1} · Verified`
      : profile.kycStatus === 'PENDING'
        ? 'KYC Pending'
        : 'Identity unverified'
    : '';
  const kycTone = profile?.kycStatus === 'VERIFIED' ? 'success' as const : 'warning' as const;

  return (
    <Page>
      <AppHeader
        title="Your account"
        initials={initials}
        onNotifications={() => router.push('/notifications')}
        unread={notifUnread}
      />

      {/* Profile card */}
      <LinearGradient colors={['#0F2A1C', '#0A1A11']} style={st.profileCard}>
        {profileLoading && !profile ? (
          <View style={{ gap: 10 }}>
            <Skeleton width={56} height={56} radius={18} />
            <Skeleton width="60%" height={18} radius={6} />
            <Skeleton width="40%" height={12} radius={4} />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <View style={st.avatarLarge}>
              <Text style={st.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text numberOfLines={1} style={st.profileName}>{displayName}</Text>
              {displayEmail ? (
                <Text numberOfLines={1} style={st.profileEmail}>{displayEmail}</Text>
              ) : null}
              {profile?.handle ? (
                <Text numberOfLines={1} style={st.profileHandle}>@{profile.handle}</Text>
              ) : null}
              <View style={{ flexDirection: 'row', gap: 6, paddingTop: 8, flexWrap: 'wrap' }}>
                {profile ? <StatusPill label={kycLabel} tone={kycTone} icon={profile.kycStatus === 'VERIFIED' ? 'shield-checkmark' : 'shield-outline'} /> : null}
                {mode === 'DEMO' ? <StatusPill label="DEMO" tone="warning" /> : null}
              </View>
            </View>
          </View>
        )}

        {profile?.referralCode ? (
          <View style={st.referralRow}>
            <Text style={{ color: dark.muted, fontSize: 11 }}>Referral code</Text>
            <Text selectable style={{ color: dark.green, fontWeight: '900', fontSize: 12 }}>{profile.referralCode}</Text>
            <Pressable onPress={async () => {
              const Clipboard = await import('expo-clipboard');
              await Clipboard.default.setStringAsync(`https://memezo.ng/r/${profile.referralCode}`);
            }}>
              <Ionicons name="copy-outline" color={dark.green} size={15} />
            </Pressable>
          </View>
        ) : null}
      </LinearGradient>

      {mode === 'DEMO' ? <ModePill /> : null}

      {/* KYC nudge */}
      {profile && profile.kycStatus !== 'VERIFIED' ? (
        <Pressable onPress={() => router.push('/kyc')} style={st.kycNudge}>
          <Ionicons name="shield-outline" color={dark.yellow} size={22} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: dark.text, fontWeight: '900', fontSize: 13 }}>Verify your identity</Text>
            <Text style={{ color: dark.muted, fontSize: 11, marginTop: 2 }}>Required for withdrawals and higher limits</Text>
          </View>
          <Ionicons name="chevron-forward" color={dark.muted} size={17} />
        </Pressable>
      ) : null}

      {/* Settings groups */}
      {groups.map((group) => (
        <View key={group.title}>
          <SectionHeader title={group.title} />
          <Card>
            {group.rows.map((item, index) => (
              <Pressable
                key={item.title}
                onPress={() => router.push(item.route)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 14,
                  borderBottomWidth: index === group.rows.length - 1 ? 0 : 1,
                  borderBottomColor: dark.border,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <View style={[st.rowIcon, item.icon === 'trash-outline' && { backgroundColor: '#2A0E14' }]}>
                  <Ionicons
                    name={item.icon}
                    color={item.icon === 'trash-outline' ? dark.red : dark.green}
                    size={18}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: item.icon === 'trash-outline' ? dark.red : dark.text, fontWeight: '800', fontSize: 14 }}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={2} style={{ color: dark.muted, fontSize: 11, lineHeight: 16, paddingTop: 2 }}>
                    {item.detail}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" color={dark.muted} size={16} />
              </Pressable>
            ))}
          </Card>
        </View>
      ))}

      {/* Preferences */}
      <SectionHeader title="Preferences" />
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: dark.text, fontWeight: '800', fontSize: 14 }}>Smart alerts</Text>
            <Text style={{ color: dark.muted, fontSize: 11, lineHeight: 16, paddingTop: 2 }}>
              Money movement, security, P2P and market alerts
            </Text>
          </View>
          <Switch
            value={alerts}
            onValueChange={setAlerts}
            trackColor={{ false: dark.borderStrong, true: dark.greenDeep }}
            thumbColor={alerts ? dark.green : dark.muted}
          />
        </View>
      </Card>

      {/* Sign out */}
      <Button title="Sign out" kind="outline" onPress={handleLogout} icon="log-out-outline" />

      <Text style={st.version}>
        MemeZo 0.1.0 · {mode === 'DEMO' ? 'Demo Mode' : 'Live Mode'}
      </Text>
    </Page>
  );
}

const st = StyleSheet.create({
  profileCard: { borderRadius: 18, padding: 18, gap: 14, borderWidth: 1, borderColor: '#1A3A27' },
  avatarLarge: { width: 60, height: 60, borderRadius: 20, backgroundColor: dark.greenSoft, borderWidth: 1.5, borderColor: `${dark.green}50`, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: dark.green, fontWeight: '900', fontSize: 20 },
  profileName: { color: dark.text, fontSize: 20, fontWeight: '900' },
  profileEmail: { color: dark.muted, fontSize: 13, marginTop: 2 },
  profileHandle: { color: dark.green, fontSize: 12, fontWeight: '700', marginTop: 1 },
  referralRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1A3A27' },
  kycNudge: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, backgroundColor: '#1C180D', borderWidth: 1, borderColor: '#4D3E1D', alignItems: 'center' },
  rowIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: dark.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  version: { color: dark.muted, fontSize: 11, textAlign: 'center' },
});
