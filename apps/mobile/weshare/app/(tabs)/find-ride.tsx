import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoMark from '@/components/LogoMark';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { clearRides, listRides, Ride } from '@/lib/rides';

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function FindRideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const icon = useThemeColor({}, 'icon');
  const hairline = useThemeColor({ light: 'rgba(15,23,42,0.10)', dark: 'rgba(236,237,238,0.14)' }, 'background');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#202227' }, 'background');
  const subText = useThemeColor({ light: 'rgba(17,24,28,0.68)', dark: 'rgba(236,237,238,0.72)' }, 'text');

  const [rides, setRides] = useState<Ride[]>([]);
  const [qFrom, setQFrom] = useState('');
  const [qTo, setQTo] = useState('');

  const load = useCallback(async () => {
    const r = await listRides();
    setRides(r);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = useMemo(() => {
    const a = qFrom.trim().toLowerCase();
    const b = qTo.trim().toLowerCase();
    return rides.filter((r) => {
      if (a && !r.from.toLowerCase().includes(a)) return false;
      if (b && !r.to.toLowerCase().includes(b)) return false;
      return true;
    });
  }, [rides, qFrom, qTo]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['left', 'right', 'bottom']}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + 6 }]} lightColor="transparent" darkColor="transparent">
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.headerBtn}>
          <IconSymbol name="chevron.right" size={22} color={icon} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
        <View style={styles.headerCenter}>
          <LogoMark size={26} />
          <ThemedText style={[styles.headerTitle, { color: text }]}>Find a ride</ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear sample rides"
          onPress={async () => {
            await clearRides();
            await load();
          }}
          style={styles.headerBtn}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={icon} />
        </Pressable>
      </ThemedView>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(16, insets.bottom + 16) }]}>
        <View style={[styles.searchCard, { backgroundColor: surface, borderColor: hairline }]}>
          <ThemedText style={[styles.searchTitle, { color: text }]}>Search</ThemedText>
          <View style={styles.searchRow}>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.label, { color: subText }]}>From</ThemedText>
              <TextInput
                value={qFrom}
                onChangeText={setQFrom}
                placeholder="e.g. Kigali"
                placeholderTextColor="rgba(17,24,28,0.42)"
                style={[styles.searchInput, { borderColor: hairline, color: text }]}
                selectTextOnFocus
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.label, { color: subText }]}>To</ThemedText>
              <TextInput
                value={qTo}
                onChangeText={setQTo}
                placeholder="e.g. Musanze"
                placeholderTextColor="rgba(17,24,28,0.42)"
                style={[styles.searchInput, { borderColor: hairline, color: text }]}
                selectTextOnFocus
              />
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={load} style={[styles.refresh, { borderColor: hairline }]}>
            <IconSymbol name="magnifyingglass" size={18} color={icon} />
            <ThemedText style={[styles.refreshText, { color: text }]}>Refresh</ThemedText>
          </Pressable>
        </View>

        <ThemedText style={[styles.count, { color: subText }]}>
          {filtered.length} ride{filtered.length === 1 ? '' : 's'} found
        </ThemedText>

        <View style={styles.list}>
          {filtered.map((r) => (
            <View key={r.id} style={[styles.rideCard, { backgroundColor: surface, borderColor: hairline }]}>
              <View style={styles.rideTop}>
                <ThemedText style={[styles.rideRoute, { color: text }]} numberOfLines={1}>
                  {r.from} → {r.to}
                </ThemedText>
                <ThemedText style={[styles.rideSeats, { color: text }]}>{r.seats} seats</ThemedText>
              </View>
              <View style={styles.rideMetaRow}>
                <IconSymbol name="clock.fill" size={16} color={icon} />
                <ThemedText style={[styles.rideMeta, { color: subText }]}>{formatWhen(r.departAtISO)}</ThemedText>
              </View>
              {typeof r.priceRwf === 'number' ? (
                <ThemedText style={[styles.ridePrice, { color: text }]}>RWF {r.priceRwf.toLocaleString()}</ThemedText>
              ) : null}
              {r.note ? <ThemedText style={[styles.rideNote, { color: subText }]} numberOfLines={3}>{r.note}</ThemedText> : null}
            </View>
          ))}
        </View>
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: { fontSize: 16, fontWeight: '900' },
  container: { paddingHorizontal: 16, gap: 12 },
  searchCard: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 12 },
  searchTitle: { fontSize: 15, fontWeight: '900' },
  searchRow: { flexDirection: 'row', gap: 10 },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 6 },
  searchInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontWeight: '700' },
  refresh: { height: 44, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  refreshText: { fontSize: 13, fontWeight: '900' },
  count: { fontSize: 13, fontWeight: '700', opacity: 0.9 },
  list: { gap: 10, paddingBottom: 8 },
  rideCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 8 },
  rideTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  rideRoute: { fontSize: 15, fontWeight: '900', flex: 1 },
  rideSeats: { fontSize: 13, fontWeight: '900' },
  rideMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rideMeta: { fontSize: 13, fontWeight: '700', opacity: 0.9 },
  ridePrice: { fontSize: 14, fontWeight: '900' },
  rideNote: { fontSize: 13, lineHeight: 18, fontWeight: '600', opacity: 0.9 },
});

