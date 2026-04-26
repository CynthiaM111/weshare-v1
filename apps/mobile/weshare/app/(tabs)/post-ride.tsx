import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoMark from '@/components/LogoMark';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type LatLng, type Region } from 'react-native-maps';
import { LinearGradient } from 'expo-linear-gradient';
import { googlePlaceDetails, googlePlacesAutocomplete, hasPlacesKey, nominatimAutocomplete, nominatimReverse } from '@/lib/places';
import { loadSession } from '@/lib/auth/session';
import { saveRide } from '@/lib/rides';

export default function PostRideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const icon = useThemeColor({}, 'icon');
  const hairline = useThemeColor({ light: 'rgba(15,23,42,0.10)', dark: 'rgba(236,237,238,0.14)' }, 'background');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#202227' }, 'background');
  const subText = useThemeColor({ light: 'rgba(17,24,28,0.68)', dark: 'rgba(236,237,238,0.72)' }, 'text');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [departAt, setDepartAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [seats, setSeats] = useState('3');
  const [price, setPrice] = useState(''); // RWF required
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const kigali: Region = useMemo(
    () => ({
      latitude: -1.9441,
      longitude: 30.0619,
      latitudeDelta: 0.28,
      longitudeDelta: 0.28,
    }),
    []
  );
  const mapRef = useRef<MapView | null>(null);

  const [fromCoord, setFromCoord] = useState<LatLng | null>(null);
  const [toCoord, setToCoord] = useState<LatLng | null>(null);
  const [activePin, setActivePin] = useState<'from' | 'to'>('from');

  type Suggestion = { id: string; label: string; source: 'google' | 'osm'; coords?: LatLng };
  const [fromSug, setFromSug] = useState<Suggestion[]>([]);
  const [toSug, setToSug] = useState<Suggestion[]>([]);
  const [loadingFrom, setLoadingFrom] = useState(false);
  const [loadingTo, setLoadingTo] = useState(false);
  const fromReqId = useRef(0);
  const toReqId = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadSession();
      if (cancelled) return;
      if (!s) {
        router.replace({ pathname: '/auth', params: { redirect: '/post-ride' } });
        return;
      }
      setSessionUserId(s.userId);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const canSave = useMemo(() => {
    if (!sessionUserId) return false;
    if (!from.trim() || !to.trim()) return false;
    const s = Number(seats);
    if (!Number.isFinite(s) || s <= 0) return false;
    if (!departAt) return false;
    const pr = Number(price);
    if (!Number.isFinite(pr) || pr <= 0) return false;
    return true;
  }, [from, to, seats, departAt, price]);

  async function onSave() {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const s = Number(seats);
      const pr = Number(price);
      const departAtISO = (departAt ?? new Date()).toISOString();

      const ride = await saveRide({
        from: from.trim(),
        to: to.trim(),
        departAtISO,
        seats: s,
        priceRwf: pr,
        note: note.trim() ? note.trim() : undefined,
        postedByUserId: sessionUserId ?? undefined,
        fromCoord: fromCoord ?? undefined,
        toCoord: toCoord ?? undefined,
      });

      Alert.alert('Ride posted', 'Your ride is now visible in search.', [
        { text: 'View ride', onPress: () => router.replace(`/rides/${ride.id}`) },
      ]);
    } catch (e) {
      Alert.alert('Could not post ride', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function applySuggestion(kind: 'from' | 'to', s: { id: string; label: string; source: 'google' | 'osm'; coords?: LatLng }) {
    const details = s.source === 'google' ? await googlePlaceDetails(s.id) : null;
    const label = details?.formattedAddress ?? s.label;
    const coords = details?.coords ?? s.coords;
    if (kind === 'from') {
      setFrom(label);
      setFromSug([]);
      setFromCoord(coords ?? null);
    } else {
      setTo(label);
      setToSug([]);
      setToCoord(coords ?? null);
    }
    Keyboard.dismiss();
    if (coords) {
      mapRef.current?.animateToRegion(
        { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.20, longitudeDelta: 0.20 },
        450
      );
    }
  }

  useEffect(() => {
    const q = from.trim();
    if (q.length < 3) {
      setFromSug([]);
      setLoadingFrom(false);
      return;
    }
    setLoadingFrom(true);
    const id = ++fromReqId.current;
    const t = setTimeout(() => {
      (async () => {
        try {
          if (hasPlacesKey()) {
            const sug = await googlePlacesAutocomplete({ input: q, country: 'rw', limit: 6 });
            if (fromReqId.current !== id) return;
            setFromSug(sug.map((p) => ({ id: p.id, label: p.fullText, source: 'google' as const })));
            return;
          }
          const osm = await nominatimAutocomplete({ input: q, limit: 6 });
          if (fromReqId.current !== id) return;
          setFromSug(osm.map((s) => ({ id: s.id, label: s.fullText, source: 'osm' as const, coords: s.coords })));
        } finally {
          if (fromReqId.current === id) setLoadingFrom(false);
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [from]);

  useEffect(() => {
    const q = to.trim();
    if (q.length < 3) {
      setToSug([]);
      setLoadingTo(false);
      return;
    }
    setLoadingTo(true);
    const id = ++toReqId.current;
    const t = setTimeout(() => {
      (async () => {
        try {
          if (hasPlacesKey()) {
            const sug = await googlePlacesAutocomplete({ input: q, country: 'rw', limit: 6 });
            if (toReqId.current !== id) return;
            setToSug(sug.map((p) => ({ id: p.id, label: p.fullText, source: 'google' as const })));
            return;
          }
          const osm = await nominatimAutocomplete({ input: q, limit: 6 });
          if (toReqId.current !== id) return;
          setToSug(osm.map((s) => ({ id: s.id, label: s.fullText, source: 'osm' as const, coords: s.coords })));
        } finally {
          if (toReqId.current === id) setLoadingTo(false);
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [to]);

  const departLabel = useMemo(() => {
    if (!departAt) return 'Select date & time';
    return departAt.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, [departAt]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['left', 'right', 'bottom']}>
      <ThemedView style={[styles.header, { paddingTop: insets.top + 6 }]} lightColor="transparent" darkColor="transparent">
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.headerBtn}>
          <IconSymbol name="chevron.right" size={22} color={icon} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
        <View style={styles.headerCenter}>
          <LogoMark size={26} />
          <ThemedText style={[styles.headerTitle, { color: text }]}>Post a ride</ThemedText>
        </View>
        <View style={styles.headerBtn} />
      </ThemedView>

      <View style={styles.mapWrap}>
        <MapView
          ref={(r) => {
            mapRef.current = r;
          }}
          provider={PROVIDER_GOOGLE}
          initialRegion={kigali}
          style={StyleSheet.absoluteFill}
          onPress={async (e) => {
            const coords = e.nativeEvent.coordinate;
            Keyboard.dismiss();
            if (activePin === 'from') setFromCoord(coords);
            else setToCoord(coords);
            const label = await nominatimReverse(coords);
            if (label) {
              if (activePin === 'from') setFrom(label);
              else setTo(label);
            }
          }}
        >
          {fromCoord ? (
            <Marker
              coordinate={fromCoord}
              pinColor="#16A34A"
              draggable
              onDragEnd={async (e) => {
                const c = e.nativeEvent.coordinate;
                setFromCoord(c);
                const label = await nominatimReverse(c);
                if (label) setFrom(label);
              }}
            />
          ) : null}
          {toCoord ? (
            <Marker
              coordinate={toCoord}
              pinColor="#EF4444"
              draggable
              onDragEnd={async (e) => {
                const c = e.nativeEvent.coordinate;
                setToCoord(c);
                const label = await nominatimReverse(c);
                if (label) setTo(label);
              }}
            />
          ) : null}
          {fromCoord && toCoord ? (
            <Polyline coordinates={[fromCoord, toCoord]} strokeColor="#2563EB" strokeWidth={4} lineDashPattern={[10, 8]} />
          ) : null}
        </MapView>
        <View pointerEvents="none" style={styles.mapFade}>
          <LinearGradient
            colors={['rgba(255,255,255,0.65)', 'rgba(255,255,255,0.00)']}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.container, { paddingBottom: Math.max(16, insets.bottom + 16) }]}>
        <ThemedText style={[styles.lede, { color: subText }]}>
          Choose locations by typing or dropping pins on the map.
        </ThemedText>

        <View style={[styles.card, { backgroundColor: surface, borderColor: hairline }]}>
          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: text }]}>From</ThemedText>
            <View style={[styles.inputWrap, { borderColor: hairline }]}>
              <TextInput
                value={from}
                onChangeText={(v) => {
                  setFrom(v);
                }}
                placeholder="Pickup address"
                placeholderTextColor="rgba(17,24,28,0.42)"
                style={[styles.input, { color: text }]}
                selectTextOnFocus
                onFocus={() => setActivePin('from')}
              />
            </View>
            {loadingFrom || fromSug.length ? (
              <View style={[styles.sugBox, { borderColor: hairline }]}>
                {loadingFrom ? (
                  <ThemedText style={[styles.sugMeta, { color: subText }]}>Searching…</ThemedText>
                ) : (
                  fromSug.map((s) => (
                    <Pressable key={s.id} onPress={() => applySuggestion('from', s)} style={styles.sugRow}>
                      <IconSymbol name="location.fill" size={18} color="#00AEEF" />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.sugMain, { color: text }]} numberOfLines={2}>
                          {s.label}
                        </ThemedText>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: text }]}>To</ThemedText>
            <View style={[styles.inputWrap, { borderColor: hairline }]}>
              <TextInput
                value={to}
                onChangeText={(v) => {
                  setTo(v);
                }}
                placeholder="Destination address"
                placeholderTextColor="rgba(17,24,28,0.42)"
                style={[styles.input, { color: text }]}
                selectTextOnFocus
                onFocus={() => setActivePin('to')}
              />
            </View>
            {loadingTo || toSug.length ? (
              <View style={[styles.sugBox, { borderColor: hairline }]}>
                {loadingTo ? (
                  <ThemedText style={[styles.sugMeta, { color: subText }]}>Searching…</ThemedText>
                ) : (
                  toSug.map((s) => (
                    <Pressable key={s.id} onPress={() => applySuggestion('to', s)} style={styles.sugRow}>
                      <IconSymbol name="location.fill" size={18} color="#EF4444" />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.sugMain, { color: text }]} numberOfLines={2}>
                          {s.label}
                        </ThemedText>
                      </View>
                    </Pressable>
                  ))
                )}
              </View>
            ) : null}
          </View>

          <View style={styles.field}>
            <ThemedText style={[styles.label, { color: text }]}>Departure</ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowDatePicker(true)}
              style={[styles.pickerRow, { borderColor: hairline }]}>
              <ThemedText style={[styles.pickerText, { color: text }]}>{departLabel}</ThemedText>
              <IconSymbol name="chevron.right" size={20} color={icon} />
            </Pressable>
          </View>

          {showDatePicker ? (
            <DateTimePicker
              value={departAt ?? new Date()}
              mode="date"
              onChange={(_, d) => {
                setShowDatePicker(false);
                if (!d) return;
                const prev = departAt ?? new Date();
                const next = new Date(prev);
                next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                setDepartAt(next);
                setShowTimePicker(true);
              }}
            />
          ) : null}
          {showTimePicker ? (
            <DateTimePicker
              value={departAt ?? new Date()}
              mode="time"
              is24Hour
              onChange={(_, d) => {
                setShowTimePicker(false);
                if (!d) return;
                const prev = departAt ?? new Date();
                const next = new Date(prev);
                next.setHours(d.getHours(), d.getMinutes(), 0, 0);
                setDepartAt(next);
              }}
            />
          ) : null}

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Field
                label="Seats"
                value={seats}
                onChangeText={setSeats}
                keyboardType="number-pad"
                text={text}
                hairline={hairline}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Field
                label="Price (RWF)"
                placeholder="Required"
                value={price}
                onChangeText={setPrice}
                keyboardType="number-pad"
                text={text}
                hairline={hairline}
              />
            </View>
          </View>
          <Field
            label="Note"
            placeholder="Optional"
            value={note}
            onChangeText={setNote}
            text={text}
            hairline={hairline}
            multiline
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Post ride"
          onPress={onSave}
          disabled={!canSave || saving}
          style={[
            styles.primary,
            {
              opacity: !canSave || saving ? 0.5 : 1,
              backgroundColor: '#00AEEF',
            },
          ]}>
          <ThemedText style={styles.primaryText}>{saving ? 'Posting…' : 'Post ride'}</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  text,
  hairline,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  text: string;
  hairline: string;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <ThemedText style={[styles.label, { color: text }]}>{label}</ThemedText>
      <View style={[styles.inputWrap, { borderColor: hairline }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(17,24,28,0.42)"
          style={[styles.input, { color: text }, multiline ? styles.inputMultiline : null]}
          keyboardType={keyboardType}
          multiline={multiline}
          selectTextOnFocus
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  mapWrap: {
    height: 230,
    marginTop: 6,
    marginHorizontal: -16,
  },
  mapFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
  },
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  container: {
    paddingHorizontal: 16,
    gap: 14,
  },
  lede: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
    opacity: 0.9,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  row: { flexDirection: 'row', gap: 10 },
  field: { gap: 8 },
  label: { fontSize: 13, fontWeight: '800' },
  inputWrap: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    fontSize: 14,
    fontWeight: '700',
    padding: 0,
    margin: 0,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pickerRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: 14,
    fontWeight: '800',
  },
  sugBox: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  sugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sugMeta: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '700',
  },
  sugMain: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
  },
  primary: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '900',
  },
});

