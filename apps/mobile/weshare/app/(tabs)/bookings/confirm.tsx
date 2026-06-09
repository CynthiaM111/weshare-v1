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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenSafeArea } from '@/components/ScreenSafeArea';
import { screenHeaderPaddingTop } from '@/components/TabScreenHeader';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import { createBooking } from '@/lib/bookings';
import { bookingConfirmAuthRedirect } from '@/lib/auth/navigation';
import { computePaymentAmounts } from '@/lib/payment-fees';
import {
  checkPaymentStatus,
  detectNetwork,
  getPaymentForBooking,
  initiatePayment,
} from '@/lib/payments';
import { canBookBeforeDeparture, formatDepartureFriendly } from '@/lib/datetime';
import { BOOKING_CUTOFF_MINUTES } from '@/lib/bookings';
import { getRide, type Ride } from '@/lib/rides';
import { DriverSummaryCard } from '@/components/DriverSummaryCard';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const AIRTEL_ORANGE = '#FF9500';

type PayPhase = 'form' | 'polling' | 'success' | 'failed' | 'timeout';

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
          redirect: bookingConfirmAuthRedirect(rideId),
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
        setPendingBookingId(null);
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
        setPendingBookingId(null);
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

    setPendingBookingId(null);
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
      const rideFare = ride.priceRwf * seatCount;
      const fullPhone = `250${digits}`;
      const network = detectNetwork(fullPhone);
      const driverId = ride.postedByUserId;

      const booking = await createBooking(ride.id, session.userId, seatCount);
      const bookingId = booking.id;
      setPendingBookingId(bookingId);

      setPayPhase('polling');

      const { depositId } = await initiatePayment(
        bookingId,
        ride.id,
        session.userId,
        driverId,
        rideFare,
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
    setPendingBookingId(null);
  }

  if (sessionLoading || loadingRide || !session) {
    return (
      <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
        <View style={styles.center}>
          <ActivityIndicator color={ACCENT} size="large" />
        </View>
      </ScreenSafeArea>
    );
  }

  if (!ride) {
    return (
      <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
        <View style={styles.center}>
          <ThemedText style={[styles.headerTitle, { color: textPri }]}>Ride not found</ThemedText>
          <Pressable onPress={() => router.back()} style={[styles.outlineBtn, { borderColor: hair }]}>
            <ThemedText style={[styles.outlineBtnText, { color: textPri }]}>Go back</ThemedText>
          </Pressable>
        </View>
      </ScreenSafeArea>
    );
  }

  const depart = new Date(ride.departAtISO);
  const maxSeats = Math.max(1, ride.seats);
  const rideFare = ride.priceRwf * seatCount;
  const { serviceFee, depositAmount: youPay, driverReceives } = computePaymentAmounts(rideFare);
  const networkPill = networkPillFromLocal(localPhone.replace(/\D/g, ''));
  const phoneValid = localPhone.replace(/\D/g, '').length === 9;
  const bookingWindowOpen = canBookBeforeDeparture(ride.departAtISO, BOOKING_CUTOFF_MINUTES);
  const canPay = phoneValid && bookingWindowOpen && payPhase === 'form';

  const header = (
    <View style={[styles.header, { paddingTop: screenHeaderPaddingTop(insets.top), borderBottomColor: hair, backgroundColor: cardBg }]}>
      <Pressable
        onPress={() => router.back()}
        disabled={payPhase === 'polling'}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={[
          styles.headerBack,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : NAVY + '0C',
            borderColor: isDark ? 'rgba(255,255,255,0.38)' : NAVY + '55',
            opacity: payPhase === 'polling' ? 0.4 : 1,
          },
        ]}
      >
        <IconSymbol name="chevron.left" size={22} color={textPri} />
      </Pressable>
      <ThemedText style={[styles.headerTitle, { color: textPri }]}>Confirm booking</ThemedText>
      <View style={styles.headerBackSpacer} />
    </View>
  );

  const tripSummary = ride ? (
    <View style={[styles.tripCard, { backgroundColor: cardBg, borderColor: hair }]}>
      <View style={[styles.tripStrip, { backgroundColor: TEAL }]} />
      <View style={styles.tripBody}>
        <View style={styles.tripRouteRow}>
          <ThemedText style={[styles.tripFrom, { color: textPri }]} numberOfLines={1}>
            {ride.fromShort}
          </ThemedText>
          <IconSymbol name="arrow.forward" size={12} color={textSub} />
          <ThemedText style={[styles.tripTo, { color: textPri }]} numberOfLines={1}>
            {ride.toShort}
          </ThemedText>
        </View>
        <View style={styles.tripMeta}>
          <IconSymbol name="clock.fill" size={12} color={textSub} />
          <ThemedText style={[styles.tripWhen, { color: textSub }]} numberOfLines={1}>
            {!Number.isNaN(depart.getTime()) ? formatDepartureFriendly(depart) : ride.departAtISO}
          </ThemedText>
        </View>
        <ThemedText style={[styles.tripPrice, { color: textSub }]}>
          RWF {ride.priceRwf.toLocaleString()} per seat
        </ThemedText>
        {ride.note ? (
          <View style={[styles.tripNote, { backgroundColor: inputBg }]}>
            <ThemedText style={[styles.tripNoteText, { color: textSub }]} numberOfLines={2}>
              {ride.note}
            </ThemedText>
          </View>
        ) : null}
        {ride.driver ? (
          <View style={{ marginTop: 12 }}>
            <DriverSummaryCard
              driver={ride.driver}
              showContact={false}
              textPri={textPri}
              textSub={textSub}
              hair={hair}
            />
          </View>
        ) : null}
      </View>
    </View>
  ) : null;

  if (payPhase === 'polling') {
    return (
      <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
        {header}
        <ScrollView
          contentContainerStyle={[styles.phaseScroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {tripSummary}
          <View style={[styles.phaseCard, { backgroundColor: cardBg, borderColor: hair }]}>
            <ActivityIndicator color={ACCENT} size="large" />
            <ThemedText style={[styles.waitTitle, { color: textPri }]}>Approve on your phone</ThemedText>
            <ThemedText style={[styles.waitSub, { color: textSub }]}>
              Check your mobile money app for a payment prompt, then confirm the transaction.
            </ThemedText>
            <ThemedText style={[styles.waitHint, { color: textSub }]}>
              Usually takes under 30 seconds
            </ThemedText>
          </View>
        </ScrollView>
      </ScreenSafeArea>
    );
  }

  if (payPhase === 'success') {
    return (
      <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
        {header}
        <ScrollView
          contentContainerStyle={[styles.phaseScroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {tripSummary}
          <View style={[styles.phaseCard, { backgroundColor: cardBg, borderColor: TEAL + '40' }]}>
            <View style={[styles.phaseIconWrap, { backgroundColor: TEAL + '18' }]}>
              <IconSymbol name="checkmark.circle.fill" size={44} color={TEAL} />
            </View>
            <ThemedText style={[styles.waitTitle, { color: textPri }]}>Payment received</ThemedText>
            <ThemedText style={[styles.waitSub, { color: textSub }]}>
              Your booking is pending—the driver will confirm shortly. Taking you to My Bookings…
            </ThemedText>
          </View>
        </ScrollView>
      </ScreenSafeArea>
    );
  }

  if (payPhase === 'failed') {
    return (
      <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
        {header}
        <ScrollView
          contentContainerStyle={[styles.phaseScroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {tripSummary}
          <View style={[styles.phaseCard, { backgroundColor: cardBg, borderColor: '#EF444440' }]}>
            <View style={[styles.phaseIconWrap, { backgroundColor: '#EF444418' }]}>
              <ThemedText style={styles.phaseIconEmoji}>!</ThemedText>
            </View>
            <ThemedText style={[styles.waitTitle, { color: textPri }]}>Payment failed</ThemedText>
            <ThemedText style={[styles.waitSub, { color: textSub }]}>
              {paymentError || 'Something went wrong. Please try again.'}
            </ThemedText>
            <Pressable onPress={resetToForm} style={styles.retryBtnWrap}>
              <LinearGradient
                colors={[ACCENT, '#FF4500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmGrad}
              >
                <ThemedText style={styles.confirmText}>Try again</ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenSafeArea>
    );
  }

  if (payPhase === 'timeout') {
    return (
      <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
        {header}
        <ScrollView
          contentContainerStyle={[styles.phaseScroll, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {tripSummary}
          <View style={[styles.phaseCard, { backgroundColor: cardBg, borderColor: hair }]}>
            <View style={[styles.phaseIconWrap, { backgroundColor: inputBg }]}>
              <IconSymbol name="clock.fill" size={32} color={ACCENT} />
            </View>
            <ThemedText style={[styles.waitTitle, { color: textPri }]}>Still processing</ThemedText>
            <ThemedText style={[styles.waitSub, { color: textSub }]}>
              Payment is taking longer than expected. Check My Bookings for the latest status.
            </ThemedText>
            <Pressable onPress={() => router.replace('/my-bookings')} style={styles.retryBtnWrap}>
              <LinearGradient
                colors={[TEAL, '#00a896']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmGrad}
              >
                <ThemedText style={styles.confirmText}>View my bookings</ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
      {header}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {tripSummary}

        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: hair }]}>
          <ThemedText style={[styles.sectionTitle, { color: textPri }]}>Seats</ThemedText>
          <View style={styles.stepperRow}>
            <Pressable
              onPress={() => setSeatCount(n => Math.max(1, n - 1))}
              disabled={seatCount <= 1}
              style={[
                styles.stepperBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : NAVY + '0C',
                  borderColor: isDark ? 'rgba(255,255,255,0.14)' : NAVY + '18',
                  opacity: seatCount <= 1 ? 0.4 : 1,
                },
              ]}
            >
              <ThemedText style={[styles.stepperBtnText, { color: textPri }]}>−</ThemedText>
            </Pressable>
            <View style={styles.stepperCenter}>
              <ThemedText style={[styles.stepperValue, { color: textPri }]}>{seatCount}</ThemedText>
              <ThemedText style={[styles.stepperHint, { color: textSub }]}>
                of {maxSeats} available
              </ThemedText>
            </View>
            <Pressable
              onPress={() => setSeatCount(n => Math.min(maxSeats, n + 1))}
              disabled={seatCount >= maxSeats}
              style={[
                styles.stepperBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : NAVY + '0C',
                  borderColor: isDark ? 'rgba(255,255,255,0.14)' : NAVY + '18',
                  opacity: seatCount >= maxSeats ? 0.4 : 1,
                },
              ]}
            >
              <ThemedText style={[styles.stepperBtnText, { color: textPri }]}>+</ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: hair }]}>
          <ThemedText style={[styles.sectionTitle, { color: textPri }]}>Mobile money</ThemedText>
          <ThemedText style={[styles.sectionSub, { color: textSub }]}>
            Pay with the number registered on your MTN or Airtel wallet.
          </ThemedText>

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
              <ThemedText style={[styles.networkPillText, { color: TEAL }]}>MTN MoMo detected</ThemedText>
            </View>
          ) : null}
          {networkPill === 'airtel' ? (
            <View style={[styles.networkPill, { backgroundColor: AIRTEL_ORANGE + '22' }]}>
              <ThemedText style={[styles.networkPillText, { color: AIRTEL_ORANGE }]}>
                Airtel Money detected
              </ThemedText>
            </View>
          ) : null}
        </View>

        <View style={[styles.sectionCard, { backgroundColor: cardBg, borderColor: hair }]}>
          <ThemedText style={[styles.sectionTitle, { color: textPri }]}>Price breakdown</ThemedText>
          <View style={styles.breakdownRows}>
            <View style={styles.breakdownRow}>
              <ThemedText style={[styles.breakdownLabel, { color: textSub }]}>
                Ride fare ({seatCount} seat{seatCount === 1 ? '' : 's'})
              </ThemedText>
              <ThemedText style={[styles.breakdownValue, { color: textPri }]}>
                RWF {rideFare.toLocaleString()}
              </ThemedText>
            </View>
            <View style={styles.breakdownRow}>
              <ThemedText style={[styles.breakdownLabel, { color: textSub }]}>WeShare fee (5%)</ThemedText>
              <ThemedText style={[styles.breakdownValue, { color: textSub }]}>
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
          <View style={[styles.errorBox, { backgroundColor: '#EF444412', borderColor: '#EF444430' }]}>
            <ThemedText style={styles.errorText}>{paymentError}</ThemedText>
          </View>
        ) : null}

        {!bookingWindowOpen && payPhase === 'form' ? (
          <View style={[styles.errorBox, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B30' }]}>
            <ThemedText style={[styles.errorText, { color: '#B45309' }]}>
              Bookings close {BOOKING_CUTOFF_MINUTES} minutes before departure. This ride is too soon to book.
            </ThemedText>
          </View>
        ) : null}

        <Pressable
          onPress={onPay}
          disabled={!canPay || paying}
          style={[styles.payBtnWrap, { opacity: !canPay || paying ? 0.55 : 1 }]}
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
              <>
                <ThemedText style={styles.confirmText}>Pay RWF {youPay.toLocaleString()}</ThemedText>
                <ThemedText style={styles.confirmSub}>via Mobile Money</ThemedText>
              </>
            )}
          </LinearGradient>
        </Pressable>

        <ThemedText style={[styles.escrowHint, { color: textSub }]}>
          RWF {youPay.toLocaleString()} is held in escrow until the ride completes. The driver receives RWF{' '}
          {driverReceives.toLocaleString()}.
        </ThemedText>
      </ScrollView>
    </ScreenSafeArea>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBack: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackSpacer: { width: 44 },
  headerTitle: { fontSize: 18, fontWeight: '900', lineHeight: 24, flex: 1, textAlign: 'center' },
  scroll: { padding: 20, gap: 14 },
  phaseScroll: { padding: 20, gap: 14 },
  tripCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  tripStrip: { height: 3, width: '100%' },
  tripBody: { padding: 14, gap: 8 },
  tripRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripFrom: { flex: 1, fontSize: 16, fontWeight: '900', lineHeight: 20 },
  tripTo: { flex: 1, fontSize: 16, fontWeight: '900', lineHeight: 20 },
  tripMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tripWhen: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 16 },
  tripPrice: { fontSize: 12, fontWeight: '700' },
  tripNote: { borderRadius: 10, padding: 10 },
  tripNoteText: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  sectionCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '900', lineHeight: 22 },
  sectionSub: { fontSize: 13, fontWeight: '600', lineHeight: 18, marginTop: -6 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 24, fontWeight: '400', lineHeight: 28 },
  stepperCenter: { alignItems: 'center', gap: 2 },
  stepperValue: { fontSize: 32, fontWeight: '900', lineHeight: 36 },
  stepperHint: { fontSize: 12, fontWeight: '600' },
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
  networkPillText: { fontSize: 12, fontWeight: '800' },
  breakdownRows: { gap: 10 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  breakdownLabel: { fontSize: 14, fontWeight: '600', flex: 1 },
  breakdownValue: { fontSize: 14, fontWeight: '800' },
  divider: { height: 1, marginVertical: 2 },
  breakdownBold: { fontSize: 16, fontWeight: '900' },
  breakdownAccent: { fontSize: 18, fontWeight: '900' },
  breakdownSmall: { fontSize: 12, fontWeight: '600' },
  breakdownSmallTeal: { fontSize: 12, fontWeight: '800' },
  errorBox: { borderRadius: 12, borderWidth: 1, padding: 12 },
  errorText: { color: '#EF4444', fontSize: 13, fontWeight: '700', textAlign: 'center', lineHeight: 18 },
  payBtnWrap: { borderRadius: 16, overflow: 'hidden' },
  confirmGrad: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 2,
  },
  confirmText: { color: '#fff', fontSize: 17, fontWeight: '900', lineHeight: 22 },
  confirmSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '700' },
  escrowHint: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 17, marginTop: -4 },
  outlineBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700' },
  phaseCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  phaseIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseIconEmoji: { fontSize: 32, fontWeight: '900', color: '#EF4444', lineHeight: 36 },
  waitTitle: { fontSize: 20, fontWeight: '900', textAlign: 'center', lineHeight: 26 },
  waitSub: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 21, maxWidth: 320 },
  waitHint: { fontSize: 12, fontWeight: '600', textAlign: 'center', color: 'rgba(8,17,31,0.45)' },
  retryBtnWrap: { borderRadius: 14, overflow: 'hidden', width: '100%', marginTop: 4 },
});
