import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoMark from '@/components/LogoMark';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { loadSession } from '@/lib/auth/session';
import { listRidesByUser, type Ride } from '@/lib/rides';

function formatDepart(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
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

  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const icon = useThemeColor({}, 'icon');
  const hairline = useThemeColor({ light: 'rgba(15,23,42,0.10)', dark: 'rgba(236,237,238,0.14)' }, 'background');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#202227' }, 'background');
  const subText = useThemeColor({ light: 'rgba(17,24,28,0.68)', dark: 'rgba(236,237,238,0.72)' }, 'text');

  const [userId, setUserId] = useState<string | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await loadSession();
    if (!s) {
      router.replace({ pathname: '/auth', params: { redirect: '/my-rides' } });
      return;
    }
    setUserId(s.userId);
    const mine = await listRidesByUser(s.userId);
    setRides(mine);
    setLoading(false);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['left', 'right', 'bottom']}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + 6 }]} lightColor="transparent" darkColor="transparent">
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.headerBtn}>
          <IconSymbol name="chevron.right" size={22} color={icon} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
        <View style={styles.headerCenter}>
          <LogoMark size={26} />
          <ThemedText style={[styles.headerTitle, { color: text }]}>My rides</ThemedText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Post a ride" onPress={() => router.push('/post-ride')} style={styles.headerBtn}>
          <IconSymbol name="plus" size={20} color={icon} />
        </Pressable>
      </ThemedView>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: Math.max(16, insets.bottom + 16) }]}>
        <ThemedText style={[styles.lede, { color: subText }]}>
          {userId ? 'Rides you’ve posted will appear here.' : 'Loading your rides…'}
        </ThemedText>

        {loading ? (
          <ThemedText style={[styles.meta, { color: subText }]}>Loading…</ThemedText>
        ) : rides.length ? (
          <View style={{ gap: 10 }}>
            {rides.map((r) => (
              <Pressable
                key={r.id}
                accessibilityRole="button"
                onPress={() => router.push(`/rides/${r.id}`)}
                style={[styles.rideCard, { backgroundColor: surface, borderColor: hairline }]}
              >
                <View style={{ flex: 1, gap: 4 }}>
                  <ThemedText style={[styles.rideTitle, { color: text }]} numberOfLines={1}>
                    {r.from} → {r.to}
                  </ThemedText>
                  <ThemedText style={[styles.rideMeta, { color: subText }]} numberOfLines={1}>
                    {formatDepart(r.departAtISO)} • {r.seats} seats • {r.priceRwf ? `${r.priceRwf} RWF/seat` : '—'}
                  </ThemedText>
                </View>
                <IconSymbol name="chevron.right" size={18} color={icon} />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: surface, borderColor: hairline }]}>
            <ThemedText style={[styles.emptyTitle, { color: text }]}>No rides yet</ThemedText>
            <ThemedText style={[styles.emptyBody, { color: subText }]}>
              Post your first ride to start getting passengers.
            </ThemedText>
            <Pressable accessibilityRole="button" onPress={() => router.push('/post-ride')} style={[styles.primary, { backgroundColor: '#00AEEF' }]}>
              <ThemedText style={styles.primaryText}>Post a ride</ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: '900' },
  container: { paddingHorizontal: 16, gap: 14 },
  lede: { fontSize: 13, lineHeight: 18, fontWeight: '700', opacity: 0.9 },
  meta: { fontSize: 13, fontWeight: '700' },
  rideCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rideTitle: { fontSize: 14, fontWeight: '900' },
  rideMeta: { fontSize: 12, fontWeight: '700', opacity: 0.85 },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  emptyTitle: { fontSize: 15, fontWeight: '900' },
  emptyBody: { fontSize: 13, lineHeight: 18, fontWeight: '700', opacity: 0.9 },
  primary: {
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  primaryText: { color: 'white', fontSize: 14, fontWeight: '900' },
});

