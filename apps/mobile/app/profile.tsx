import { useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Switch, Text, View } from 'react-native';
import { AppHeader, AssetIcon, Card, ModePill, Page, SectionHeader, StatusPill } from '@/components';
import { dark } from '@/theme';

const groups = [
  {
    title: 'Account',
    rows: [
      { icon: 'person-outline', title: 'Personal details', detail: 'Name, phone, email and address', route: '/kyc' },
      { icon: 'shield-checkmark-outline', title: 'Security center', detail: 'PIN, biometrics, 2FA and devices', route: '/security' },
      { icon: 'briefcase-outline', title: 'Business account', detail: 'KYB, higher limits and team access', route: '/business' },
      { icon: 'logo-whatsapp', title: 'WhatsApp Assistant', detail: 'Link chat alerts and payment preparation', route: '/whatsapp' }
    ]
  },
  {
    title: 'Money and benefits',
    rows: [
      { icon: 'receipt-outline', title: 'Statements and receipts', detail: 'Payments, swaps and downloadable records', route: '/transactions' },
      { icon: 'gift-outline', title: 'Rewards and referrals', detail: 'Invite rewards and cashback history', route: '/rewards' },
      { icon: 'wallet-outline', title: 'Savings', detail: 'Goals, flex savings and locked plans', route: '/savings' },
      { icon: 'speedometer-outline', title: 'Account limits', detail: 'Tier 2 · ₦5,000,000 daily Demo limit', route: '/kyc' }
    ]
  },
  {
    title: 'Help and privacy',
    rows: [
      { icon: 'help-circle-outline', title: 'Support center', detail: 'Payments, trades, cards and disputes', route: '/support' },
      { icon: 'document-text-outline', title: 'Legal and risk notices', detail: 'Terms, privacy and crypto disclosures', route: '/support' },
      { icon: 'trash-outline', title: 'Delete account', detail: 'Start the secure closure process', route: '/support' }
    ]
  }
] as const;

export default function ProfileScreen() {
  const [alerts, setAlerts] = useState(true);
  return <Page>
    <AppHeader title="Your account" onNotifications={() => router.push('/notifications')} unread={2} />
    <Card>
      <View style={{ flexDirection: 'row', gap: 13, alignItems: 'center' }}>
        <AssetIcon symbol="AN" size={58} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: dark.text, fontSize: 21, fontWeight: '900' }}>Ada Nwosu</Text>
          <Text numberOfLines={1} style={{ color: dark.muted, paddingTop: 3 }}>ada@demo.memezo.ng</Text>
          <View style={{ flexDirection: 'row', gap: 6, paddingTop: 9, flexWrap: 'wrap' }}>
            <StatusPill label="Tier 2" tone="info" />
            <StatusPill label="KYC verified" tone="success" />
          </View>
        </View>
      </View>
    </Card>
    <ModePill />
    {groups.map((group) => <View key={group.title}>
      <SectionHeader title={group.title} />
      <Card>
        {group.rows.map((item, index) => <Pressable
          key={item.title}
          onPress={() => router.push(item.route)}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 13,
            borderBottomWidth: index === group.rows.length - 1 ? 0 : 1,
            borderBottomColor: dark.border,
            opacity: pressed ? 0.65 : 1
          })}
        >
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: dark.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={item.icon} color={item.icon === 'trash-outline' ? dark.red : dark.green} size={19} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: dark.text, fontWeight: '800' }}>{item.title}</Text>
            <Text numberOfLines={2} style={{ color: dark.muted, fontSize: 11, lineHeight: 16, paddingTop: 3 }}>{item.detail}</Text>
          </View>
          <Ionicons name="chevron-forward" color={dark.muted} size={17} />
        </Pressable>)}
      </Card>
    </View>)}
    <SectionHeader title="Preferences" />
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: dark.text, fontWeight: '800' }}>Smart alerts</Text>
          <Text style={{ color: dark.muted, fontSize: 11, lineHeight: 16, paddingTop: 3 }}>Money movement, security, P2P and watched markets.</Text>
        </View>
        <Switch value={alerts} onValueChange={setAlerts} trackColor={{ false: dark.borderStrong, true: dark.greenDeep }} />
      </View>
    </Card>
    <Text style={{ color: dark.muted, fontSize: 11, lineHeight: 17, textAlign: 'center' }}>MemeZo 0.1.0 · Administration remains in the separate role-protected web portal.</Text>
  </Page>;
}
