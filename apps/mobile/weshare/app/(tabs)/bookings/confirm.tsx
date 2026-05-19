import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import { createBooking } from '@/lib/bookings';
import { getRide, type Ride } from '@/lib/rides';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';

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

export default function ConfirmBookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { session, loading: sessionLoading } = useSession();

  const [ride, setRide] = useState<Ride | null>(null);
  const [loadingRide, setLoadingRide] = useState(true);
  const [seatCount, setSeatCount] = useState(1);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  const textPri = isDark ? '#FFF' : NAVY;
  const textSub = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(8,17,31,0.48)';
  const hair = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(8,17,31,0.09)';
  const inputBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(8,17,31,0.05)';
  const cardBg = isDark ? NAVY_2 : '#FFF';
  const bg = isDark ? NAVY : '#F5F7FA';

  useEffect(() => {
    if (sessionLoading || !rideId) return;
    if (!session) {
      router.replace({
        pathname: '/auth',
        params: {
          redirect: `/bookings/confirm?rideId=${encodeURIComponent(rideId)}`,
        },
      });
    }
  }, [session, sessionLoading, rideId, router]);

  useEffect(() => {
    if (!rideId) return;
    getRide(rideId).then(r => {
      setRide(r);
      setSeatCount(1);
      setLoadingRide(false);
    });
  }, [rideId]);

  async function onBook() {
    if (!session || !ride || booking) return;
    setError('');
    setBooking(true);
    try {
      await createBooking(ride.id, session.userId, seatCount);
      router.replace('/my-bookings');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Booking failed';
      setError(msg);
    } finally {
      setBooking(false);
    }
  }

  if (sessionLoading || loadingRide || !session) {
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
          <ThemedText style={[styles.title, { color: textPri }]}>Ride not found</ThemedText>
          <Pressable onPress={() => router.back()} style={[styles.outlineBtn, { borderColor: hair }]}>
            <ThemedText style={[styles.outlineBtnText, { color: textPri }]}>Go back</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const depart = new Date(ride.departAtISO);
  const total = ride.priceRwf * seatCount;
  const maxSeats = Math.max(1, ride.seats);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: hair, backgroundColor: cardBg }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <IconSymbol name="chevron.left" size={20} color={ACCENT} />
        </Pressable>
        <ThemedText style={[styles.title, { color: textPri }]}>Confirm booking</ThemedText>
        <View style={{ width: 20 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Ride summary */}
        <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: hair }]}>
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

          <ThemedText style={[styles.priceLine, { color: textPri }]}>
            RWF {ride.priceRwf.toLocaleString()}
            <ThemedText style={[styles.pricePer, { color: textSub }]}> / seat</ThemedText>
          </ThemedText>

          {ride.note ? (
            <View style={[styles.noteBox, { backgroundColor: inputBg }]}>
              <IconSymbol name="text.bubble.fill" size={12} color={textSub} />
              <ThemedText style={[styles.noteText, { color: textSub }]}>{ride.note}</ThemedText>
            </View>
          ) : null}
        </View>

        {/* Seat stepper */}
        <View style={[styles.stepperCard, { backgroundColor: cardBg, borderColor: hair }]}>
          <ThemedText style={[styles.stepperLabel, { color: textSub }]}>Number of seats</ThemedText>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() => setSeatCount(n => Math.max(1, n - 1))}
              disabled={seatCount <= 1}
              style={[
                styles.stepperBtn,
                { backgroundColor: inputBg, borderColor: hair, opacity: seatCount <= 1 ? 0.4 : 1 },
              ]}
            >
              <ThemedText style={[styles.stepperBtnText, { color: textPri }]}>−</ThemedText>
            </Pressable>
            <ThemedText style={[styles.stepperValue, { color: textPri }]}>{seatCount}</ThemedText>
            <Pressable
              onPress={() => setSeatCount(n => Math.min(maxSeats, n + 1))}
              disabled={seatCount >= maxSeats}
              style={[
                styles.stepperBtn,
                { backgroundColor: inputBg, borderColor: hair, opacity: seatCount >= maxSeats ? 0.4 : 1 },
              ]}
            >
              <ThemedText style={[styles.stepperBtnText, { color: textPri }]}>+</ThemedText>
            </Pressable>
          </View>
          <ThemedText style={[styles.stepperHint, { color: textSub }]}>
            {maxSeats} seat{maxSeats === 1 ? '' : 's'} available on this ride
          </ThemedText>
        </View>

        {/* Payment method */}
        <View style={{ gap: 8 }}>
          <ThemedText style={[styles.stepperLabel, { color: textSub, alignSelf: 'flex-start' }]}>
            Payment method
          </ThemedText>
          <View
            style={{
              backgroundColor: inputBg,
              borderColor: hair,
              borderWidth: 1,
              borderRadius: 14,
              padding: 14,
              gap: 6,
            }}
          >
            <ThemedText style={{ fontSize: 15, fontWeight: '800', color: textPri }}>
              💵 Pay on pickup (cash)
            </ThemedText>
            <ThemedText style={{ fontSize: 13, fontWeight: '500', lineHeight: 18, color: textSub }}>
              You'll pay the driver directly when they pick you up.
            </ThemedText>
          </View>
        </View>

        {/* Total */}
        <View style={[styles.totalRow, { borderColor: hair }]}>
          <ThemedText style={[styles.totalLabel, { color: textSub }]}>Total</ThemedText>
          <ThemedText style={[styles.totalValue, { color: textPri }]}>
            RWF {total.toLocaleString()}
          </ThemedText>
        </View>

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        <Pressable onPress={onBook} disabled={booking} style={{ opacity: booking ? 0.65 : 1 }}>
          <LinearGradient
            colors={[ACCENT, '#FF4500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmGrad}
          >
            {booking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.confirmText}>Confirm & Request</ThemedText>
            )}
          </LinearGradient>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '900' },
  scroll: { padding: 16, gap: 14 },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  chipRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  chipText: { fontSize: 13, fontWeight: '900' },
  arrow: { fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, fontWeight: '600' },
  priceLine: { fontSize: 16, fontWeight: '900' },
  pricePer: { fontSize: 13, fontWeight: '600' },
  noteBox: { flexDirection: 'row', gap: 8, borderRadius: 10, padding: 10, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  stepperCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingTop: 18,
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 12,
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
    includeFontPadding: false,
  },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 22, fontWeight: '400', lineHeight: 26 },
  stepperValue: { fontSize: 28, fontWeight: '900', minWidth: 40, textAlign: 'center' },
  stepperHint: { fontSize: 12, fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  totalLabel: { fontSize: 14, fontWeight: '700' },
  totalValue: { fontSize: 20, fontWeight: '900' },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  confirmGrad: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '900' },
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
