/**
 * WeShare — My Rides (Driver view)
 * Auth-gated. Shows rides posted by the logged-in user.
 */

import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { countActiveBookingsForRides } from '@/lib/bookings';
import { cancelRide, listMyRides, type Ride } from '@/lib/rides';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';

const STRIP_COLOR: Record<string, string> = {
  active: TEAL,
  started: ACCENT,
  cancelled: '#EF4444',
  completed: '#0EA5E9',
};

function statusColorAlpha(hex: string) {
  return `${hex}26`;
}

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

export default function MyRidesScreen() {
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
          icon="list.bullet.rectangle"
          title="My Rides"
          description="Sign in to see and manage the rides you've posted as a driver."
          redirectPath="/my-rides"
        />
      </SafeAreaView>
    );
  }

  return (
    <MyRidesList
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

function MyRidesList({
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
  const [rides, setRides] = useState<Ride[]>([]);
  const [bookingCounts, setBookingCounts] = useState<Record<string, number>>({});
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await listMyRides(session.userId);
      setRides(data);
      const counts = await countActiveBookingsForRides(data.map(r => r.id));
      setBookingCounts(counts);
    } finally {
      setLoading(false);
    }
  }, [session.userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const statusCounts = useMemo(() => {
    const counts = { active: 0, completed: 0, cancelled: 0 };
    for (const r of rides) {
      if (r.status in counts) counts[r.status as keyof typeof counts] += 1;
    }
    return counts;
  }, [rides]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function onCancelRide(rideId: string) {
    const err = await cancelRide(rideId);
    if (!err) {
      setRides(prev => prev.map(r => (r.id === rideId ? { ...r, status: 'cancelled' } : r)));
    }
    setCancelConfirmId(null);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: hair, backgroundColor: cardBg }]}>
        <ThemedText style={[styles.headerTitle, { color: textPri }]}>My Rides</ThemedText>
        <Pressable onPress={() => router.push('/post-ride' as any)} style={styles.newBtn}>
          <LinearGradient colors={[ACCENT, '#FF4500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.newBtnGrad}>
            <IconSymbol name="plus" size={14} color="#fff" />
            <ThemedText style={styles.newBtnText}>New ride</ThemedText>
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
          {rides.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: hair }]}>
              <ThemedText style={{ fontSize: 40 }}>🚗</ThemedText>
              <ThemedText style={[styles.emptyTitle, { color: textPri }]}>No rides yet</ThemedText>
              <ThemedText style={[styles.emptySub, { color: textSub }]}>
                Post your first ride and start sharing your route with passengers.
              </ThemedText>
              <Pressable onPress={() => router.push('/post-ride' as any)} style={styles.emptyBtn}>
                <LinearGradient colors={[ACCENT, '#FF4500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyBtnGrad}>
                  <ThemedText style={styles.emptyBtnText}>Post a ride →</ThemedText>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <>
              <RideStatusSummary counts={statusCounts} textSub={textSub} />
              {rides.map(r => (
                <MyRideCard
                  key={r.id}
                  ride={r}
                  expanded={expandedId === r.id}
                  onToggle={() => setExpandedId(prev => (prev === r.id ? null : r.id))}
                  bookingCount={bookingCounts[r.id] ?? 0}
                  cancelConfirmId={cancelConfirmId}
                  onCancelConfirm={setCancelConfirmId}
                  onCancelRide={onCancelRide}
                  router={router}
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
    </SafeAreaView>
  );
}

function RideStatusSummary({
  counts,
  textSub,
}: {
  counts: { active: number; completed: number; cancelled: number };
  textSub: string;
}) {
  const items: { n: number; label: string; color: string }[] = [];
  if (counts.active > 0) items.push({ n: counts.active, label: 'active', color: TEAL });
  if (counts.completed > 0) items.push({ n: counts.completed, label: 'completed', color: '#0EA5E9' });
  if (counts.cancelled > 0) items.push({ n: counts.cancelled, label: 'cancelled', color: '#EF4444' });

  if (items.length === 0) return null;

  return (
    <ThemedText style={[styles.summaryRow, { color: textSub }]}>
      {items.map((item, i) => (
        <ThemedText key={item.label}>
          {i > 0 ? <ThemedText style={styles.summaryDot}> · </ThemedText> : null}
          <ThemedText style={{ color: item.color, fontWeight: '700', fontSize: 13 }}>
            {item.n} {item.label}
          </ThemedText>
        </ThemedText>
      ))}
    </ThemedText>
  );
}

function MyRideCard({
  ride: r,
  expanded,
  onToggle,
  bookingCount,
  cancelConfirmId,
  onCancelConfirm,
  onCancelRide,
  router,
  hair,
  textPri,
  textSub,
  inputBg,
  cardBg,
}: {
  ride: Ride;
  expanded: boolean;
  onToggle: () => void;
  bookingCount: number;
  cancelConfirmId: string | null;
  onCancelConfirm: (id: string | null) => void;
  onCancelRide: (id: string) => void;
  router: ReturnType<typeof useRouter>;
  hair: string;
  textPri: string;
  textSub: string;
  inputBg: string;
  cardBg: string;
}) {
  const depart = new Date(r.departAtISO);
  const stripColor = STRIP_COLOR[r.status] ?? STRIP_COLOR.active;

  return (
    <Pressable
      onPress={onToggle}
      style={[styles.rideCard, { backgroundColor: cardBg, borderColor: hair }]}
    >
      <View style={[styles.topStrip, { backgroundColor: stripColor }]} />

      <View style={styles.cardBody}>
        <View style={styles.routeRow}>
          <View style={[styles.routeTextWrap, expanded && styles.routeTextWrapExpanded]}>
            {expanded ? (
              <>
                <ThemedText style={[styles.routeFrom, { color: textPri }]}>{r.fromShort}</ThemedText>
                <ThemedText style={[styles.routeArrow, { color: textSub }]}>→</ThemedText>
                <ThemedText style={[styles.routeTo, { color: textPri }]}>{r.toShort}</ThemedText>
              </>
            ) : (
              <>
                <ThemedText style={[styles.routeFrom, { color: textPri }]} numberOfLines={1}>
                  {r.fromShort}
                </ThemedText>
                <ThemedText style={[styles.routeArrow, { color: textSub }]}> → </ThemedText>
                <ThemedText style={[styles.routeTo, { color: textPri }]} numberOfLines={1}>
                  {r.toShort}
                </ThemedText>
              </>
            )}
          </View>

          <View style={styles.routeRight}>
            <View style={[styles.statusPill, { backgroundColor: statusColorAlpha(stripColor) }]}>
              <ThemedText style={[styles.statusPillText, { color: stripColor }]}>{r.status}</ThemedText>
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

        {!Number.isNaN(depart.getTime()) && (
          <View style={styles.timeRow}>
            <IconSymbol name="clock.fill" size={12} color={textSub} />
            <ThemedText style={[styles.timeText, { color: textSub }]}>
              {formatDepart(depart)}
            </ThemedText>
          </View>
        )}

        {expanded && (
          <View style={[styles.expandedBlock, { borderTopColor: hair }]}>
            <View style={styles.detailRow}>
              <View style={[styles.detailChip, { backgroundColor: inputBg }]}>
                <IconSymbol name="person.2.fill" size={11} color={textSub} />
                <ThemedText style={[styles.detailChipText, { color: textSub }]}>
                  {r.seats} seats
                </ThemedText>
              </View>
              <View style={[styles.detailChip, { backgroundColor: inputBg }]}>
                <ThemedText style={[styles.detailChipText, { color: textSub }]}>
                  RWF {r.priceRwf.toLocaleString()} / seat
                </ThemedText>
              </View>
              {bookingCount > 0 && (
                <View style={[styles.detailChip, { backgroundColor: inputBg }]}>
                  <ThemedText style={[styles.detailChipText, { color: textSub }]}>
                    {bookingCount} booking{bookingCount === 1 ? '' : 's'}
                  </ThemedText>
                </View>
              )}
            </View>

            {r.note ? (
              <View style={[styles.noteBox, { backgroundColor: inputBg }]}>
                <ThemedText style={[styles.noteText, { color: textSub }]}>{r.note}</ThemedText>
              </View>
            ) : null}

            <View style={styles.actionsRow}>
              <Pressable
                onPress={() => router.push(`/rides/${r.id}` as any)}
                style={[styles.actionBtn, { backgroundColor: inputBg }]}
              >
                <IconSymbol name="person.2.fill" size={13} color={textSub} />
                <ThemedText style={[styles.actionText, { color: textPri }]} numberOfLines={1}>
                  View Bookings
                </ThemedText>
              </Pressable>
              {r.status === 'active' && bookingCount === 0 && (
                <Pressable
                  onPress={() => router.push(`/edit-ride/${r.id}` as any)}
                  style={[styles.actionBtn, { backgroundColor: inputBg }]}
                >
                  <IconSymbol name="pencil" size={13} color={textSub} />
                  <ThemedText style={[styles.actionText, { color: textPri }]} numberOfLines={1}>
                    Edit
                  </ThemedText>
                </Pressable>
              )}
              {r.status === 'active' &&
                (cancelConfirmId === r.id ? (
                  <View style={styles.cancelConfirmBox}>
                    <ThemedText style={styles.cancelConfirmText}>
                      This will cancel all passenger bookings
                    </ThemedText>
                    <View style={styles.cancelConfirmActions}>
                      <Pressable onPress={() => onCancelRide(r.id)} style={styles.cancelConfirmYes}>
                        <ThemedText style={styles.cancelConfirmYesText}>Yes, cancel ride</ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => onCancelConfirm(null)}
                        style={[styles.actionBtn, { flex: 1, backgroundColor: inputBg }]}
                      >
                        <ThemedText style={[styles.actionText, { color: textPri }]} numberOfLines={1}>
                          Never mind
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable onPress={() => onCancelConfirm(r.id)} style={styles.cancelBtn}>
                    <ThemedText style={styles.cancelBtnText}>Cancel ride</ThemedText>
                  </Pressable>
                ))}
            </View>
          </View>
        )}
      </View>
    </Pressable>
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
  newBtn: { borderRadius: 10, overflow: 'hidden' },
  newBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7 },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  scroll: { padding: 16, paddingTop: 12 },
  summaryRow: { fontSize: 13, fontWeight: '700', marginBottom: 14, lineHeight: 18 },
  summaryDot: { fontSize: 13, fontWeight: '700' },
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptySub: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  emptyBtn: { borderRadius: 14, overflow: 'hidden', width: '100%', marginTop: 4 },
  emptyBtnGrad: { height: 48, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  rideCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  topStrip: { height: 3, width: '100%' },
  cardBody: { padding: 14, gap: 8 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeTextWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  routeTextWrapExpanded: { flexDirection: 'column', alignItems: 'flex-start', gap: 2 },
  routeFrom: { fontWeight: '800', fontSize: 14, flexShrink: 1 },
  routeArrow: { fontWeight: '600', fontSize: 14 },
  routeTo: { fontWeight: '800', fontSize: 14, flexShrink: 1 },
  routeRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  chevronWrap: { width: 18, alignItems: 'center', justifyContent: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { fontSize: 12, fontWeight: '600' },
  expandedBlock: { gap: 10, paddingTop: 12, marginTop: 4, borderTopWidth: 1 },
  detailRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  detailChipText: { fontSize: 12, fontWeight: '700' },
  noteBox: { borderRadius: 10, padding: 10 },
  noteText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    flex: 1,
    minWidth: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  actionText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  cancelBtn: {
    width: '100%',
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF444440',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#EF4444', fontSize: 13, fontWeight: '800' },
  cancelConfirmBox: { width: '100%', gap: 8 },
  cancelConfirmText: { color: '#EF4444', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  cancelConfirmActions: { flexDirection: 'row', gap: 8, width: '100%' },
  cancelConfirmYes: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelConfirmYesText: { color: '#fff', fontSize: 13, fontWeight: '800' },
}) as any;
