import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ModePill, Page, StatusPill } from '@/components';
import { demoNotifications } from '@/demo';
import { dark } from '@/theme';

export default function NotificationsScreen() {
  return <Page><View><Text style={{ color: dark.text, fontSize: 28, fontWeight: '900' }}>Notifications</Text><Text style={{ color: dark.muted, paddingTop: 4 }}>Money, security, merchant and market alerts in one place.</Text></View><ModePill />
    {demoNotifications.map((item) => { const icon = item.type === 'money' ? 'cash-outline' : item.type === 'security' ? 'shield-checkmark-outline' : item.type === 'p2p' ? 'people-outline' : 'pulse-outline'; const color = item.type === 'security' ? dark.cyan : item.type === 'p2p' ? dark.yellow : dark.green; return <View key={item.id} style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 14, backgroundColor: item.unread ? dark.surfaceRaised : dark.surface, borderWidth: 1, borderColor: item.unread ? dark.borderStrong : dark.border }}><View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: `${color}18`, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} color={color} size={21} /></View><View style={{ flex: 1 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={{ color: dark.text, fontWeight: '900', flex: 1 }}>{item.title}</Text><Text style={{ color: dark.muted, fontSize: 9 }}>{item.time}</Text></View><Text style={{ color: dark.mutedStrong, fontSize: 11, lineHeight: 17, paddingTop: 4 }}>{item.body}</Text>{item.unread ? <View style={{ paddingTop: 7 }}><StatusPill label="NEW" tone="success" /></View> : null}</View></View>; })}
  </Page>;
}
