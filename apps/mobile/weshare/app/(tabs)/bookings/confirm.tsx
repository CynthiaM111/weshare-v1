import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import { createBooking } from '@/lib/bookings';
import {
  checkPaymentStatus,
  detectNetwork,
  getPaymentForBooking,
  initiatePayment,
} from '@/lib/payments';
import { getRide, type Ride } from '@/lib/rides';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const AIRTEL_ORANGE = '#FF9500';

type PayPhase = 'form' | 'polling' | 'success' | 'failed' | 'timeout';

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

function stripRwandaLocal(phone: string): string {
  let p = phone.trim();
  if (p.startsWith('+250')) p = p.slice(4);
  else if (p.startsWith('250')) p = p.slice(3);
  return p.replace(/\D/g, '').slice(0, 9);
}

function networkPillFromLocal(local: string): 'mtn' | 'airtel' | null {
  if (local.length < 2) return null;
  const p2 = local.slice(0, 2);
  if (p2 === '78' || p2 === '79') return 'mtn';
  if (p2 === '72' || p2 === '73') return 'airtel';
  return null;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function ConfirmBookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { rideId } = useLocalSearchParams<{ rideId: string }>();
  const { session, profile, loading: sessionLoading } = useSession();

  const [ride, setRide] = useState<Ride | null>(null);
  const [loadingRide, setLoadingRide] = useState(true);
  const [seatCount, setSeatCount] = useState(1);
  const [localPhone, setLocalPhone] = useState('');
  const [payPhase, setPayPhase] = useState<PayPhase>('form');
  const [paymentError, setPaymentError] = useState('');
  const [paying, setPaying] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);

  const pollCancelledRef = useRef(false);

  const textPri = isDark ? '#FFF' : NAVY;
  const textSub = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(8,17,31,0.48)';
  const hair = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(8,17,31,0.09)';
  const inputBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(8,17,31,0.05)';
  const cardBg = isDark ? NAVY_2 : '#FFF';
  const bg = isDark ? NAVY : '#F5F7FA';

  useEffect(() => {
    return () => {
      pollCancelledRef.current = true;
    };
  }, []);

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

  useEffect(() => {
    const raw = profile?.phoneE164 ?? session?.phoneE164 ?? '';
    if (raw) setLocalPhone(stripRwandaLocal(raw));
  }, [profile?.phoneE164, session?.phoneE164]);

  function goToBookingsAfterPayment(bookingId: string) {
    setPayPhase('success');
    sleep(2000).then(() => {
      if (!pollCancelledRef.current) {
        router.replace({
          pathname: '/my-bookings',
          params: { expandBookingId: bookingId },
        });
      }
    });
  }

  async function pollUntilFinal(depositId: string, bookingId: string) {
    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      if (pollCancelledRef.current) return;

      const payment = await getPaymentForBooking(bookingId);
      if (payment?.depositStatus === 'completed') {
        goToBookingsAfterPayment(bookingId);
        return;
      }
      if (payment?.depositStatus === 'failed') {
        setPaymentError('Your payment could not be processed. Please try again.');
        setPayPhase('failed');
        return;
      }

      const { status } = await checkPaymentStatus(depositId);

      if (status === 'COMPLETED') {
        goToBookingsAfterPayment(bookingId);
        return;
      }

      if (status === 'FAILED' || status === 'REJECTED') {
        setPaymentError('Your payment could not be processed. Please try again.');
        setPayPhase('failed');
        return;
      }

      if (
        status === 'ACCEPTED' ||
        status === 'SUBMITTED' ||
        status === 'PROCESSING' ||
        status === 'PENDING' ||
        status === 'INITIATED' ||
        status === 'IN_RECONCILIATION' ||
        status === 'FOUND'
      ) {
        await sleep(5000);
        continue;
      }

      await sleep(5000);
    }

    setPayPhase('timeout');
  }

  async function onPay() {
    if (!session || !ride || paying) return;

    const digits = localPhone.replace(/\D/g, '');
    if (digits.length !== 9) {
      setPaymentError('Enter a valid 9-digit mobile money number.');
      return;
    }

    setPaymentError('');
    setPaying(true);

    try {
      const grossAmount = ride.priceRwf * seatCount;
      const fullPhone = `250${digits}`;
      const network = detectNetwork(fullPhone);
      const driverId = ride.postedByUserId;

      let bookingId = pendingBookingId;
      if (!bookingId) {
        const booking = await createBooking(ride.id, session.userId, seatCount);
        bookingId = booking.id;
        setPendingBookingId(bookingId);
      }

      setPayPhase('polling');

      const { depositId } = await initiatePayment(
        bookingId,
        ride.id,
        session.userId,
        driverId,
        grossAmount,
        fullPhone,
        network
      );

      await pollUntilFinal(depositId, bookingId);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Payment failed';
      setPaymentError(msg);
      setPayPhase('failed');
    } finally {
      setPaying(false);
    }
  }

  function resetToForm() {
    setPayPhase('form');
    setPaymentError('');
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
  const maxSeats = Math.max(1, ride.seats);
  const rideFare = ride.priceRwf * seatCount;
  const serviceFee = Math.round(rideFare * 0.1);
  const youPay = rideFare;
  const driverReceives = rideFare - serviceFee;
  const networkPill = networkPillFromLocal(localPhone.replace(/\D/g, ''));
  const phoneValid = localPhone.replace(/\D/g, '').length === 9;

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: hair, backgroundColor: cardBg }]}>
      <Pressable onPress={() => router.back()} hitSlop={12} disabled={payPhase === 'polling'}>
        <IconSymbol name="chevron.left" size={20} color={ACCENT} />
      </Pressable>
      <ThemedText style={[styles.title, { color: textPri }]}>Confirm booking</ThemedText>
      <View style={{ width: 20 }} />
    </View>
  );

  if (payPhase === 'polling') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
          <ThemedText style={[styles.waitTitle, { color: textPri }]}>
            Waiting for payment approval...
          </ThemedText>
          <ThemedText style={[styles.waitSub, { color: textSub }]}>
            Check your phone for a payment prompt
          </ThemedText>
          <ThemedText style={[styles.waitHint, { color: textSub }]}>
            This may take up to 30 seconds
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (payPhase === 'success') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        {header}
        <View style={styles.center}>
          <IconSymbol name="checkmark.circle.fill" size={64} color={TEAL} />
          <ThemedText style={[styles.waitTitle, { color: textPri }]}>Payment received! ✅</ThemedText>
          <ThemedText style={[styles.waitSub, { color: textSub }]}>
            Waiting for the driver to confirm your booking
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (payPhase === 'failed') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        {header}
        <View style={styles.center}>
          <IconSymbol name="xmark.circle.fill" size={64} color="#EF4444" />
          <ThemedText style={[styles.waitTitle, { color: textPri }]}>Payment failed</ThemedText>
          <ThemedText style={[styles.waitSub, { color: textSub, textAlign: 'center', paddingHorizontal: 24 }]}>
            {paymentError || 'Something went wrong. Please try again.'}
          </ThemedText>
          <Pressable onPress={resetToForm} style={[styles.outlineBtn, { borderColor: hair, marginTop: 8 }]}>
            <ThemedText style={[styles.outlineBtnText, { color: textPri }]}>Try again</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (payPhase === 'timeout') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        {header}
        <View style={styles.center}>
          <ThemedText style={[styles.waitTitle, { color: textPri, textAlign: 'center', paddingHorizontal: 24 }]}>
            Payment is taking longer than expected. Check your bookings for the status.
          </ThemedText>
          <Pressable
            onPress={() => router.replace('/my-bookings')}
            style={{ marginTop: 16, width: '100%', maxWidth: 320, paddingHorizontal: 24 }}
          >
            <LinearGradient
              colors={[ACCENT, '#FF4500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.confirmGrad}
            >
              <ThemedText style={styles.confirmText}>View My Bookings</ThemedText>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      {header}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

        <View style={[styles.stepperCard, { backgroundColor: cardBg, borderColor: hair }]}>
          <ThemedText style={[styles.sectionLabel, { color: textSub }]}>Number of seats</ThemedText>
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

        <View style={styles.paymentSection}>
          <ThemedText style={[styles.sectionLabel, { color: textSub }]}>Payment</ThemedText>

          <View style={[styles.phoneRow, { backgroundColor: inputBg, borderColor: hair }]}>
            <ThemedText style={[styles.phonePrefix, { color: textPri }]}>+250</ThemedText>
            <TextInput
              value={localPhone}
              onChangeText={t => setLocalPhone(t.replace(/\D/g, '').slice(0, 9))}
              keyboardType="number-pad"
              maxLength={9}
              placeholder="7XXXXXXXX"
              placeholderTextColor={textSub}
              style={[styles.phoneInput, { color: textPri }]}
            />
          </View>

          {networkPill === 'mtn' ? (
            <View style={[styles.networkPill, { backgroundColor: TEAL + '22' }]}>
              <ThemedText style={[styles.networkPillText, { color: TEAL }]}>MTN MoMo</ThemedText>
            </View>
          ) : null}
          {networkPill === 'airtel' ? (
            <View style={[styles.networkPill, { backgroundColor: AIRTEL_ORANGE + '22' }]}>
              <ThemedText style={[styles.networkPillText, { color: AIRTEL_ORANGE }]}>Airtel Money</ThemedText>
            </View>
          ) : null}

          <View style={[styles.breakdownCard, { backgroundColor: inputBg }]}>
            <View style={styles.breakdownRow}>
              <ThemedText style={[styles.breakdownLabel, { color: textPri }]}>Ride fare</ThemedText>
              <ThemedText style={[styles.breakdownValue, { color: textPri }]}>
                RWF {rideFare.toLocaleString()}
              </ThemedText>
            </View>
            <View style={styles.breakdownRow}>
              <ThemedText style={[styles.breakdownLabelMuted, { color: textSub }]}>
                WeShare fee (10%)
              </ThemedText>
              <ThemedText style={[styles.breakdownValueMuted, { color: textSub }]}>
                RWF {serviceFee.toLocaleString()}
              </ThemedText>
            </View>
            <View style={[styles.divider, { backgroundColor: hair }]} />
            <View style={styles.breakdownRow}>
              <ThemedText style={[styles.breakdownBold, { color: textPri }]}>You pay</ThemedText>
              <ThemedText style={[styles.breakdownAccent, { color: ACCENT }]}>
                RWF {youPay.toLocaleString()}
              </ThemedText>
            </View>
            <View style={styles.breakdownRow}>
              <ThemedText style={[styles.breakdownSmall, { color: textSub }]}>Driver receives</ThemedText>
              <ThemedText style={[styles.breakdownSmallTeal, { color: TEAL }]}>
                RWF {driverReceives.toLocaleString()}
              </ThemedText>
            </View>
          </View>
        </View>

        {paymentError && payPhase === 'form' ? (
          <ThemedText style={styles.errorText}>{paymentError}</ThemedText>
        ) : null}

        <Pressable
          onPress={onPay}
          disabled={!phoneValid || paying}
          style={{ opacity: !phoneValid || paying ? 0.55 : 1 }}
        >
          <LinearGradient
            colors={[ACCENT, '#FF4500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmGrad}
          >
            {paying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.confirmText}>
                Pay RWF {youPay.toLocaleString()} via Mobile Money
              </ThemedText>
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    alignSelf: 'flex-start',
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
  paymentSection: { gap: 10 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
    gap: 8,
  },
  phonePrefix: { fontSize: 16, fontWeight: '800' },
  phoneInput: { flex: 1, fontSize: 16, fontWeight: '700', paddingVertical: 0 },
  networkPill: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  networkPillText: { fontSize: 13, fontWeight: '800' },
  breakdownCard: { borderRadius: 14, padding: 14, gap: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownLabel: { fontSize: 14, fontWeight: '600' },
  breakdownValue: { fontSize: 14, fontWeight: '700' },
  breakdownLabelMuted: { fontSize: 14, fontWeight: '600' },
  breakdownValueMuted: { fontSize: 14, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  breakdownBold: { fontSize: 15, fontWeight: '900' },
  breakdownAccent: { fontSize: 16, fontWeight: '900' },
  breakdownSmall: { fontSize: 12, fontWeight: '600' },
  breakdownSmallTeal: { fontSize: 12, fontWeight: '700' },
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
  waitTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center' },
  waitSub: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  waitHint: { fontSize: 12, fontWeight: '500', textAlign: 'center', marginTop: 4 },
});
