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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenSafeArea } from '@/components/ScreenSafeArea';
import { LinearGradient } from 'expo-linear-gradient';

import { HeaderIconAction, TabScreenHeader } from '@/components/TabScreenHeader';
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

function formatDepartShort(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDepartDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDepartTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
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
      <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
        <AuthGate
          icon="list.bullet.rectangle"
          title="My Rides"
          description="Sign in to see and manage the rides you've posted as a driver."
          redirectPath="/my-rides"
        />
      </ScreenSafeArea>
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
    <ScreenSafeArea backgroundColor={bg} topBackgroundColor={cardBg}>
      <TabScreenHeader
        title="My Rides"
        textPri={textPri}
        hair={hair}
        cardBg={cardBg}
        action={
          <HeaderIconAction
            onPress={() => router.push('/post-ride' as any)}
            colors={[ACCENT, '#FF4500']}
            icon="plus"
            accessibilityLabel="Post new ride"
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
    </ScreenSafeArea>
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
  const hasDepart = !Number.isNaN(depart.getTime());
  const stripColor = STRIP_COLOR[r.status] ?? STRIP_COLOR.active;

  return (
    <View style={[styles.rideCard, { backgroundColor: cardBg, borderColor: hair }]}>
      <View style={[styles.topStrip, { backgroundColor: stripColor }]} />

      <Pressable onPress={onToggle} style={styles.cardBody}>
        <View style={styles.routeRow}>
          <View style={styles.routeCol}>
            {expanded ? (
              <>
                <ThemedText style={[styles.routePlace, { color: textPri }]} numberOfLines={1} ellipsizeMode="tail">
                  {r.fromShort}
                </ThemedText>
                <View style={styles.routeArrowRow}>
                  <IconSymbol name="arrow.forward" size={13} color={textSub} />
                </View>
                <ThemedText style={[styles.routePlace, { color: textPri }]} numberOfLines={1} ellipsizeMode="tail">
                  {r.toShort}
                </ThemedText>
              </>
            ) : (
              <View style={styles.routeInlineRow}>
                <ThemedText
                  style={[styles.routePlace, styles.routePlaceShrink, { color: textPri }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {r.fromShort}
                </ThemedText>
                <IconSymbol name="arrow.forward" size={13} color={textSub} style={styles.routeArrowIcon} />
                <ThemedText
                  style={[styles.routePlace, styles.routePlaceShrink, { color: textPri }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {r.toShort}
                </ThemedText>
              </View>
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

        {!expanded && hasDepart ? (
          <View style={styles.timeRow}>
            <IconSymbol name="clock.fill" size={12} color={textSub} />
            <ThemedText style={[styles.timeText, { color: textSub }]} numberOfLines={1}>
              {formatDepartShort(depart)}
            </ThemedText>
          </View>
        ) : null}
      </Pressable>

      {expanded ? (
        <View style={[styles.expandedBlock, { borderTopColor: hair }]}>
          {hasDepart ? (
            <View style={styles.factsBlock}>
              <View style={styles.departRow}>
                <ThemedText style={[styles.departDate, { color: textPri }]}>{formatDepartDate(depart)}</ThemedText>
                <ThemedText style={[styles.departTime, { color: stripColor }]}>{formatDepartTime(depart)}</ThemedText>
              </View>
              <View style={[styles.factsRow, { backgroundColor: inputBg }]}>
                <View style={styles.factItem}>
                  <ThemedText style={[styles.factValue, { color: textPri }]}>{r.seats}</ThemedText>
                  <ThemedText style={[styles.factLabel, { color: textSub }]}>seats</ThemedText>
                </View>
                <View style={[styles.factDivider, { backgroundColor: hair }]} />
                <View style={[styles.factItem, styles.factItemWide]}>
                  <ThemedText style={[styles.factValue, { color: textPri }]} numberOfLines={1}>
                    {r.priceRwf.toLocaleString()}
                  </ThemedText>
                  <ThemedText style={[styles.factLabel, { color: textSub }]}>RWF / seat</ThemedText>
                </View>
                <View style={[styles.factDivider, { backgroundColor: hair }]} />
                <View style={styles.factItem}>
                  <ThemedText
                    style={[
                      styles.factValue,
                      { color: bookingCount > 0 ? stripColor : textPri },
                    ]}
                  >
                    {bookingCount}
                  </ThemedText>
                  <ThemedText style={[styles.factLabel, { color: textSub }]}>booked</ThemedText>
                </View>
              </View>
            </View>
          ) : null}

          {r.note ? (
            <ThemedText style={[styles.noteText, { color: textSub }]} numberOfLines={3}>
              {r.note}
            </ThemedText>
          ) : null}

          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => router.push(`/rides/${r.id}` as any)}
              style={[styles.actionBtn, styles.actionBtnPrimary, { backgroundColor: stripColor }]}
            >
              <ThemedText style={styles.actionBtnPrimaryText}>View Bookings</ThemedText>
            </Pressable>
            {r.status === 'active' && bookingCount === 0 && (
              <Pressable
                onPress={() => router.push(`/edit-ride/${r.id}` as any)}
                style={[styles.actionBtn, { backgroundColor: inputBg }]}
              >
                <ThemedText style={[styles.actionText, { color: textPri }]}>Edit</ThemedText>
              </Pressable>
            )}
            {r.status === 'active' &&
              (cancelConfirmId === r.id ? (
                <View style={styles.cancelConfirmBox}>
                  <ThemedText style={styles.cancelConfirmText}>
                    Cancels all passenger bookings
                  </ThemedText>
                  <View style={styles.cancelConfirmActions}>
                    <Pressable onPress={() => onCancelRide(r.id)} style={styles.cancelConfirmYes}>
                      <ThemedText style={styles.cancelConfirmYesText}>Confirm</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => onCancelConfirm(null)}
                      style={[styles.actionBtn, { flex: 1, backgroundColor: inputBg }]}
                    >
                      <ThemedText style={[styles.actionText, { color: textPri }]}>Back</ThemedText>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <Pressable onPress={() => onCancelConfirm(r.id)} style={styles.cancelBtn}>
                  <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
                </Pressable>
              ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  routeCol: { flex: 1, minWidth: 0, gap: 2 },
  routeInlineRow: { flexDirection: 'row', alignItems: 'center', minWidth: 0, gap: 4 },
  routePlaceShrink: { flexShrink: 1, minWidth: 0 },
  routeArrowRow: { paddingVertical: 1 },
  routeArrowIcon: { flexShrink: 0 },
  routePlace: { fontWeight: '800', fontSize: 14, lineHeight: 18 },
  routeRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0, paddingTop: 2 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusPillText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  chevronWrap: { width: 18, alignItems: 'center', justifyContent: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timeText: { fontSize: 12, fontWeight: '600' },
  expandedBlock: { gap: 10, paddingHorizontal: 14, paddingBottom: 14, paddingTop: 10, borderTopWidth: 1 },
  factsBlock: { gap: 10 },
  departRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  departDate: { fontSize: 15, fontWeight: '800' },
  departTime: { fontSize: 16, fontWeight: '900' },
  factsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  factItem: { flex: 1, alignItems: 'center', gap: 2, minWidth: 0 },
  factItemWide: { flex: 1.4 },
  factValue: { fontSize: 17, fontWeight: '900' },
  factLabel: { fontSize: 11, fontWeight: '700', textTransform: 'lowercase' },
  factDivider: { width: 1, height: 28, opacity: 0.9 },
  noteText: { fontSize: 12, lineHeight: 17, fontWeight: '600', fontStyle: 'italic' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: {
    minWidth: 108,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {},
  actionBtnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  actionText: { fontSize: 13, fontWeight: '700' },
  cancelBtn: {
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF444440',
    paddingHorizontal: 12,
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
