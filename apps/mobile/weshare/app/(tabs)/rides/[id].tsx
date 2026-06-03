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
import { formatDepartDate, formatDepartTime } from '@/lib/datetime';
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

const RIDE_STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  started: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const BOOKING_STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  started: 'On trip',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

function statusTint(hex: string) {
  return `${hex}22`;
}

function passengerInitial(name: string) {
  const t = name.trim();
  return t ? t.charAt(0).toUpperCase() : '?';
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
  const [showStartConfirm, setShowStartConfirm] = useState(false);
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
      setShowStartConfirm(false);
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
  const hasDepart = !Number.isNaN(depart.getTime());
  const stripColor = RIDE_STATUS_COLOR[ride.status] ?? TEAL;
  const bookedSeats = bookings
    .filter(b => b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.seats, 0);
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const hasConfirmedBooking = confirmedCount > 0;
  const compactDepart = hasDepart
    ? `${formatDepartDate(depart)} · ${formatDepartTime(depart)}`
    : ride.departAtISO;
  const showStartRide = isOwner && ride.status === 'active' && hasConfirmedBooking;
  const showCompleteRideBtn = isOwner && ride.status === 'started';
  const showPayoutPhoneCard = isOwner && (ride.status === 'active' || ride.status === 'started');
  const payoutPhoneDirty =
    savedDriverPhoneDigits != null && driverPhone.replace(/\D/g, '') !== savedDriverPhoneDigits;
  const showPayoutSavedCheck = driverPhoneSaved && !payoutPhoneDirty;

  return (
    <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
      <View style={[styles.header, { paddingTop: screenHeaderPaddingTop(insets.top), borderBottomColor: hair, backgroundColor: cardBg }]}>
        <Pressable
          onPress={() => router.replace('/my-rides' as any)}
          accessibilityRole="button"
          accessibilityLabel="Back to my rides"
          style={[
            styles.headerBack,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : NAVY + '0C',
              borderColor: isDark ? 'rgba(255,255,255,0.38)' : NAVY + '55',
            },
          ]}
        >
          <IconSymbol name="chevron.left" size={22} color={textPri} />
        </Pressable>
        <ThemedText style={[styles.headerTitle, { color: textPri }]}>Ride details</ThemedText>
        <View style={styles.headerBackSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.compactTrip, { backgroundColor: inputBg, borderColor: hair }]}>
          <View style={styles.compactTripTop}>
            <ThemedText style={[styles.compactRoute, { color: textSub }]} numberOfLines={1}>
              {ride.fromShort} → {ride.toShort}
            </ThemedText>
            <View style={[styles.compactStatus, { backgroundColor: statusTint(stripColor) }]}>
              <ThemedText style={[styles.compactStatusText, { color: stripColor }]}>
                {RIDE_STATUS_LABEL[ride.status] ?? ride.status}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.compactMeta, { color: textSub }]} numberOfLines={1}>
            {compactDepart} · {bookedSeats}/{ride.seats} booked
          </ThemedText>
        </View>

        <View style={styles.bookingsSection}>
          <View style={styles.sectionHead}>
            <ThemedText style={[styles.bookingsSectionTitle, { color: textPri }]}>Passenger bookings</ThemedText>
            <View style={[styles.sectionCount, { backgroundColor: ACCENT + '18' }]}>
              <ThemedText style={[styles.sectionCountText, { color: ACCENT }]}>{bookings.length}</ThemedText>
            </View>
            {pendingCount > 0 ? (
              <View style={[styles.pendingBadge, { backgroundColor: GOLD + '22' }]}>
                <ThemedText style={[styles.pendingBadgeText, { color: GOLD }]}>
                  {pendingCount} pending
                </ThemedText>
              </View>
            ) : null}
          </View>
          {pendingCount > 0 ? (
            <ThemedText style={[styles.bookingsSectionSub, { color: textSub }]}>
              Review and confirm pending requests before you start the ride.
            </ThemedText>
          ) : null}

        {bookings.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: cardBg, borderColor: hair }]}>
            <View style={[styles.emptyIcon, { backgroundColor: TEAL + '14' }]}>
              <IconSymbol name="person.2.fill" size={28} color={TEAL} />
            </View>
            <ThemedText style={[styles.emptyTitle, { color: textPri }]}>No bookings yet</ThemedText>
            <ThemedText style={[styles.emptyText, { color: textSub }]}>
              When passengers book this ride, they'll show up here for you to confirm.
            </ThemedText>
          </View>
        ) : (
          bookings.map(b => {
            const total = ride.priceRwf * b.seats;
            const busy = actionId === b.id;
            const name = passengerDisplayName(b.passengerProfile, b.passengerId);
            const statusColor = BOOKING_STATUS_COLOR[b.status] ?? TEAL;

            return (
              <View key={b.id} style={[styles.bookingCard, { backgroundColor: cardBg, borderColor: hair }]}>
                <View style={styles.bookingTop}>
                  <View style={[styles.avatar, { backgroundColor: statusColor + '20' }]}>
                    <ThemedText style={[styles.avatarText, { color: statusColor }]}>
                      {passengerInitial(name)}
                    </ThemedText>
                  </View>
                  <View style={styles.bookingInfo}>
                    <ThemedText style={[styles.passengerName, { color: textPri }]} numberOfLines={1}>
                      {name}
                    </ThemedText>
                    <ThemedText style={[styles.bookingMeta, { color: textSub }]}>
                      {b.seats} seat{b.seats === 1 ? '' : 's'} · RWF {total.toLocaleString()}
                    </ThemedText>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusTint(statusColor) }]}>
                    <ThemedText style={[styles.statusPillText, { color: statusColor }]}>
                      {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                    </ThemedText>
                  </View>
                </View>

                {isOwner && b.status === 'pending' && (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => onBookingAction(b.id, 'confirmed')}
                      disabled={busy}
                      style={[styles.confirmWrap, { flex: 1, opacity: busy ? 0.6 : 1 }]}
                    >
                      <LinearGradient colors={[TEAL, '#00a896']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.confirmGrad}>
                        {busy ? (
                          <ActivityIndicator color="#fff" size="small" />
                        ) : (
                          <ThemedText style={styles.actionBtnText}>Confirm</ThemedText>
                        )}
                      </LinearGradient>
                    </Pressable>
                    <Pressable
                      onPress={() => onDeclineBooking(b.id, b.rideId)}
                      disabled={busy}
                      style={[
                        styles.declineOutline,
                        { borderColor: RED + '45', opacity: busy ? 0.6 : 1 },
                      ]}
                    >
                      <ThemedText style={[styles.declineOutlineText, { color: RED }]}>Decline</ThemedText>
                    </Pressable>
                  </View>
                )}

                {(b.status === 'confirmed' || b.status === 'started' || b.status === 'completed') && (
                  <View style={[styles.confirmedRow, { backgroundColor: statusTint(statusColor) }]}>
                    <IconSymbol
                      name={b.status === 'started' ? 'car.fill' : 'checkmark.circle.fill'}
                      size={14}
                      color={statusColor}
                    />
                    <ThemedText style={[styles.confirmedLabel, { color: statusColor }]}>
                      {BOOKING_STATUS_LABEL[b.status] ?? b.status}
                    </ThemedText>
                  </View>
                )}
              </View>
            );
          })
        )}
        </View>

        {showPayoutPhoneCard && (
          <View style={[styles.payoutPhoneCard, { backgroundColor: cardBg, borderColor: hair }]}>
            <View style={styles.payoutPhoneHead}>
              <View style={[styles.departIcon, { backgroundColor: TEAL + '16' }]}>
                <IconSymbol name="person.fill" size={15} color={TEAL} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.payoutPhoneTitle, { color: textPri }]}>Payout number</ThemedText>
                <ThemedText style={[styles.payoutPhoneHint, { color: textSub }]}>
                  Mobile money for ride earnings
                </ThemedText>
              </View>
            </View>
            {savedDriverPhoneDigits ? (
              <ThemedText style={[styles.payoutPhoneSaved, { color: TEAL }]}>
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
          showStartConfirm ? (
            <View style={[styles.startWarningCard, { backgroundColor: cardBg, borderColor: AMBER + '50' }]}>
              <View style={styles.startWarningHead}>
                <View style={[styles.startWarningIcon, { backgroundColor: AMBER + '18' }]}>
                  <IconSymbol name="car.fill" size={18} color={AMBER} />
                </View>
                <ThemedText style={[styles.startWarningTitle, { color: textPri }]}>Ready to start?</ThemedText>
              </View>
              <ThemedText style={[styles.startWarningBody, { color: textSub }]}>
                {confirmedCount === 1
                  ? '1 confirmed passenger will be notified that you\'re on the way.'
                  : `${confirmedCount} confirmed passengers will be notified that you're on the way.`}{' '}
                WeShare uses your location when you start and complete the ride—only continue when you're ready to
                depart.
              </ThemedText>
              <View style={styles.startWarningActions}>
                <Pressable
                  onPress={() => setShowStartConfirm(false)}
                  disabled={startingRide}
                  style={[styles.startWarningCancel, { borderColor: hair }]}
                >
                  <ThemedText style={[styles.startWarningCancelText, { color: textPri }]}>Not yet</ThemedText>
                </Pressable>
                <Pressable
                  onPress={onStartRide}
                  disabled={startingRide}
                  style={[styles.startWarningConfirmWrap, { flex: 1, opacity: startingRide ? 0.6 : 1 }]}
                >
                  <LinearGradient
                    colors={[ACCENT, '#FF4500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.startWarningConfirmGrad}
                  >
                    {startingRide ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <ThemedText style={styles.rideActionText}>Yes, start ride</ThemedText>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={() => setShowStartConfirm(true)} style={styles.rideActionWrap}>
              <LinearGradient
                colors={[ACCENT, '#FF4500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.rideActionGrad}
              >
                <ThemedText style={styles.rideActionText}>Start ride</ThemedText>
              </LinearGradient>
            </Pressable>
          )
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
                <ThemedText style={styles.rideActionText}>Complete ride</ThemedText>
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
  compactTrip: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  compactTripTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compactRoute: { flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  compactStatus: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  compactStatusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  compactMeta: { fontSize: 11, fontWeight: '600', lineHeight: 15 },
  bookingsSection: { gap: 12 },
  bookingsSectionTitle: { fontSize: 20, fontWeight: '900', lineHeight: 26 },
  bookingsSectionSub: { fontSize: 13, fontWeight: '600', lineHeight: 18, marginTop: -4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  departIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  startWarningCard: { borderRadius: 18, borderWidth: 1.5, padding: 16, gap: 12 },
  startWarningHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  startWarningIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  startWarningTitle: { fontSize: 17, fontWeight: '900', lineHeight: 22, flex: 1 },
  startWarningBody: { fontSize: 14, fontWeight: '600', lineHeight: 21 },
  startWarningActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  startWarningCancel: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startWarningCancelText: { fontSize: 14, fontWeight: '800' },
  startWarningConfirmWrap: { borderRadius: 12, overflow: 'hidden' },
  startWarningConfirmGrad: { height: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  sectionCount: { minWidth: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  sectionCountText: { fontSize: 13, fontWeight: '900' },
  pendingBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  pendingBadgeText: { fontSize: 11, fontWeight: '800' },
  emptyBox: { borderRadius: 18, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '900' },
  emptyText: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 19, maxWidth: 280 },
  bookingCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12, shadowColor: '#08111F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  bookingTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '900' },
  bookingInfo: { flex: 1, gap: 2, minWidth: 0 },
  passengerName: { fontSize: 16, fontWeight: '900', lineHeight: 20 },
  bookingMeta: { fontSize: 12, fontWeight: '600' },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusPillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  confirmWrap: { borderRadius: 12, overflow: 'hidden' },
  confirmGrad: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  declineOutline: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineOutlineText: { fontSize: 13, fontWeight: '900' },
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
  confirmedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  confirmedLabel: { fontSize: 13, fontWeight: '800' },
  payoutPhoneCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  payoutPhoneHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  payoutPhoneTitle: { fontSize: 15, fontWeight: '900', lineHeight: 20 },
  payoutPhoneHint: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  payoutPhoneSaved: { fontSize: 12, fontWeight: '700' },
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
