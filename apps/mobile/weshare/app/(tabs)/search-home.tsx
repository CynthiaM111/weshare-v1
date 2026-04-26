import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type LatLng, Region } from 'react-native-maps';

import LogoMark from '@/components/LogoMark';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { clearSession, loadSession, type AuthSession } from '@/lib/auth/session';
import { getUserByPhone, type UserProfile } from '@/lib/auth/users';
import { googlePlaceDetails, googlePlacesAutocomplete, hasPlacesKey, nominatimAutocomplete } from '@/lib/places';
import { listRides, type Ride } from '@/lib/rides';

const AQUAFINA = '#00AEEF';
const ROUTE_BLUE = '#2563EB';

type Suggestion = { id: string; label: string; source: 'google' | 'osm'; coords?: LatLng };

function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
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

function decodePolyline(encoded: string): LatLng[] {
  // Google Encoded Polyline Algorithm Format
  // https://developers.google.com/maps/documentation/utilities/polylinealgorithm
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates: LatLng[] = [];

  while (index < len) {
    let b = 0;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }

  return coordinates;
}

function MenuItem({
  label,
  onPress,
  icon,
  text,
  danger,
}: {
  label: string;
  onPress: () => void | Promise<void>;
  icon: JSX.Element;
  text: string;
  danger?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.menuItem}>
      <View style={styles.menuItemLeft}>
        {icon}
        <ThemedText style={[styles.menuItemText, { color: danger ? '#EF4444' : text }]}>{label}</ThemedText>
      </View>
      <IconSymbol name="chevron.right" size={18} color={danger ? '#EF4444' : text} />
    </Pressable>
  );
}

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (a + b).toUpperCase().slice(0, 2);
}

export default function SearchHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';

  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const icon = useThemeColor({}, 'icon');
  const subText = useThemeColor({ light: 'rgba(17,24,28,0.70)', dark: 'rgba(236,237,238,0.72)' }, 'text');
  const hairline = useThemeColor({ light: 'rgba(15,23,42,0.10)', dark: 'rgba(236,237,238,0.14)' }, 'background');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#202227' }, 'background');
  const inputBg = useThemeColor({ light: 'rgba(15,23,42,0.03)', dark: 'rgba(236,237,238,0.06)' }, 'background');

  const mapRef = useRef<MapView | null>(null);
  const kigali: Region = useMemo(
    () => ({
      latitude: -1.9441,
      longitude: 30.0619,
      latitudeDelta: 0.28,
      longitudeDelta: 0.28,
    }),
    []
  );

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editing, setEditing] = useState<'from' | 'to' | null>(null);
  const [fromCoord, setFromCoord] = useState<LatLng | null>(null);
  const [toCoord, setToCoord] = useState<LatLng | null>(null);
  const [routeCoords, setRouteCoords] = useState<LatLng[] | null>(null);

  const [fromSug, setFromSug] = useState<Suggestion[]>([]);
  const [toSug, setToSug] = useState<Suggestion[]>([]);
  const [loadingFrom, setLoadingFrom] = useState(false);
  const [loadingTo, setLoadingTo] = useState(false);

  const [when, setWhen] = useState<Date>(() => {
    const d = new Date();
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
    return d;
  });
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<Ride[]>([]);

  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await loadSession();
      if (cancelled) return;
      setSession(s);
      if (s) {
        const p = await getUserByPhone(s.phoneE164);
        if (!cancelled) setProfile(p);
      } else {
        setProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (editing !== 'from') return;
    const q = from.trim();
    if (q.length < 3) {
      setFromSug([]);
      setLoadingFrom(false);
      return;
    }
    setLoadingFrom(true);
    const t = setTimeout(() => {
      (async () => {
        try {
          if (hasPlacesKey()) {
            const rw = await googlePlacesAutocomplete({
              input: q,
              country: 'rw',
              locationBias: { latitude: kigali.latitude, longitude: kigali.longitude },
              radiusMeters: 350000,
              limit: 6,
            });
            if (rw.length) {
              setFromSug(rw.map((p) => ({ id: p.id, label: p.fullText, source: 'google' })));
              return;
            }
            // East Africa fallback: broader radius, no country constraint.
            const ea = await googlePlacesAutocomplete({
              input: q,
              locationBias: { latitude: kigali.latitude, longitude: kigali.longitude },
              radiusMeters: 1100000,
              limit: 6,
            });
            setFromSug(ea.map((p) => ({ id: p.id, label: p.fullText, source: 'google' })));
            return;
          }

          const osm = await nominatimAutocomplete({ input: q, limit: 6 });
          setFromSug(osm.map((s) => ({ id: s.id, label: s.fullText, source: 'osm', coords: s.coords })));
        } finally {
          setLoadingFrom(false);
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [from, editing]);

  useEffect(() => {
    if (editing !== 'to') return;
    const q = to.trim();
    if (q.length < 3) {
      setToSug([]);
      setLoadingTo(false);
      return;
    }
    setLoadingTo(true);
    const t = setTimeout(() => {
      (async () => {
        try {
          if (hasPlacesKey()) {
            const rw = await googlePlacesAutocomplete({
              input: q,
              country: 'rw',
              locationBias: { latitude: kigali.latitude, longitude: kigali.longitude },
              radiusMeters: 350000,
              limit: 6,
            });
            if (rw.length) {
              setToSug(rw.map((p) => ({ id: p.id, label: p.fullText, source: 'google' })));
              return;
            }
            const ea = await googlePlacesAutocomplete({
              input: q,
              locationBias: { latitude: kigali.latitude, longitude: kigali.longitude },
              radiusMeters: 1100000,
              limit: 6,
            });
            setToSug(ea.map((p) => ({ id: p.id, label: p.fullText, source: 'google' })));
            return;
          }

          const osm = await nominatimAutocomplete({ input: q, limit: 6 });
          setToSug(osm.map((s) => ({ id: s.id, label: s.fullText, source: 'osm', coords: s.coords })));
        } finally {
          setLoadingTo(false);
        }
      })();
    }, 250);
    return () => clearTimeout(t);
  }, [to, editing]);

  async function applySuggestion(kind: 'from' | 'to', s: Suggestion) {
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
    setEditing(null);
    Keyboard.dismiss();
    if (coords) {
      mapRef.current?.animateToRegion(
        { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.20, longitudeDelta: 0.20 },
        500
      );
    }
  }

  // Auto-zoom to fit both pins when selected.
  useEffect(() => {
    if (!fromCoord || !toCoord) return;
    mapRef.current?.fitToCoordinates([fromCoord, toCoord], {
      edgePadding: { top: 90, right: 90, bottom: 90, left: 90 },
      animated: true,
    });
  }, [fromCoord, toCoord]);

  // Route line: prefer Google Directions API, fallback to straight dashed.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!fromCoord || !toCoord) {
        setRouteCoords(null);
        return;
      }

      const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!key) {
        setRouteCoords([fromCoord, toCoord]);
        return;
      }

      try {
        const params = new URLSearchParams();
        params.set('origin', `${fromCoord.latitude},${fromCoord.longitude}`);
        params.set('destination', `${toCoord.latitude},${toCoord.longitude}`);
        params.set('key', key);
        params.set('region', 'rw');
        params.set('mode', 'driving');
        const res = await fetch(`https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`);
        if (!res.ok) throw new Error('directions_failed');
        const json = (await res.json()) as any;
        const points = json?.routes?.[0]?.overview_polyline?.points;
        if (!points) throw new Error('no_polyline');
        const decoded = decodePolyline(points);
        if (!cancelled) setRouteCoords(decoded.length ? decoded : [fromCoord, toCoord]);
      } catch {
        if (!cancelled) setRouteCoords([fromCoord, toCoord]);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [fromCoord, toCoord]);

  const canSearch = useMemo(() => Boolean(from.trim() && to.trim()), [from, to]);

  async function onSearch() {
    if (!canSearch || searching) return;
    setSearching(true);
    try {
      const rides = await listRides();
      const a = from.trim().toLowerCase();
      const b = to.trim().toLowerCase();
      const targetDay = dayKey(when);
      const targetTs = when.getTime();

      const filtered = rides.filter((r) => {
        if (a && !r.from.toLowerCase().includes(a)) return false;
        if (b && !r.to.toLowerCase().includes(b)) return false;
        const depart = new Date(r.departAtISO);
        if (Number.isNaN(depart.getTime())) return false;
        if (dayKey(depart) !== targetDay) return false;
        if (depart.getTime() < targetTs) return false;
        return true;
      });

      setResults(filtered);
      setSearched(true);
      Keyboard.dismiss();
    } finally {
      setSearching(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['left', 'right', 'bottom']}>
      <View style={[styles.root, { paddingBottom: Math.max(12, insets.bottom + 12) }]}>
        <LinearGradient colors={scheme === 'dark' ? ['#0B1220', '#151718'] : ['#E6F8FE', '#EFE8FF']} style={styles.bg} />

        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerLeft}>
            <LogoMark size={30} />
            <View style={{ flex: 1 }}>
              <ThemedText style={[styles.hTitle, { color: text }]} numberOfLines={1}>
                WeShare
              </ThemedText>
              <ThemedText style={[styles.hSub, { color: subText }]} numberOfLines={1}>
                Search rides in Rwanda
              </ThemedText>
            </View>
          </View>
          <View style={styles.headerRight}>
            {!session ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Login"
                onPress={() => router.push({ pathname: '/auth', params: { redirect: '/' } })}
                style={[styles.loginBtn, { borderColor: hairline }]}
              >
                <ThemedText style={[styles.loginText, { color: text }]}>Login</ThemedText>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Profile menu"
                onPress={() => setMenuOpen((v) => !v)}
                style={[styles.avatarBtn, { borderColor: hairline }]}
              >
                {profile?.fullName ? (
                  <View style={styles.avatarInner}>
                    <ThemedText style={styles.avatarText}>{initialsFromName(profile.fullName)}</ThemedText>
                  </View>
                ) : (
                  <IconSymbol name="person.circle.fill" size={22} color={icon} />
                )}
              </Pressable>
            )}
          </View>
        </View>

        {menuOpen && session ? (
          <View style={[styles.menu, { backgroundColor: surface, borderColor: hairline }]}>
            <MenuItem
              label="Post a Ride"
              onPress={() => {
                setMenuOpen(false);
                router.push('/post-ride');
              }}
              icon={<IconSymbol name="plus" size={18} color={icon} />}
              text={text}
            />
            <MenuItem
              label="My Rides"
              onPress={() => {
                setMenuOpen(false);
                router.push('/my-rides');
              }}
              icon={<IconSymbol name="list.bullet" size={18} color={icon} />}
              text={text}
            />
            <View style={[styles.menuSep, { backgroundColor: hairline }]} />
            <MenuItem
              label="Logout"
              onPress={async () => {
                setMenuOpen(false);
                await clearSession();
                setSession(null);
                setProfile(null);
              }}
              icon={<IconSymbol name="arrow.right.square" size={18} color={icon} />}
              text={text}
              danger
            />
          </View>
        ) : null}

        <View style={styles.mapWrap}>
          <MapView
            ref={(r) => {
              mapRef.current = r;
            }}
            provider={PROVIDER_GOOGLE}
            initialRegion={kigali}
            style={StyleSheet.absoluteFill}
            onPress={() => {
              Keyboard.dismiss();
              setEditing(null);
              setMenuOpen(false);
            }}
            showsUserLocation
            showsMyLocationButton={false}
            toolbarEnabled={false}
          >
            {fromCoord ? (
              <Marker coordinate={fromCoord} pinColor="#16A34A" />
            ) : null}
            {toCoord ? (
              <Marker coordinate={toCoord} pinColor="#EF4444" />
            ) : null}

            {routeCoords && routeCoords.length >= 2 ? (
              <Polyline
                coordinates={routeCoords}
                strokeColor={ROUTE_BLUE}
                strokeWidth={5}
                lineCap="round"
                lineJoin="round"
                lineDashPattern={
                  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ? undefined : [10, 8]
                }
              />
            ) : null}
          </MapView>
          <View pointerEvents="none" style={styles.mapFade}>
            <LinearGradient
              colors={
                scheme === 'dark'
                  ? ['rgba(0,0,0,0.30)', 'rgba(0,0,0,0.00)']
                  : ['rgba(255,255,255,0.70)', 'rgba(255,255,255,0.00)']
              }
              style={StyleSheet.absoluteFill}
            />
          </View>
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={{ paddingBottom: 12 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.sheet, { backgroundColor: surface, borderColor: hairline }]}>
            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: subText }]}>From</ThemedText>
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: hairline }]}>
                <IconSymbol name="location.fill" size={18} color={AQUAFINA} />
                <TextInput
                  value={from}
                  onChangeText={setFrom}
                  onFocus={() => setEditing('from')}
                  selectTextOnFocus
                  placeholder="Pickup address"
                  placeholderTextColor="rgba(17,24,28,0.42)"
                  style={[styles.input, { color: text }]}
                />
              </View>
              {editing === 'from' && (loadingFrom || fromSug.length) ? (
                <View style={[styles.sugBox, { borderColor: hairline, backgroundColor: surface }]}>
                  {loadingFrom ? (
                    <ThemedText style={[styles.sugMeta, { color: subText }]}>Searching…</ThemedText>
                  ) : (
                    fromSug.map((s) => (
                      <Pressable key={s.id} onPress={() => applySuggestion('from', s)} style={styles.sugRow}>
                        <IconSymbol name="location.fill" size={18} color={AQUAFINA} />
                        <ThemedText style={[styles.sugText, { color: text }]} numberOfLines={2}>
                          {s.label}
                        </ThemedText>
                      </Pressable>
                    ))
                  )}
                </View>
              ) : null}
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: subText }]}>To</ThemedText>
              <View style={[styles.inputRow, { backgroundColor: inputBg, borderColor: hairline }]}>
                <IconSymbol name="location.fill" size={18} color="#EF4444" />
                <TextInput
                  value={to}
                  onChangeText={setTo}
                  onFocus={() => setEditing('to')}
                  selectTextOnFocus
                  placeholder="Destination address"
                  placeholderTextColor="rgba(17,24,28,0.42)"
                  style={[styles.input, { color: text }]}
                />
              </View>
              {editing === 'to' && (loadingTo || toSug.length) ? (
                <View style={[styles.sugBox, { borderColor: hairline, backgroundColor: surface }]}>
                  {loadingTo ? (
                    <ThemedText style={[styles.sugMeta, { color: subText }]}>Searching…</ThemedText>
                  ) : (
                    toSug.map((s) => (
                      <Pressable key={s.id} onPress={() => applySuggestion('to', s)} style={styles.sugRow}>
                        <IconSymbol name="location.fill" size={18} color="#EF4444" />
                        <ThemedText style={[styles.sugText, { color: text }]} numberOfLines={2}>
                          {s.label}
                        </ThemedText>
                      </Pressable>
                    ))
                  )}
                </View>
              ) : null}
            </View>

            <View style={styles.field}>
              <ThemedText style={[styles.label, { color: subText }]}>When</ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowDate(true)}
                style={[styles.inputRow, { backgroundColor: inputBg, borderColor: hairline }]}
              >
                <IconSymbol name="clock.fill" size={18} color={icon} />
                <ThemedText style={[styles.whenText, { color: text }]}>{formatDepart(when)}</ThemedText>
                <IconSymbol name="chevron.right" size={20} color={icon} />
              </Pressable>
            </View>

            {showDate ? (
              <DateTimePicker
                value={when}
                mode="date"
                onChange={(_, d) => {
                  setShowDate(false);
                  if (!d) return;
                  const next = new Date(when);
                  next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                  setWhen(next);
                  setShowTime(true);
                }}
              />
            ) : null}
            {showTime ? (
              <DateTimePicker
                value={when}
                mode="time"
                is24Hour
                onChange={(_, d) => {
                  setShowTime(false);
                  if (!d) return;
                  const next = new Date(when);
                  next.setHours(d.getHours(), d.getMinutes(), 0, 0);
                  setWhen(next);
                }}
              />
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search"
              onPress={onSearch}
              disabled={!canSearch || searching}
              style={[styles.primary, { opacity: !canSearch || searching ? 0.55 : 1, backgroundColor: AQUAFINA }]}
            >
              <IconSymbol name="magnifyingglass" size={18} color="white" />
              <ThemedText style={styles.primaryText}>{searching ? 'Searching…' : 'Search'}</ThemedText>
            </Pressable>
          </View>

          <View style={styles.resultsWrap}>
            <ThemedText style={[styles.resultsTitle, { color: text }]}>
              {searched ? `${results.length} ride${results.length === 1 ? '' : 's'} found` : 'Available rides'}
            </ThemedText>

            {searched && results.length === 0 ? (
              <View style={[styles.empty, { borderColor: hairline, backgroundColor: surface }]}>
                <ThemedText style={[styles.emptyText, { color: subText }]}>No rides match your search yet.</ThemedText>
              </View>
            ) : null}

            <View style={styles.list}>
              {results.map((r) => {
                const depart = new Date(r.departAtISO);
                return (
                  <View key={r.id} style={[styles.rideCard, { backgroundColor: surface, borderColor: hairline }]}>
                    <View style={styles.rideTop}>
                      <ThemedText style={[styles.rideRoute, { color: text }]} numberOfLines={2}>
                        {r.from} → {r.to}
                      </ThemedText>
                      <ThemedText style={[styles.ridePrice, { color: text }]}>
                        RWF {r.priceRwf?.toLocaleString?.() ?? r.priceRwf}
                      </ThemedText>
                    </View>
                    <View style={styles.rideMetaRow}>
                      <IconSymbol name="clock.fill" size={16} color={icon} />
                      <ThemedText style={[styles.rideMeta, { color: subText }]}>
                        {Number.isNaN(depart.getTime()) ? r.departAtISO : formatDepart(depart)}
                      </ThemedText>
                      <ThemedText style={[styles.rideMetaDot, { color: subText }]}>•</ThemedText>
                      <ThemedText style={[styles.rideMeta, { color: subText }]}>{r.seats} seats</ThemedText>
                    </View>
                    {r.note ? (
                      <ThemedText style={[styles.rideNote, { color: subText }]} numberOfLines={2}>
                        {r.note}
                      </ThemedText>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1, paddingHorizontal: 16 },
  bg: { position: 'absolute', left: 0, right: 0, top: 0, height: 520 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, gap: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hTitle: { fontSize: 18, fontWeight: '900', lineHeight: 22 },
  hSub: { marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: '600', opacity: 0.82 },
  loginBtn: { height: 36, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  loginText: { fontSize: 13, fontWeight: '900' },
  avatarBtn: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarInner: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#00AEEF', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: 'white', fontSize: 12, fontWeight: '900' },
  menu: {
    position: 'absolute',
    top: 62,
    right: 16,
    width: 210,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 50,
  },
  menuItem: { paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuItemText: { fontSize: 13, fontWeight: '900' },
  menuSep: { height: 1, opacity: 0.9 },
  mapWrap: { marginHorizontal: -16, height: 260, overflow: 'hidden' },
  mapFade: { position: 'absolute', left: 0, right: 0, top: 0, height: 64 },
  sheetScroll: { flex: 1, marginTop: 12 },
  sheet: { borderRadius: 22, borderWidth: 1, padding: 16, gap: 12 },
  field: { gap: 8 },
  label: { fontSize: 12, fontWeight: '900', opacity: 0.9 },
  inputRow: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, fontSize: 14, fontWeight: '800', padding: 0, margin: 0 },
  whenText: { flex: 1, fontSize: 14, fontWeight: '800' },
  sugBox: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  sugRow: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  sugText: { flex: 1, fontSize: 13, lineHeight: 17, fontWeight: '700' },
  sugMeta: { paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, fontWeight: '700' },
  primary: { height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryText: { color: 'white', fontSize: 15, fontWeight: '900' },
  resultsWrap: { marginTop: 12, gap: 10 },
  resultsTitle: { fontSize: 14, fontWeight: '900' },
  empty: { borderWidth: 1, borderRadius: 18, padding: 14 },
  emptyText: { fontSize: 13, lineHeight: 18, fontWeight: '600', opacity: 0.9 },
  list: { gap: 10, paddingBottom: 16 },
  rideCard: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 8 },
  rideTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  rideRoute: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  ridePrice: { fontSize: 13, fontWeight: '900' },
  rideMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  rideMeta: { fontSize: 13, fontWeight: '700', opacity: 0.9 },
  rideMetaDot: { fontSize: 13, fontWeight: '900', opacity: 0.5 },
  rideNote: { fontSize: 13, lineHeight: 18, fontWeight: '600', opacity: 0.85 },
});

