import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { useSession } from '@/hooks/use-session';
import { useThemeColors } from '@/hooks/use-theme-color';
import { createBooking } from '@/lib/bookings';
import { getRide, type Ride } from '@/lib/rides';

export default function ConfirmBookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const c = useThemeColors();
  const { session } = useSession();

  const [ride, setRide] = useState<Ride | null>(null);
  const [loadingRide, setLoadingRide] = useState(true);
  const [seats, setSeats] = useState('1');
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!rideId) return;
    getRide(rideId).then(r => { setRide(r); setLoadingRide(false); });
  }, [rideId]);

  async function onBook() {
    if (!session || !ride || booking) return;
    const n = Number(seats);
    if (!n || n < 1 || n > ride.seats) { setError(`Enter between 1 and ${ride.seats} seats`); return; }
    setError(''); setBooking(true);
    try {
      await createBooking(ride.id, session.userId, n);
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? 'Booking failed');
    } finally {
      setBooking(false);
    }
  }

  if (loadingRide) {
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
          <Pressable onPress={() => router.back()} style={styles.btn}><ThemedText style={styles.btnText}>Go back</ThemedText></Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (done) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
        <View style={styles.center}>
          <ThemedText style={{ fontSize: 48 }}>🎉</ThemedText>
          <ThemedText style={[styles.title, { color: c.text }]}>Booking requested!</ThemedText>
          <ThemedText style={[styles.sub, { color: c.subText }]}>The driver will confirm your seat.</ThemedText>
          <Pressable onPress={() => router.replace('/my-bookings')} style={styles.btn}>
            <ThemedText style={styles.btnText}>View my bookings</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const total = ride.priceRwf * (Number(seats) || 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: c.hairline }]}>
        <Pressable onPress={() => router.back()}>
          <ThemedText style={[styles.back, { color: Colors.accent }]}>← Back</ThemedText>
        </Pressable>
        <ThemedText style={[styles.title, { color: c.text }]}>Confirm Booking</ThemedText>
      </View>

      <View style={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.hairline }, Shadow.card]}>
          <ThemedText style={[styles.route, { color: c.text }]}>{ride.fromShort} → {ride.toShort}</ThemedText>
          <ThemedText style={[styles.meta, { color: c.subText }]}>
            {new Date(ride.departAtISO).toLocaleString()} · {ride.seats} seats available
          </ThemedText>
          {ride.note ? <ThemedText style={[styles.note, { color: c.subText }]}>{ride.note}</ThemedText> : null}
          <ThemedText style={[styles.price, { color: Colors.accent }]}>RWF {ride.priceRwf.toLocaleString()} / seat</ThemedText>
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText style={[styles.label, { color: c.subText }]}>Number of seats</ThemedText>
          <TextInput
            value={seats}
            onChangeText={v => { setSeats(v.replace(/\D/g, '')); setError(''); }}
            keyboardType="number-pad"
            style={[styles.input, { color: c.text, borderColor: c.hairline, backgroundColor: c.inputBg }]}
            maxLength={2}
          />
        </View>

        {total > 0 && (
          <ThemedText style={[styles.total, { color: c.text }]}>
            Total: <ThemedText style={{ color: Colors.accent }}>RWF {total.toLocaleString()}</ThemedText>
          </ThemedText>
        )}

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        <Pressable onPress={onBook} disabled={booking} style={[styles.btn, { opacity: booking ? 0.6 : 1 }]}>
          {booking ? <ActivityIndicator color="white" /> : <ThemedText style={styles.btnText}>Request Booking</ThemedText>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  back: { fontSize: 15, fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '900' },
  sub: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  scroll: { padding: 20, gap: 16 },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: 16, gap: 6 },
  route: { fontSize: 17, fontWeight: '900' },
  meta: { fontSize: 13, fontWeight: '600' },
  note: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  price: { fontSize: 14, fontWeight: '900' },
  fieldGroup: { gap: 6 },
  label: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: 14, height: 48, fontSize: 18, fontWeight: '900' },
  total: { fontSize: 16, fontWeight: '800' },
  errorText: { color: Colors.danger, fontSize: 13, fontWeight: '700' },
  btn: { height: 52, borderRadius: Radius.lg, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: 'white', fontSize: 15, fontWeight: '900' },
}) as any;
