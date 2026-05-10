import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useThemeColors } from '@/hooks/use-theme-color';
import { listBookingsForRide, updateBookingStatus, type Booking } from '@/lib/bookings';
import { getRide, updateRideStatus, type Ride } from '@/lib/rides';
import { getProfile, type UserProfile } from '@/lib/auth/users';

type BookingRow = Booking & { passengerProfile: UserProfile | null };

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: Colors.success,
  cancelled: Colors.danger,
  completed: Colors.info,
};

export default function RideDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useThemeColors();
  const { session } = useSession();

  const [ride, setRide] = useState<Ride | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    if (!id) return;
    const [r, bList] = await Promise.all([getRide(id), listBookingsForRide(id)]);
    setRide(r);
    const withProfiles = await Promise.all(
      bList.map(async b => ({ ...b, passengerProfile: await getProfile(b.passengerId) }))
    );
    setBookings(withProfiles);
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, [id]);
  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function onBookingAction(bookingId: string, status: Booking['status']) {
    await updateBookingStatus(bookingId, status);
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
  }

  async function onCompleteRide() {
    if (!id) return;
    await updateRideStatus(id, 'completed');
    setRide(prev => prev ? { ...prev, status: 'completed' } : prev);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!ride) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
        <View style={styles.center}>
          <ThemedText style={[styles.title, { color: c.text }]}>Ride not found</ThemedText>
          <Pressable onPress={() => router.back()} style={styles.btn}><ThemedText style={styles.btnText}>Back</ThemedText></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = session?.userId === ride.postedByUserId;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: c.hairline }]}>
        <Pressable onPress={() => router.back()}>
          <ThemedText style={[styles.back, { color: Colors.accent }]}>← Back</ThemedText>
        </Pressable>
        <ThemedText style={[styles.title, { color: c.text }]}>Ride Details</ThemedText>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Ride summary */}
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.hairline }, Shadow.card]}>
          <ThemedText style={[styles.route, { color: c.text }]}>{ride.fromShort} → {ride.toShort}</ThemedText>
          <ThemedText style={[styles.meta, { color: c.subText }]}>
            {new Date(ride.departAtISO).toLocaleString()} · {ride.seats} seats · RWF {ride.priceRwf.toLocaleString()}/seat
          </ThemedText>
          <View style={[styles.badge, { backgroundColor: STATUS_COLOR[ride.status] + '22', alignSelf: 'flex-start' }]}>
            <ThemedText style={[styles.badgeText, { color: STATUS_COLOR[ride.status] }]}>{ride.status}</ThemedText>
          </View>
          {ride.note ? <ThemedText style={[styles.note, { color: c.subText }]}>{ride.note}</ThemedText> : null}
        </View>

        {/* Complete ride button */}
        {isOwner && ride.status === 'active' && (
          <Pressable onPress={onCompleteRide} style={[styles.btn, { backgroundColor: Colors.success }]}>
            <ThemedText style={styles.btnText}>Mark ride as completed</ThemedText>
          </Pressable>
        )}

        {/* Bookings list */}
        <ThemedText style={[styles.sectionTitle, { color: c.text }]}>
          Bookings ({bookings.length})
        </ThemedText>

        {bookings.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: c.surface, borderColor: c.hairline }]}>
            <ThemedText style={[styles.meta, { color: c.subText }]}>No bookings yet for this ride.</ThemedText>
          </View>
        ) : bookings.map(b => (
          <View key={b.id} style={[styles.bookingCard, { backgroundColor: c.surface, borderColor: c.hairline }]}>
            <View style={styles.bookingTop}>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.passengerName, { color: c.text }]}>
                  {b.passengerProfile?.fullName ?? 'Unknown passenger'}
                </ThemedText>
                <ThemedText style={[styles.meta, { color: c.subText }]}>
                  {b.seats} seat{b.seats > 1 ? 's' : ''} · RWF {(ride.priceRwf * b.seats).toLocaleString()}
                </ThemedText>
              </View>
              <View style={[styles.badge, { backgroundColor: STATUS_COLOR[b.status] + '22' }]}>
                <ThemedText style={[styles.badgeText, { color: STATUS_COLOR[b.status] }]}>{b.status}</ThemedText>
              </View>
            </View>

            {isOwner && b.status === 'pending' && (
              <View style={styles.actions}>
                <Pressable onPress={() => onBookingAction(b.id, 'confirmed')} style={[styles.actionBtn, { backgroundColor: Colors.success }]}>
                  <ThemedText style={styles.actionText}>Confirm</ThemedText>
                </Pressable>
                <Pressable onPress={() => onBookingAction(b.id, 'cancelled')} style={[styles.actionBtn, { backgroundColor: Colors.danger }]}>
                  <ThemedText style={styles.actionText}>Decline</ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  back: { fontSize: 15, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '900' },
  scroll: { padding: 16, gap: 12 },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: 14, gap: 6 },
  route: { fontSize: 17, fontWeight: '900' },
  meta: { fontSize: 13, fontWeight: '600' },
  badge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  note: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  btn: { height: 50, borderRadius: Radius.lg, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: 'white', fontSize: 14, fontWeight: '900' },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginTop: 4 },
  emptyBox: { borderRadius: Radius.md, borderWidth: 1, padding: 14 },
  bookingCard: { borderRadius: Radius.lg, borderWidth: 1, padding: 14, gap: 10 },
  bookingTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  passengerName: { fontSize: 15, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: 'white', fontSize: 13, fontWeight: '900' },
}) as any;
