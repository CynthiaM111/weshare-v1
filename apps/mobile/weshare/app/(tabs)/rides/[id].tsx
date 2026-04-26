import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoMark from '@/components/LogoMark';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getRide, type Ride } from '@/lib/rides';

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

export default function RideDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const icon = useThemeColor({}, 'icon');
  const hairline = useThemeColor({ light: 'rgba(15,23,42,0.10)', dark: 'rgba(236,237,238,0.14)' }, 'background');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#202227' }, 'background');
  const subText = useThemeColor({ light: 'rgba(17,24,28,0.68)', dark: 'rgba(236,237,238,0.72)' }, 'text');

  const [ride, setRide] = useState<Ride | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      const r = await getRide(String(id));
      if (!cancelled) setRide(r);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const title = useMemo(() => {
    if (!ride) return 'Ride';
    return 'Your posted ride';
  }, [ride]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['left', 'right', 'bottom']}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + 6 }]} lightColor="transparent" darkColor="transparent">
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.headerBtn}>
          <IconSymbol name="chevron.right" size={22} color={icon} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
        <View style={styles.headerCenter}>
          <LogoMark size={26} />
          <ThemedText style={[styles.headerTitle, { color: text }]} numberOfLines={1}>
            {title}
          </ThemedText>
        </View>
        <View style={styles.headerBtn} />
      </ThemedView>

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: Math.max(16, insets.bottom + 16) }]}>
        {!ride ? (
          <ThemedText style={[styles.lede, { color: subText }]}>Loading…</ThemedText>
        ) : (
          <View style={[styles.card, { backgroundColor: surface, borderColor: hairline }]}>
            <Row label="From" value={ride.from} text={text} subText={subText} />
            <Row label="To" value={ride.to} text={text} subText={subText} />
            <Row label="Departure" value={formatDepart(ride.departAtISO)} text={text} subText={subText} />
            <Row label="Seats" value={String(ride.seats)} text={text} subText={subText} />
            <Row label="Price" value={ride.priceRwf ? `${ride.priceRwf} RWF / seat` : '—'} text={text} subText={subText} />
            {ride.note ? <Row label="Note" value={ride.note} text={text} subText={subText} /> : null}
          </View>
        )}

        <Pressable accessibilityRole="button" onPress={() => router.replace('/my-rides')} style={[styles.secondary, { borderColor: hairline }]}>
          <ThemedText style={[styles.secondaryText, { color: text }]}>Go to My Rides</ThemedText>
          <IconSymbol name="chevron.right" size={18} color={icon} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  text,
  subText,
}: {
  label: string;
  value: string;
  text: string;
  subText: string;
}) {
  return (
    <View style={styles.row}>
      <ThemedText style={[styles.rowLabel, { color: subText }]}>{label}</ThemedText>
      <ThemedText style={[styles.rowValue, { color: text }]}>{value}</ThemedText>
    </View>
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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '900', maxWidth: 220 },
  container: { paddingHorizontal: 16, gap: 14 },
  lede: { fontSize: 13, lineHeight: 18, fontWeight: '700', opacity: 0.9 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  row: { gap: 6 },
  rowLabel: { fontSize: 12, fontWeight: '800', opacity: 0.9 },
  rowValue: { fontSize: 14, fontWeight: '800', lineHeight: 18 },
  secondary: {
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryText: { fontSize: 14, fontWeight: '900' },
});

