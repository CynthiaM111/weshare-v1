/**
 * WeShare — My Rides (Driver view)
 * Auth-gated. Shows rides posted by the logged-in user.
 */

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl,
  ScrollView, StyleSheet, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AuthGate } from '@/components/ui/AuthGate';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import { listMyRides, updateRideStatus, type Ride } from '@/lib/rides';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';

const STATUS_COLOR: Record<string, string> = {
  active: TEAL,
  completed: '#0EA5E9',
  cancelled: '#EF4444',
};

function formatDepart(d: Date) {
  return d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
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

  // Auth gate
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

  return <MyRidesList
    session={session} router={router} insets={insets}
    isDark={isDark} bg={bg} cardBg={cardBg}
    hair={hair} textPri={textPri} textSub={textSub} inputBg={inputBg}
  />;
}

function MyRidesList({ session, router, insets, isDark, bg, cardBg, hair, textPri, textSub, inputBg }: any) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const data = await listMyRides(session.userId);
    setRides(data);
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false); }

  async function onCancel(rideId: string) {
    await updateRideStatus(rideId, 'cancelled');
    setRides(prev => prev.map(r => r.id === rideId ? { ...r, status: 'cancelled' } : r));
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      {/* Header */}
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
        <View style={styles.center}><ActivityIndicator color={ACCENT} size="large" /></View>
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
          ) : rides.map(r => {
            const depart = new Date(r.departAtISO);
            return (
              <View key={r.id} style={[styles.rideCard, { backgroundColor: cardBg, borderColor: hair }]}>
                {/* Route + status */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.chipRow}>
                      <View style={[styles.chip, { backgroundColor: TEAL + '18' }]}>
                        <ThemedText style={[styles.chipText, { color: TEAL }]}>{r.fromShort}</ThemedText>
                      </View>
                      <ThemedText style={[styles.arrow, { color: textSub }]}>→</ThemedText>
                      <View style={[styles.chip, { backgroundColor: ACCENT + '18' }]}>
                        <ThemedText style={[styles.chipText, { color: ACCENT }]}>{r.toShort}</ThemedText>
                      </View>
                    </View>
                    <View style={styles.metaRow}>
                      <IconSymbol name="clock.fill" size={11} color={textSub} />
                      <ThemedText style={[styles.metaText, { color: textSub }]}>
                        {Number.isNaN(depart.getTime()) ? r.departAtISO : formatDepart(depart)}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[r.status] + '20' }]}>
                    <ThemedText style={[styles.statusText, { color: STATUS_COLOR[r.status] }]}>
                      {r.status}
                    </ThemedText>
                  </View>
                </View>

                {/* Price + seats */}
                <View style={styles.detailRow}>
                  <View style={[styles.detailChip, { backgroundColor: inputBg }]}>
                    <IconSymbol name="person.2.fill" size={11} color={textSub} />
                    <ThemedText style={[styles.metaText, { color: textSub }]}>{r.seats} seats</ThemedText>
                  </View>
                  <View style={[styles.detailChip, { backgroundColor: inputBg }]}>
                    <ThemedText style={[styles.metaText, { color: ACCENT, fontWeight: '900' }]}>
                      RWF {r.priceRwf.toLocaleString()} / seat
                    </ThemedText>
                  </View>
                </View>

                {/* Actions */}
                <View style={[styles.actionsRow, { borderTopColor: hair }]}>
                  <Pressable
                    onPress={() => router.push(`/rides/${r.id}` as any)}
                    style={[styles.actionBtn, { backgroundColor: inputBg }]}
                  >
                    <IconSymbol name="person.2.fill" size={13} color={textSub} />
                    <ThemedText style={[styles.actionText, { color: textPri }]}>View bookings</ThemedText>
                  </Pressable>
                  {r.status === 'active' && (
                    <Pressable
                      onPress={() => onCancel(r.id)}
                      style={[styles.actionBtn, { backgroundColor: '#EF444414', borderColor: '#EF444430', borderWidth: 1 }]}
                    >
                      <ThemedText style={[styles.actionText, { color: '#EF4444' }]}>Cancel</ThemedText>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  newBtn: { borderRadius: 10, overflow: 'hidden' },
  newBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7 },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  scroll: { padding: 16, gap: 12 },
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptySub: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  emptyBtn: { borderRadius: 14, overflow: 'hidden', width: '100%', marginTop: 4 },
  emptyBtnGrad: { height: 48, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  rideCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { fontSize: 13, fontWeight: '900' },
  arrow: { fontSize: 11 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  metaText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  detailRow: { flexDirection: 'row', gap: 8 },
  detailChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionsRow: { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 1 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: 10 },
  actionText: { fontSize: 13, fontWeight: '700' },
}) as any;
