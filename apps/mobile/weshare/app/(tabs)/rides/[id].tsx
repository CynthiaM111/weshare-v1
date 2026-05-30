import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import { passengerDisplayName } from '@/lib/auth/users';
import {
  declineBooking,
  listBookingsForRideWithPassengers,
  updateBookingStatus,
  type Booking,
  type BookingWithPassenger,
} from '@/lib/bookings';
import { cancelRide, getRide, updateRideStatus, type Ride } from '@/lib/rides';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const GREEN = '#22C55E';
const RED = '#EF4444';
const GOLD = '#F5C842';

const BOOKING_STATUS_COLOR: Record<string, string> = {
  pending: GOLD,
  confirmed: TEAL,
  cancelled: RED,
  completed: '#0EA5E9',
};

const RIDE_STATUS_COLOR: Record<string, string> = {
  active: TEAL,
  completed: '#0EA5E9',
  cancelled: RED,
};

type BookingRow = BookingWithPassenger;

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

export default function RideDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();

  const [ride, setRide] = useState<Ride | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);

  const textPri = isDark ? '#FFF' : NAVY;
  const textSub = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(8,17,31,0.48)';
  const hair = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(8,17,31,0.09)';
  const inputBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(8,17,31,0.05)';
  const cardBg = isDark ? NAVY_2 : '#FFF';
  const bg = isDark ? NAVY : '#F5F7FA';

  const load = useCallback(async () => {
    if (!id) return;
    const [r, bList] = await Promise.all([getRide(id), listBookingsForRideWithPassengers(id)]);
    setRide(r);
    setBookings(bList);
  }, [id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function onBookingAction(bookingId: string, status: Booking['status']) {
    setActionId(bookingId);
    const err = await updateBookingStatus(bookingId, status);
    setActionId(null);
    if (!err) {
      setBookings(prev => prev.map(b => (b.id === bookingId ? { ...b, status } : b)));
    }
  }

  async function onDeclineBooking(bookingId: string, rideId: string) {
    setActionId(bookingId);
    const err = await declineBooking(bookingId, rideId);
    setActionId(null);
    if (!err) {
      setBookings(prev =>
        prev.map(b => (b.id === bookingId ? { ...b, status: 'cancelled' } : b))
      );
    }
  }

  async function onCompleteRide() {
    if (!id) return;
    const err = await updateRideStatus(id, 'completed');
    if (!err) setRide(prev => (prev ? { ...prev, status: 'completed' } : prev));
  }

  async function onCancelRide() {
    if (!id) return;
    const err = await cancelRide(id);
    if (!err) {
      setRide(prev => (prev ? { ...prev, status: 'cancelled' } : prev));
      setBookings(prev =>
        prev.map(b =>
          b.status === 'pending' || b.status === 'confirmed'
            ? { ...b, status: 'cancelled' as const }
            : b
        )
      );
    }
    setCancelConfirm(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!ride) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <View style={styles.center}>
          <ThemedText style={[styles.headerTitle, { color: textPri }]}>Ride not found</ThemedText>
          <Pressable onPress={() => router.replace('/my-rides' as any)} style={[styles.outlineBtn, { borderColor: hair }]}>
            <ThemedText style={[styles.outlineBtnText, { color: textPri }]}>Go back</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = session?.userId === ride.postedByUserId;
  const depart = new Date(ride.departAtISO);
  const allBookingsSettled = bookings.every(
    b => b.status === 'confirmed' || b.status === 'cancelled'
  );
  const showCompleteRide = isOwner && ride.status === 'active' && allBookingsSettled;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: hair, backgroundColor: cardBg }]}>
        <Pressable onPress={() => router.replace('/my-rides' as any)} hitSlop={12}>
          <IconSymbol name="chevron.left" size={20} color={ACCENT} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: textPri }]}>Ride details</ThemedText>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Ride summary */}
        <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: hair }]}>
          <View style={styles.summaryTop}>
            <View style={{ flex: 1 }}>
              <View style={styles.chipRow}>
                <View style={[styles.chip, { backgroundColor: TEAL + '18' }]}>
                  <ThemedText style={[styles.chipText, { color: TEAL }]}>{ride.fromShort}</ThemedText>
                </View>
                <ThemedText style={[styles.arrow, { color: textSub }]}>→</ThemedText>
                <View style={[styles.chip, { backgroundColor: ACCENT + '18' }]}>
                  <ThemedText style={[styles.chipText, { color: ACCENT }]}>{ride.toShort}</ThemedText>
                </View>
              </View>
              <View style={styles.metaRow}>
                <IconSymbol name="clock.fill" size={13} color={textSub} />
                <ThemedText style={[styles.metaText, { color: textSub }]}>
                  {Number.isNaN(depart.getTime()) ? ride.departAtISO : formatDepart(depart)}
                </ThemedText>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: RIDE_STATUS_COLOR[ride.status] + '22' }]}>
              <ThemedText style={[styles.statusBadgeText, { color: RIDE_STATUS_COLOR[ride.status] }]}>
                {ride.status}
              </ThemedText>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={[styles.detailChip, { backgroundColor: inputBg }]}>
              <IconSymbol name="person.2.fill" size={12} color={textSub} />
              <ThemedText style={[styles.metaText, { color: textSub }]}>
                {ride.seats} seat{ride.seats === 1 ? '' : 's'}
              </ThemedText>
            </View>
            <View style={[styles.detailChip, { backgroundColor: inputBg }]}>
              <ThemedText style={[styles.priceText, { color: textPri }]}>
                RWF {ride.priceRwf.toLocaleString()} / seat
              </ThemedText>
            </View>
          </View>

          {ride.note ? (
            <View style={[styles.noteBox, { backgroundColor: inputBg }]}>
              <IconSymbol name="text.bubble.fill" size={12} color={textSub} />
              <ThemedText style={[styles.noteText, { color: textSub }]}>{ride.note}</ThemedText>
            </View>
          ) : null}
        </View>

        {isOwner && ride.status === 'active' && (
          cancelConfirm ? (
            <View style={[styles.declineBtn, { height: 'auto', paddingVertical: 10, gap: 8, backgroundColor: '#EF444414', borderColor: '#EF444430', borderWidth: 1 }]}>
              <ThemedText style={[styles.actionBtnText, { color: '#EF4444' }]} numberOfLines={2}>
                This will cancel all passenger bookings
              </ThemedText>
              <View style={styles.actions}>
                <Pressable
                  onPress={onCancelRide}
                  style={[styles.declineBtn, { backgroundColor: '#EF4444' }]}
                >
                  <ThemedText style={styles.actionBtnText}>Yes, cancel ride</ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => setCancelConfirm(false)}
                  style={[styles.confirmBtn, { backgroundColor: inputBg }]}
                >
                  <ThemedText style={[styles.actionBtnText, { color: textPri }]}>Never mind</ThemedText>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setCancelConfirm(true)}
              style={[styles.declineBtn, { backgroundColor: '#EF444414', borderColor: '#EF444430', borderWidth: 1 }]}
            >
              <ThemedText style={[styles.actionBtnText, { color: '#EF4444' }]}>Cancel</ThemedText>
            </Pressable>
          )
        )}

        {/* Bookings */}
        <ThemedText style={[styles.sectionTitle, { color: textPri }]}>
          Bookings ({bookings.length})
        </ThemedText>

        {bookings.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: cardBg, borderColor: hair }]}>
            <ThemedText style={[styles.emptyText, { color: textSub }]}>
              No bookings yet for this ride.
            </ThemedText>
          </View>
        ) : (
          bookings.map(b => {
            const total = ride.priceRwf * b.seats;
            const busy = actionId === b.id;

            return (
              <View key={b.id} style={[styles.bookingCard, { backgroundColor: cardBg, borderColor: hair }]}>
                <View style={styles.bookingTop}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={[styles.passengerName, { color: textPri }]}>
                      {passengerDisplayName(b.passengerProfile, b.passengerId)}
                    </ThemedText>
                    <ThemedText style={[styles.bookingMeta, { color: textSub }]}>
                      {b.seats} seat{b.seats === 1 ? '' : 's'} · RWF {total.toLocaleString()}
                    </ThemedText>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: BOOKING_STATUS_COLOR[b.status] + '22' }]}>
                    <ThemedText style={[styles.statusBadgeText, { color: BOOKING_STATUS_COLOR[b.status] }]}>
                      {b.status}
                    </ThemedText>
                  </View>
                </View>

                {isOwner && b.status === 'pending' && (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => onBookingAction(b.id, 'confirmed')}
                      disabled={busy}
                      style={[styles.confirmBtn, { opacity: busy ? 0.6 : 1 }]}
                    >
                      <ThemedText style={styles.actionBtnText}>Confirm</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => onDeclineBooking(b.id, b.rideId)}
                      disabled={busy}
                      style={[styles.declineBtn, { opacity: busy ? 0.6 : 1 }]}
                    >
                      <ThemedText style={styles.actionBtnText}>Decline</ThemedText>
                    </Pressable>
                  </View>
                )}

                {b.status === 'confirmed' && (
                  <View style={styles.confirmedRow}>
                    <IconSymbol name="checkmark.circle.fill" size={14} color={textSub} />
                    <ThemedText style={[styles.confirmedLabel, { color: textSub }]}>Confirmed</ThemedText>
                  </View>
                )}
              </View>
            );
          })
        )}

        {showCompleteRide && (
          <Pressable onPress={onCompleteRide} style={styles.completeWrap}>
            <LinearGradient
              colors={[TEAL, '#00A896']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.completeGrad}
            >
              <ThemedText style={styles.completeText}>Mark as completed</ThemedText>
            </LinearGradient>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '900' },
  scroll: { padding: 16, gap: 12 },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  chipRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 13, fontWeight: '900' },
  arrow: { fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  metaText: { fontSize: 13, fontWeight: '600' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  statusBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  priceText: { fontSize: 13, fontWeight: '800' },
  noteBox: { flexDirection: 'row', gap: 8, borderRadius: 10, padding: 10, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginTop: 4 },
  emptyBox: { borderRadius: 14, borderWidth: 1, padding: 16 },
  emptyText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  bookingCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  bookingTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  passengerName: { fontSize: 15, fontWeight: '800' },
  bookingMeta: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  confirmBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  confirmedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confirmedLabel: { fontSize: 13, fontWeight: '700' },
  completeWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  completeGrad: { height: 50, alignItems: 'center', justifyContent: 'center' },
  completeText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  outlineBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700' },
}) as any;
