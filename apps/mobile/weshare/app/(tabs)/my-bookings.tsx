/**
 * WeShare — Bookings (Passenger view)
 * Auth-gated. Shows rides the logged-in user has booked as a passenger.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AuthGate } from '@/components/ui/AuthGate';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import {
  cancelBooking,
  listMyBookingsWithRides,
  type BookingWithRide,
} from '@/lib/bookings';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const GOLD = '#F5C842';

const STATUS_COLOR: Record<string, string> = {
  pending: GOLD,
  confirmed: TEAL,
  completed: '#0EA5E9',
  cancelled: '#EF4444',
};

function formatDepart(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export default function MyBookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { session } = useSession();

  const textPri = isDark ? '#FFF' : NAVY;
  const textSub = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(8,17,31,0.48)';
  const hair = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(8,17,31,0.09)';
  const inputBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(8,17,31,0.05)';
  const cardBg = isDark ? NAVY_2 : '#FFF';
  const bg = isDark ? NAVY : '#F5F7FA';

  if (!session) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <AuthGate
          icon="ticket"
          title="Bookings"
          description="Sign in to see rides you've booked as a passenger."
          redirectPath="/my-bookings"
        />
      </SafeAreaView>
    );
  }

  return (
    <MyBookingsList
      session={session}
      router={router}
      insets={insets}
      bg={bg}
      cardBg={cardBg}
      hair={hair}
      textPri={textPri}
      textSub={textSub}
      inputBg={inputBg}
    />
  );
}

function MyBookingsList({
  session,
  router,
  insets,
  bg,
  cardBg,
  hair,
  textPri,
  textSub,
  inputBg,
}: {
  session: { userId: string };
  router: ReturnType<typeof useRouter>;
  insets: ReturnType<typeof useSafeAreaInsets>;
  bg: string;
  cardBg: string;
  hair: string;
  textPri: string;
  textSub: string;
  inputBg: string;
}) {
  const [bookings, setBookings] = useState<BookingWithRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listMyBookingsWithRides(session.userId);
      setBookings(data);
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

  function onCancel(bookingId: string) {
    Alert.alert('Cancel booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: async () => {
          const err = await cancelBooking(bookingId);
          if (err) {
            Alert.alert('Could not cancel', err);
            return;
          }
          setBookings(prev =>
            prev.map(b => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
          );
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: hair, backgroundColor: cardBg }]}>
        <ThemedText style={[styles.headerTitle, { color: textPri }]}>Bookings</ThemedText>
        <Pressable onPress={() => router.push('/' as any)} style={styles.findBtn}>
          <LinearGradient colors={[TEAL, '#00A896']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.findBtnGrad}>
            <IconSymbol name="magnifyingglass" size={14} color="#fff" />
            <ThemedText style={styles.findBtnText}>Find ride</ThemedText>
          </LinearGradient>
        </Pressable>
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
          {bookings.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: hair }]}>
              <ThemedText style={{ fontSize: 40 }}>🎫</ThemedText>
              <ThemedText style={[styles.emptyTitle, { color: textPri }]}>No bookings yet</ThemedText>
              <ThemedText style={[styles.emptySub, { color: textSub }]}>
                Search for a ride and request a seat — your bookings will show up here.
              </ThemedText>
              <Pressable onPress={() => router.push('/' as any)} style={styles.emptyBtn}>
                <LinearGradient colors={[ACCENT, '#FF4500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyBtnGrad}>
                  <ThemedText style={styles.emptyBtnText}>Find a ride →</ThemedText>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            bookings.map(b => {
              const ride = b.ride;
              const depart = ride ? new Date(ride.departAtISO) : null;
              const total = ride ? ride.priceRwf * b.seats : null;
              const canCancel = b.status === 'pending' || b.status === 'confirmed';

              return (
                <View key={b.id} style={[styles.bookingCard, { backgroundColor: cardBg, borderColor: hair }]}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      {ride ? (
                        <View style={styles.chipRow}>
                          <View style={[styles.chip, { backgroundColor: inputBg }]}>
                            <View style={[styles.routeDot, { backgroundColor: TEAL }]} />
                            <ThemedText style={[styles.chipText, { color: textPri }]}>{ride.fromShort}</ThemedText>
                          </View>
                          <ThemedText style={[styles.arrow, { color: textSub }]}>→</ThemedText>
                          <View style={[styles.chip, { backgroundColor: inputBg }]}>
                            <View style={[styles.routeDot, { backgroundColor: ACCENT }]} />
                            <ThemedText style={[styles.chipText, { color: textPri }]}>{ride.toShort}</ThemedText>
                          </View>
                        </View>
                      ) : (
                        <ThemedText style={[styles.chipText, { color: textSub }]}>Ride unavailable</ThemedText>
                      )}
                      {depart && !Number.isNaN(depart.getTime()) && (
                        <View style={styles.metaRow}>
                          <IconSymbol name="clock.fill" size={11} color={textSub} />
                          <ThemedText style={[styles.metaText, { color: textSub }]}>
                            {formatDepart(depart)}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: inputBg }]}>
                      <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[b.status] }]} />
                      <ThemedText style={[styles.statusText, { color: textSub }]}>{b.status}</ThemedText>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={[styles.detailChip, { backgroundColor: inputBg }]}>
                      <IconSymbol name="person.fill" size={11} color={textSub} />
                      <ThemedText style={[styles.metaText, { color: textSub }]}>
                        {b.seats} seat{b.seats === 1 ? '' : 's'}
                      </ThemedText>
                    </View>
                    {total != null && (
                      <View style={[styles.detailChip, { backgroundColor: inputBg }]}>
                        <ThemedText style={[styles.metaText, { color: textPri, fontWeight: '800' }]}>
                          RWF {total.toLocaleString()} total
                        </ThemedText>
                      </View>
                    )}
                  </View>

                  {canCancel && (
                    <View style={[styles.actionsRow, { borderTopColor: hair }]}>
                      <Pressable
                        onPress={() => onCancel(b.id)}
                        style={[styles.actionBtn, { backgroundColor: '#EF444414', borderColor: '#EF444430', borderWidth: 1 }]}
                      >
                        <ThemedText style={[styles.actionText, { color: '#EF4444' }]}>Cancel booking</ThemedText>
                      </Pressable>
                    </View>
                  )}
                </View>
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
  findBtn: { borderRadius: 10, overflow: 'hidden' },
  findBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7 },
  findBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  scroll: { padding: 16, gap: 12 },
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptySub: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  emptyBtn: { borderRadius: 14, overflow: 'hidden', width: '100%', marginTop: 4 },
  emptyBtnGrad: { height: 48, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  bookingCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  routeDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { fontSize: 13, fontWeight: '900' },
  arrow: { fontSize: 11 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  metaText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionsRow: { paddingTop: 10, borderTopWidth: 1 },
  actionBtn: { height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actionText: { fontSize: 13, fontWeight: '700' },
}) as any;
