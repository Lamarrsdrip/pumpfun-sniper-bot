import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/api';
import { Button, EmptyState, ModePill, Page, SectionHeader, StatusPill } from '@/components';
import { demoNotifications } from '@/demo';
import { useSession } from '@/store';
import { dark } from '@/theme';

type Notif = {
  id: string; title: string; body: string; time: string;
  type: string; unread: boolean;
};

export default function NotificationsScreen() {
  const { mode, setNotifUnread } = useSession();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifs();
  }, []);

  const loadNotifs = async () => {
    setLoading(true);
    try {
      const result = await api<{ notifications: Notif[] }>('/v1/notifications');
      setItems(result.notifications);
      const unread = result.notifications.filter((n) => n.unread).length;
      setNotifUnread(unread);
    } catch {
      // Fall back to demo notifications in demo mode
      setItems(demoNotifications as Notif[]);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api('/v1/notifications/read-all', { method: 'POST' });
      setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
      setNotifUnread(0);
    } catch {
      setItems((prev) => prev.map((n) => ({ ...n, unread: false })));
      setNotifUnread(0);
    }
  };

  const markRead = async (id: string) => {
    try {
      await api(`/v1/notifications/${id}/read`, { method: 'POST' });
    } catch {}
    setItems((prev) => {
      const updated = prev.map((n) => n.id === id ? { ...n, unread: false } : n);
      setNotifUnread(updated.filter((n) => n.unread).length);
      return updated;
    });
  };

  const unread = items.filter((n) => n.unread).length;

  return (
    <Page>
      <View style={st.header}>
        <View>
          <Text style={st.title}>Notifications</Text>
          <Text style={st.sub}>
            {unread > 0 ? `${unread} unread` : 'All caught up'}
          </Text>
        </View>
        {unread > 0 ? (
          <Pressable onPress={markAllRead} style={st.markAll}>
            <Text style={st.markAllText}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      {mode === 'DEMO' ? <ModePill compact /> : null}

      {loading ? (
        <EmptyState title="Loading notifications..." body="" loading icon="notifications-outline" />
      ) : items.length === 0 ? (
        <EmptyState
          icon="notifications-off-outline"
          title="No notifications yet"
          body="You'll receive alerts for deposits, withdrawals, trades, and security events here."
        />
      ) : (
        <View style={{ gap: 8 }}>
          {items.map((item) => (
            <NotifCard key={item.id} item={item} onPress={() => markRead(item.id)} />
          ))}
        </View>
      )}
    </Page>
  );
}

function NotifCard({ item, onPress }: { item: Notif; onPress: () => void }) {
  const icon: keyof typeof Ionicons.glyphMap =
    item.type === 'money' ? 'cash-outline'
      : item.type === 'security' ? 'shield-checkmark-outline'
        : item.type === 'p2p' ? 'people-outline'
          : item.type === 'market' ? 'pulse-outline'
            : item.type === 'trade' ? 'trending-up-outline'
              : item.type === 'crypto' ? 'logo-bitcoin'
                : 'notifications-outline';

  const color =
    item.type === 'security' ? dark.cyan
      : item.type === 'p2p' ? dark.yellow
        : item.type === 'market' ? dark.purple
          : dark.green;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      st.card,
      item.unread && st.cardUnread,
      pressed && { opacity: 0.75 },
    ]}>
      <View style={[st.iconWrap, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} color={color} size={20} />
        {item.unread ? <View style={st.unreadDot} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <Text style={[st.notifTitle, item.unread && { color: dark.white }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={st.notifTime}>{item.time}</Text>
        </View>
        <Text style={st.notifBody} numberOfLines={2}>{item.body}</Text>
        {item.unread ? (
          <View style={{ marginTop: 6 }}>
            <StatusPill label="NEW" tone="success" />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  title: { color: dark.text, fontSize: 28, fontWeight: '900' },
  sub: { color: dark.muted, fontSize: 13, marginTop: 2 },
  markAll: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: dark.green },
  markAllText: { color: dark.green, fontSize: 12, fontWeight: '900' },
  card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, backgroundColor: dark.surface, borderWidth: 1, borderColor: dark.border },
  cardUnread: { backgroundColor: dark.surfaceRaised, borderColor: dark.borderStrong },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  unreadDot: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, backgroundColor: dark.green, borderWidth: 2, borderColor: dark.background },
  notifTitle: { color: dark.text, fontWeight: '900', flex: 1, fontSize: 13 },
  notifTime: { color: dark.muted, fontSize: 10, paddingTop: 1 },
  notifBody: { color: dark.mutedStrong, fontSize: 11, lineHeight: 17, paddingTop: 4 },
});
