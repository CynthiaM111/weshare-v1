import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
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
import { passengerDisplayName } from '@/lib/auth/users';
import {
  declineBooking,
  listBookingsForRideWithPassengers,
  syncBookingsForRideStatus,
  updateBookingStatus,
  type Booking,
  type BookingWithPassenger,
} from '@/lib/bookings';
import { getCoordsForRideGps } from '@/lib/location';
import { getPaymentForBooking, verifyGpsAndPayout } from '@/lib/payments';
import { supabase } from '@/lib/supabase';
import { cancelRide, getRide, startRide, updateRideStatus, type Ride } from '@/lib/rides';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const GREEN = '#22C55E';
const RED = '#EF4444';
const GOLD = '#F5C842';
const AMBER = '#F59E0B';

const BOOKING_STATUS_COLOR: Record<string, string> = {
  pending: GOLD,
  confirmed: TEAL,
  started: ACCENT,
  cancelled: RED,
  completed: '#0EA5E9',
};

const RIDE_STATUS_COLOR: Record<string, string> = {
  active: TEAL,
  started: ACCENT,
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

function stripRwandaLocal(phone: string) {
  let local = phone.trim();
  if (local.startsWith('+250')) local = local.slice(4);
  else if (local.startsWith('250')) local = local.slice(3);
  return local.replace(/\D/g, '').slice(0, 9);
}

function driverPayoutPhoneE164(
  localDigits: string,
  profilePhone?: string | null,
  sessionPhone?: string | null
) {
  const digits = localDigits.replace(/\D/g, '') || stripRwandaLocal(profilePhone ?? sessionPhone ?? '');
  if (digits.length === 9) return `250${digits}`;
  const raw = profilePhone ?? sessionPhone ?? '';
  if (raw.startsWith('+')) return raw.slice(1);
  return raw.replace(/\D/g, '');
}

export default function RideDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useSession();

  const [ride, setRide] = useState<Ride | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [startingRide, setStartingRide] = useState(false);
  const [completingRide, setCompletingRide] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [gpsResult, setGpsResult] = useState<{ verified: boolean; distanceKm: number } | null>(null);
  const [payoutNetAmount, setPayoutNetAmount] = useState<number | null>(null);
  const [driverPhone, setDriverPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [driverPhoneSaved, setDriverPhoneSaved] = useState(false);
  const [savedDriverPhoneDigits, setSavedDriverPhoneDigits] = useState<string | null>(null);

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

    const { data: payments } = await supabase
      .from('payments')
      .select('driver_phone')
      .eq('ride_id', id);
    const savedPhone = (payments ?? []).find(
      (p: { driver_phone: string | null }) => !!p.driver_phone
    )?.driver_phone as string | undefined;

    if (savedPhone) {
      const digits = stripRwandaLocal(savedPhone);
      setDriverPhone(digits);
      setSavedDriverPhoneDigits(digits);
      setDriverPhoneSaved(true);
    } else {
      setSavedDriverPhoneDigits(null);
      setDriverPhoneSaved(false);
      const raw = profile?.phoneE164 ?? session?.phoneE164 ?? '';
      if (raw) setDriverPhone(stripRwandaLocal(raw));
    }
  }, [id, profile?.phoneE164, session?.phoneE164]);

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

  async function onStartRide() {
    if (!ride) return;
    setStartingRide(true);
    try {
      const coords = await getCoordsForRideGps('start');
      const err = await startRide(ride.id, coords.latitude, coords.longitude);
      if (err) throw new Error(err);

      const startedBookings = bookings.filter(b => b.status === 'confirmed');
      for (const b of startedBookings) {
        await supabase.rpc('insert_notification', {
          p_user_id: b.passengerId,
          p_type: 'ride_started',
          p_title: 'Your driver has started 🚗',
          p_message: `Your driver is on the way for ${ride.fromShort} → ${ride.toShort}`,
          p_ride_id: ride.id,
          p_booking_id: b.id,
        });
      }
      setRide(prev => (prev ? { ...prev, status: 'started' } : prev));
      setBookings(prev =>
        prev.map(b =>
          b.status === 'confirmed' ? { ...b, status: 'started' as const } : b
        )
      );
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'LOCATION_PERMISSION_DENIED') return;
      const msg = e instanceof Error ? e.message : 'Failed to start ride';
      Alert.alert('Could not start ride', msg);
    } finally {
      setStartingRide(false);
    }
  }

  async function onCompleteRide() {
    if (!ride) return;
    setCompletingRide(true);
    try {
      const coords = await getCoordsForRideGps('complete');

      const confirmedBooking = bookings.find(
        b => b.status === 'confirmed' || b.status === 'started'
      );
      if (!confirmedBooking) {
        Alert.alert('No bookings', 'No active bookings found for this ride.');
        return;
      }

      const payment = await getPaymentForBooking(confirmedBooking.id);
      if (!payment) {
        Alert.alert('No payment', 'No payment record found. Cannot process payout.');
        return;
      }

      setPayoutNetAmount(payment.netAmount);

      const result = await verifyGpsAndPayout(
        ride.id,
        payment.id,
        coords.latitude,
        coords.longitude,
        driverPayoutPhoneE164(driverPhone, profile?.phoneE164, session?.phoneE164),
        payment.network
      );

      setGpsResult(result);
      setShowCompleteConfirm(true);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'LOCATION_PERMISSION_DENIED') return;
      const msg = e instanceof Error ? e.message : 'Failed to complete ride';
      Alert.alert('Could not complete ride', msg);
    } finally {
      setCompletingRide(false);
    }
  }

  async function onDoneVerified() {
    if (!ride) return;
    const err = await updateRideStatus(ride.id, 'completed');
    if (err) {
      Alert.alert('Error', err);
      return;
    }

    setRide(prev => (prev ? { ...prev, status: 'completed' } : prev));
    setBookings(prev =>
      prev.map(b =>
        b.status === 'confirmed' || b.status === 'started'
          ? { ...b, status: 'completed' as const }
          : b
      )
    );
    router.replace('/my-rides' as any);
  }

  async function onCompleteAnyway() {
    if (!ride) return;
    const activeBookings = bookings.filter(
      b => b.status === 'confirmed' || b.status === 'started'
    );

    const { error: rideErr } = await supabase
      .from('rides')
      .update({ status: 'completed' })
      .eq('id', ride.id);
    if (rideErr) {
      Alert.alert('Error', rideErr.message);
      return;
    }

    const syncErr = await syncBookingsForRideStatus(ride.id, 'completed');
    if (syncErr) {
      Alert.alert('Error', syncErr);
      return;
    }

    await supabase.from('payments').update({ escrow_status: 'disputed' }).eq('ride_id', ride.id);

    for (const b of activeBookings) {
      await supabase.rpc('insert_notification', {
        p_user_id: b.passengerId,
        p_type: 'ride_completed',
        p_title: 'Ride complete',
        p_message:
          'Your ride has been marked complete. Payment is under review by WeShare.',
        p_ride_id: ride.id,
        p_booking_id: b.id,
      });
    }

    setRide(prev => (prev ? { ...prev, status: 'completed' } : prev));
    setBookings(prev =>
      prev.map(b =>
        b.status === 'confirmed' || b.status === 'started'
          ? { ...b, status: 'completed' as const }
          : b
      )
    );
    router.replace('/my-rides' as any);
  }

  async function onSaveDriverPhone() {
    if (!ride) return;
    const digits = driverPhone.replace(/\D/g, '');
    if (digits.length !== 9) {
      Alert.alert('Invalid number', 'Enter a valid 9-digit mobile money number.');
      return;
    }
    setSavingPhone(true);
    const { error } = await supabase
      .from('payments')
      .update({ driver_phone: `250${digits}` })
      .eq('ride_id', ride.id);
    setSavingPhone(false);
    if (error) {
      Alert.alert('Could not save', error.message);
      return;
    }
    setDriverPhoneSaved(true);
    setSavedDriverPhoneDigits(digits);
  }

  async function onCancelRide() {
    if (!id) return;
    const err = await cancelRide(id);
    if (!err) {
      setRide(prev => (prev ? { ...prev, status: 'cancelled' } : prev));
      setBookings(prev =>
        prev.map(b =>
          b.status === 'pending' || b.status === 'confirmed' || b.status === 'started'
            ? { ...b, status: 'cancelled' as const }
            : b
        )
      );
    }
    setCancelConfirm(false);
  }

  if (loading) {
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
          <Pressable onPress={() => router.replace('/my-rides' as any)} style={[styles.outlineBtn, { borderColor: hair }]}>
            <ThemedText style={[styles.outlineBtnText, { color: textPri }]}>Go back</ThemedText>
          </Pressable>
        </View>
      </ScreenSafeArea>
    );
  }

  const isOwner = session?.userId === ride.postedByUserId;
  const depart = new Date(ride.departAtISO);
  const hasConfirmedBooking = bookings.some(b => b.status === 'confirmed');
  const showStartRide = isOwner && ride.status === 'active' && hasConfirmedBooking;
  const showCompleteRideBtn = isOwner && ride.status === 'started';
  const showPayoutPhoneCard = isOwner && (ride.status === 'active' || ride.status === 'started');
  const payoutPhoneDirty =
    savedDriverPhoneDigits != null && driverPhone.replace(/\D/g, '') !== savedDriverPhoneDigits;
  const showPayoutSavedCheck = driverPhoneSaved && !payoutPhoneDirty;

  return (
    <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
      <View style={[styles.header, { paddingTop: screenHeaderPaddingTop(insets.top), borderBottomColor: hair, backgroundColor: cardBg }]}>
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
            <View style={[styles.statusBadge, { backgroundColor: (RIDE_STATUS_COLOR[ride.status] ?? TEAL) + '22' }]}>
              <ThemedText style={[styles.statusBadgeText, { color: RIDE_STATUS_COLOR[ride.status] ?? TEAL }]}>
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

                {(b.status === 'confirmed' || b.status === 'started' || b.status === 'completed') && (
                  <View style={styles.confirmedRow}>
                    <IconSymbol
                      name={b.status === 'started' ? 'car.fill' : 'checkmark.circle.fill'}
                      size={14}
                      color={BOOKING_STATUS_COLOR[b.status]}
                    />
                    <ThemedText style={[styles.confirmedLabel, { color: textSub }]}>
                      {b.status === 'started'
                        ? 'Ride in progress'
                        : b.status === 'completed'
                          ? 'Completed'
                          : 'Confirmed'}
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          })
        )}

        {showPayoutPhoneCard && (
          <View style={[styles.payoutPhoneCard, { backgroundColor: cardBg, borderColor: hair }]}>
            <ThemedText style={[styles.payoutPhoneLabel, { color: textSub }]}>YOUR PAYOUT NUMBER</ThemedText>
            {savedDriverPhoneDigits ? (
              <ThemedText style={[styles.payoutPhoneHint, { color: textSub }]}>
                Saved — edit and tap Save to update
              </ThemedText>
            ) : null}
            <View style={styles.payoutPhoneRow}>
              <View style={[styles.phoneRow, { backgroundColor: inputBg, borderColor: hair, flex: 1 }]}>
                <ThemedText style={[styles.phonePrefix, { color: textPri }]}>+250</ThemedText>
                <TextInput
                  value={driverPhone}
                  onChangeText={t => {
                    const next = t.replace(/\D/g, '').slice(0, 9);
                    setDriverPhone(next);
                    setDriverPhoneSaved(
                      savedDriverPhoneDigits != null && next === savedDriverPhoneDigits
                    );
                  }}
                  keyboardType="number-pad"
                  maxLength={9}
                  placeholder="7XXXXXXXX"
                  placeholderTextColor={textSub}
                  style={[styles.phoneInput, { color: textPri }]}
                />
              </View>
              <Pressable
                onPress={onSaveDriverPhone}
                disabled={savingPhone}
                style={[styles.savePhoneBtn, { opacity: savingPhone ? 0.6 : 1 }]}
              >
                {savingPhone ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.savePhoneBtnText}>
                    {savedDriverPhoneDigits && !payoutPhoneDirty ? 'Saved' : 'Save'}
                  </ThemedText>
                )}
              </Pressable>
              {showPayoutSavedCheck ? (
                <IconSymbol name="checkmark.circle.fill" size={22} color={TEAL} />
              ) : null}
            </View>
          </View>
        )}

        {showStartRide && (
          <Pressable onPress={onStartRide} disabled={startingRide} style={styles.rideActionWrap}>
            <LinearGradient
              colors={[ACCENT, '#FF4500']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.rideActionGrad}
            >
              {startingRide ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.rideActionText}>Start Ride 🚗</ThemedText>
              )}
            </LinearGradient>
          </Pressable>
        )}

        {showCompleteRideBtn && !showCompleteConfirm && (
          <Pressable onPress={onCompleteRide} disabled={completingRide} style={styles.rideActionWrap}>
            <LinearGradient
              colors={[TEAL, '#00A896']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.rideActionGrad}
            >
              {completingRide ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.rideActionText}>Complete Ride ✓</ThemedText>
              )}
            </LinearGradient>
          </Pressable>
        )}

        {showCompleteConfirm && gpsResult && (
          <View style={[styles.gpsCard, { backgroundColor: cardBg, borderColor: hair }]}>
            {gpsResult.verified ? (
              <>
                <View style={styles.gpsCardHeader}>
                  <IconSymbol name="checkmark.circle.fill" size={20} color={TEAL} />
                  <ThemedText style={[styles.gpsVerifiedTitle, { color: TEAL }]}>GPS verified ✅</ThemedText>
                </View>
                <ThemedText style={[styles.gpsMuted, { color: textSub }]}>
                  You are {gpsResult.distanceKm.toFixed(1)}km from the destination
                </ThemedText>
                <ThemedText style={[styles.gpsInfo, { color: textPri }]}>
                  Payout of RWF {(payoutNetAmount ?? 0).toLocaleString()} is being sent to your mobile money
                </ThemedText>
                <Pressable onPress={onDoneVerified} style={styles.rideActionWrap}>
                  <LinearGradient
                    colors={[TEAL, '#00A896']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gpsDoneGrad}
                  >
                    <ThemedText style={styles.rideActionText}>Done</ThemedText>
                  </LinearGradient>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.gpsCardHeader}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={20} color={AMBER} />
                  <ThemedText style={[styles.gpsWarningTitle, { color: AMBER }]}>
                    You are {gpsResult.distanceKm.toFixed(1)}km from the destination
                  </ThemedText>
                </View>
                <ThemedText style={[styles.gpsMuted, { color: textSub }]}>
                  WeShare verifies ride completion by GPS. You appear to be far from the drop-off point.
                </ThemedText>
                <View style={styles.gpsActions}>
                  <Pressable
                    onPress={() => {
                      setShowCompleteConfirm(false);
                      setGpsResult(null);
                    }}
                    style={[styles.gpsCancelBtn, { borderColor: hair }]}
                  >
                    <ThemedText style={[styles.gpsCancelText, { color: textPri }]}>Cancel</ThemedText>
                  </Pressable>
                  <Pressable onPress={onCompleteAnyway} style={[styles.gpsAnywayWrap, { flex: 1 }]}>
                    <LinearGradient
                      colors={[ACCENT, '#FF4500']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gpsAnywayGrad}
                    >
                      <ThemedText style={styles.rideActionText}>Complete anyway</ThemedText>
                    </LinearGradient>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        )}

        {isOwner && ride.status === 'active' && (
          cancelConfirm ? (
            <View
              style={[
                styles.declineBtn,
                {
                  height: 'auto',
                  paddingVertical: 10,
                  gap: 8,
                  backgroundColor: '#EF444414',
                  borderColor: '#EF444430',
                  borderWidth: 1,
                },
              ]}
            >
              <ThemedText style={[styles.actionBtnText, { color: '#EF4444' }]} numberOfLines={2}>
                This will cancel all passenger bookings
              </ThemedText>
              <View style={styles.actions}>
                <Pressable onPress={onCancelRide} style={[styles.declineBtn, { backgroundColor: '#EF4444' }]}>
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
              <ThemedText style={[styles.actionBtnText, { color: '#EF4444' }]}>Cancel ride</ThemedText>
            </Pressable>
          )
        )}
      </ScrollView>
    </ScreenSafeArea>
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
  payoutPhoneCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  payoutPhoneLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  payoutPhoneHint: { fontSize: 12, fontWeight: '600', marginTop: -4 },
  payoutPhoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  savePhoneBtn: {
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: TEAL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePhoneBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  rideActionWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  rideActionGrad: { height: 50, alignItems: 'center', justifyContent: 'center' },
  rideActionText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  gpsCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10, marginTop: 10 },
  gpsCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gpsVerifiedTitle: { fontSize: 15, fontWeight: '900', flex: 1 },
  gpsWarningTitle: { fontSize: 14, fontWeight: '800', flex: 1 },
  gpsMuted: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  gpsInfo: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  gpsDoneGrad: { height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  gpsActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  gpsCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsCancelText: { fontSize: 14, fontWeight: '800' },
  gpsAnywayWrap: { borderRadius: 12, overflow: 'hidden' },
  gpsAnywayGrad: { height: 44, alignItems: 'center', justifyContent: 'center' },
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
