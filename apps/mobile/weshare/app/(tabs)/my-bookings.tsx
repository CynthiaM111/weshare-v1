/**
 * WeShare — Bookings (Passenger view)
 * Auth-gated. Shows rides the logged-in user has booked as a passenger.
 */

import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenSafeArea } from '@/components/ScreenSafeArea';
import { LinearGradient } from 'expo-linear-gradient';

import { HeaderIconAction, TabScreenHeader } from '@/components/TabScreenHeader';
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

const STRIP_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  confirmed: TEAL,
  started: ACCENT,
  cancelled: '#EF4444',
  completed: '#0EA5E9',
};

function statusColorAlpha(hex: string) {
  return `${hex}26`;
}

function formatDepartHeadline(d: Date) {
  return {
    date: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

const PASSENGER_STATUS_LABEL: Record<string, string> = {
  pending: 'Awaiting driver',
  confirmed: 'Confirmed',
  started: 'On the way',
  completed: 'Trip complete',
  cancelled: 'Cancelled',
};

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
      <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
        <AuthGate
          icon="ticket"
          title="Bookings"
          description="Sign in to see rides you've booked as a passenger."
          redirectPath="/my-bookings"
        />
      </ScreenSafeArea>
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
  const params = useLocalSearchParams<{ expandBookingId?: string }>();
  const [bookings, setBookings] = useState<BookingWithRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const id = typeof params.expandBookingId === 'string' ? params.expandBookingId : '';
    if (id) setExpandedId(id);
  }, [params.expandBookingId]);

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

  const statusCounts = useMemo(() => {
    const counts = { pending: 0, confirmed: 0, started: 0, cancelled: 0, completed: 0 };
    for (const b of bookings) {
      if (b.status in counts) counts[b.status as keyof typeof counts] += 1;
    }
    return counts;
  }, [bookings]);

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
    <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
      <TabScreenHeader
        title="Bookings"
        textPri={textPri}
        hair={hair}
        cardBg={cardBg}
        action={
          <HeaderIconAction
            onPress={() => router.push('/' as any)}
            colors={[TEAL, '#00A896']}
            icon="magnifyingglass"
            accessibilityLabel="Find a ride"
          />
        }
      />

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
            <>
              <BookingStatusSummary counts={statusCounts} textSub={textSub} />
              {bookings.map(b => (
              <BookingCard
                key={b.id}
                booking={b}
                expanded={expandedId === b.id}
                onToggle={() => setExpandedId(prev => (prev === b.id ? null : b.id))}
                onCancel={onCancel}
                hair={hair}
                textPri={textPri}
                textSub={textSub}
                inputBg={inputBg}
                cardBg={cardBg}
              />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </ScreenSafeArea>
  );
}

function BookingStatusSummary({
  counts,
  textSub,
}: {
  counts: { pending: number; confirmed: number; started: number; cancelled: number; completed: number };
  textSub: string;
}) {
  const items: { n: number; label: string; color: string }[] = [];
  if (counts.confirmed > 0) items.push({ n: counts.confirmed, label: 'confirmed', color: TEAL });
  if (counts.started > 0) items.push({ n: counts.started, label: 'in progress', color: ACCENT });
  if (counts.pending > 0) items.push({ n: counts.pending, label: 'pending', color: '#F59E0B' });
  if (counts.completed > 0) items.push({ n: counts.completed, label: 'completed', color: '#0EA5E9' });
  if (counts.cancelled > 0) items.push({ n: counts.cancelled, label: 'cancelled', color: '#EF4444' });

  if (items.length === 0) return null;

  return (
    <View style={styles.summaryWrap}>
      <ThemedText style={[styles.summaryTitle, { color: textSub }]}>YOUR TRIPS</ThemedText>
      <View style={styles.summaryChips}>
        {items.map(item => (
          <View
            key={item.label}
            style={[styles.summaryChip, { backgroundColor: statusColorAlpha(item.color), borderColor: item.color }]}
          >
            <ThemedText style={[styles.summaryChipText, { color: item.color }]}>
              {item.n} {item.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

function BookingCard({
  booking: b,
  expanded,
  onToggle,
  onCancel,
  hair,
  textPri,
  textSub,
  inputBg,
  cardBg,
}: {
  booking: BookingWithRide;
  expanded: boolean;
  onToggle: () => void;
  onCancel: (id: string) => void;
  hair: string;
  textPri: string;
  textSub: string;
  inputBg: string;
  cardBg: string;
}) {
  const ride = b.ride;
  const depart = ride ? new Date(ride.departAtISO) : null;
  const total = ride ? ride.priceRwf * b.seats : null;
  const canCancel = b.status === 'pending' || b.status === 'confirmed' || b.status === 'started';
  const accentColor = STRIP_COLOR[b.status] ?? STRIP_COLOR.pending;
  const statusLabel = PASSENGER_STATUS_LABEL[b.status] ?? b.status;
  const headline = depart && !Number.isNaN(depart.getTime()) ? formatDepartHeadline(depart) : null;

  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.ticketCard,
        {
          backgroundColor: cardBg,
          borderColor: hair,
          borderLeftColor: accentColor,
        },
      ]}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketLabelRow}>
          <IconSymbol name="paperplane.fill" size={12} color={TEAL} />
          <ThemedText style={[styles.ticketLabel, { color: TEAL }]}>MY TRIP</ThemedText>
        </View>
        <View style={styles.ticketHeaderRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColorAlpha(accentColor) }]}>
            <ThemedText style={[styles.statusBadgeText, { color: accentColor }]}>{statusLabel}</ThemedText>
          </View>
          <View
            style={[
              styles.chevronWrap,
              { transform: [{ rotate: expanded ? '180deg' : '0deg' }], opacity: expanded ? 1 : 0.55 },
            ]}
          >
            <IconSymbol name="chevron.down" size={14} color={textSub} />
          </View>
        </View>
      </View>

      {headline ? (
        <View style={styles.whenBlock}>
          <ThemedText style={[styles.whenDate, { color: textPri }]}>{headline.date}</ThemedText>
          <ThemedText style={[styles.whenTime, { color: TEAL }]}>{headline.time}</ThemedText>
        </View>
      ) : null}

      {ride ? (
        <View style={styles.journeyBlock}>
          <View style={styles.journeyRow}>
            <View style={[styles.journeyDot, { backgroundColor: TEAL }]} />
            <ThemedText
              style={[styles.journeyPlace, { color: textPri }]}
              numberOfLines={expanded ? undefined : 2}
            >
              {ride.fromShort}
            </ThemedText>
          </View>
          <View style={[styles.journeyLine, { backgroundColor: hair }]} />
          <View style={styles.journeyRow}>
            <View style={[styles.journeyDot, { backgroundColor: ACCENT }]} />
            <ThemedText
              style={[styles.journeyPlace, { color: textPri }]}
              numberOfLines={expanded ? undefined : 2}
            >
              {ride.toShort}
            </ThemedText>
          </View>
        </View>
      ) : (
        <ThemedText style={[styles.unavailableText, { color: textSub }]}>Ride unavailable</ThemedText>
      )}

      <View style={[styles.ticketFooter, { borderTopColor: hair }]}>
        <ThemedText style={[styles.ticketMeta, { color: textSub }]}>
          {b.seats} seat{b.seats === 1 ? '' : 's'}
          {total != null ? ` · RWF ${total.toLocaleString()} paid` : ''}
        </ThemedText>
      </View>

      {expanded && canCancel && (
        <Pressable onPress={() => onCancel(b.id)} style={styles.cancelBtn}>
          <ThemedText style={styles.cancelBtnText}>Cancel booking</ThemedText>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 16, paddingTop: 12 },
  summaryWrap: { gap: 8, marginBottom: 14 },
  summaryTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  summaryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryChip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  summaryChipText: { fontSize: 12, fontWeight: '800' },
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptySub: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  emptyBtn: { borderRadius: 14, overflow: 'hidden', width: '100%', marginTop: 4 },
  emptyBtnGrad: { height: 48, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  ticketCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  ticketHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ticketLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  ticketHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  chevronWrap: { width: 18, alignItems: 'center', justifyContent: 'center' },
  whenBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  whenDate: { fontSize: 17, fontWeight: '900' },
  whenTime: { fontSize: 17, fontWeight: '900' },
  journeyBlock: { gap: 0, paddingLeft: 2 },
  journeyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  journeyDot: { width: 10, height: 10, borderRadius: 5 },
  journeyLine: { width: 2, height: 14, marginLeft: 4 },
  journeyPlace: { flex: 1, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  unavailableText: { fontSize: 14, fontWeight: '600' },
  ticketFooter: { borderTopWidth: 1, paddingTop: 10 },
  ticketMeta: { fontSize: 12, fontWeight: '600' },
  cancelBtn: {
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF444440',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  cancelBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '800' },
}) as any;
