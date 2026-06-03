/**
 * WeShare — Notifications
 * Auth-gated. In-app feed of booking & ride updates for the logged-in user.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AuthGate } from '@/components/ui/AuthGate';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import {
  listNotifications,
  markAllAsRead,
  markAsRead,
  type Notification,
} from '@/lib/notifications';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const GOLD = '#F5C842';
const RED = '#EF4444';
const BLUE = '#0EA5E9';

type IconConfig = { icon: string; color: string };

const TYPE_CONFIG: Record<string, IconConfig> = {
  new_booking: { icon: 'person.crop.circle.badge.plus', color: ACCENT },
  payment_received: { icon: 'plus.circle.fill', color: TEAL },
  booking_pending: { icon: 'clock.fill', color: GOLD },
  booking_confirmed: { icon: 'checkmark.circle.fill', color: TEAL },
  booking_cancelled: { icon: 'xmark.circle.fill', color: RED },
  ride_cancelled: { icon: 'xmark.circle.fill', color: RED },
  ride_completed: { icon: 'checkmark.seal.fill', color: BLUE },
};

const DEFAULT_CONFIG: IconConfig = { icon: 'bell.fill', color: TEAL };

function configForType(type: string): IconConfig {
  return TYPE_CONFIG[type] ?? DEFAULT_CONFIG;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);

  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;

  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;

  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { session } = useSession();

  const bg = isDark ? NAVY : '#F5F7FA';

  if (!session) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <AuthGate
          icon="bell.fill"
          title="Notifications"
          description="Sign in to get updates about your bookings and rides."
          redirectPath="/notifications"
        />
      </SafeAreaView>
    );
  }

  return <NotificationsList session={session} isDark={isDark} bg={bg} />;
}

function NotificationsList({
  session,
  isDark,
  bg,
}: {
  session: { userId: string };
  isDark: boolean;
  bg: string;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const textPri = isDark ? '#FFF' : NAVY;
  const textSub = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(8,17,31,0.48)';
  const hair = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(8,17,31,0.09)';
  const cardBg = isDark ? NAVY_2 : '#FFF';

  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listNotifications(session.userId);
      setItems(data);
    } finally {
      setLoading(false);
    }
  }, [session.userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function onPressItem(n: Notification) {
    // Always mark as read first, so it sticks even if navigation fails.
    setItems(prev => prev.map(it => (it.id === n.id ? { ...it, read: true } : it)));
    await markAsRead(n.id);

    switch (n.type) {
      case 'new_booking':
        // Driver taps → go to their ride detail to confirm/decline
        if (n.rideId) router.push(`/rides/${n.rideId}` as any);
        break;

      case 'booking_pending':
        if (n.bookingId) {
          router.push({ pathname: '/my-bookings', params: { expandBookingId: n.bookingId } } as any);
        } else {
          router.push('/my-bookings' as any);
        }
        break;

      case 'payment_received':
        if (n.rideId) router.push(`/rides/${n.rideId}` as any);
        break;

      case 'booking_confirmed':
        // Passenger taps → go to My Bookings to see confirmed booking
        router.push('/my-bookings' as any);
        break;

      case 'booking_declined':
        // Passenger taps → go back to Find Ride to search again
        router.push('/' as any);
        break;

      case 'booking_cancelled':
        // Both driver and passenger → infer from message text
        if (n.message.toLowerCase().includes('driver')) {
          router.push('/my-rides' as any);
        } else {
          router.push('/my-bookings' as any);
        }
        break;

      case 'ride_cancelled':
        // Passenger taps → go to Find Ride to search for another ride
        router.push('/' as any);
        break;

      case 'ride_completed':
        // Both → infer from message text
        if (
          n.message.toLowerCase().includes('driver') ||
          n.message.toLowerCase().includes('your ride from')
        ) {
          router.push('/my-bookings' as any);
        } else {
          router.push('/my-rides' as any);
        }
        break;

      default:
        // No navigation for unknown types
        break;
    }
  }

  async function onMarkAll() {
    setItems(prev => prev.map(it => ({ ...it, read: true })));
    await markAllAsRead(session.userId);
  }

  const unreadCount = items.filter(it => !it.read).length;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: hair, backgroundColor: cardBg }]}>
        <ThemedText style={[styles.headerTitle, { color: textPri }]}>Notifications</ThemedText>
        {unreadCount > 0 && (
          <Pressable onPress={onMarkAll} hitSlop={8}>
            <ThemedText style={[styles.markAll, { color: TEAL }]}>Mark all as read</ThemedText>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
          showsVerticalScrollIndicator={false}
        >
          {items.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: hair }]}>
              <View style={[styles.emptyIcon, { backgroundColor: ACCENT + '14' }]}>
                <IconSymbol name="bell.fill" size={32} color={ACCENT} />
              </View>
              <ThemedText style={[styles.emptyTitle, { color: textPri }]}>No notifications yet</ThemedText>
              <ThemedText style={[styles.emptySub, { color: textSub }]}>
                You&apos;ll be notified about your bookings and rides here.
              </ThemedText>
            </View>
          ) : (
            items.map(n => {
              const cfg = configForType(n.type);
              return (
                <Pressable
                  key={n.id}
                  onPress={() => onPressItem(n)}
                  style={[
                    styles.row,
                    {
                      backgroundColor: n.read ? cardBg : 'rgba(255,107,53,0.05)',
                      borderColor: hair,
                    },
                    !n.read && styles.rowUnread,
                  ]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: cfg.color + '1F' }]}>
                    <IconSymbol name={cfg.icon as any} size={18} color={cfg.color} />
                  </View>
                  <View style={styles.rowBody}>
                    <ThemedText style={[styles.rowTitle, { color: textPri }]} numberOfLines={1}>
                      {n.title}
                    </ThemedText>
                    <ThemedText style={[styles.rowMessage, { color: textSub }]}>
                      {n.message}
                    </ThemedText>
                  </View>
                  <View style={styles.rowMeta}>
                    <ThemedText style={[styles.rowTime, { color: textSub }]}>
                      {relativeTime(n.createdAt)}
                    </ThemedText>
                    {!n.read && <View style={styles.unreadDot} />}
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  markAll: { fontSize: 13, fontWeight: '800' },
  scroll: { padding: 16, gap: 10 },
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10, marginTop: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptySub: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  rowUnread: {
    borderLeftWidth: 2,
    borderLeftColor: ACCENT,
  },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, fontWeight: '800' },
  rowMessage: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  rowMeta: { alignItems: 'flex-end', gap: 6, paddingLeft: 4 },
  rowTime: { fontSize: 11, fontWeight: '700' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT },
}) as any;
