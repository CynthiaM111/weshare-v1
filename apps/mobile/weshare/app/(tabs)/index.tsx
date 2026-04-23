import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useEffect, useMemo, useRef, useState } from 'react';

import LogoMark from '@/components/LogoMark';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function HomeScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const icon = useThemeColor({}, 'icon');

  const aquafina = '#00AEEF';
  const aquafinaSoft = '#E6F8FE';
  const surfaceStrong = useThemeColor({ light: '#FFFFFF', dark: '#202227' }, 'background');
  const hairline = useThemeColor({ light: 'rgba(15,23,42,0.08)', dark: 'rgba(236,237,238,0.14)' }, 'background');
  const subText = useThemeColor({ light: 'rgba(17,24,28,0.72)', dark: 'rgba(236,237,238,0.72)' }, 'text');
  const placeholderText = useThemeColor({ light: 'rgba(17,24,28,0.42)', dark: 'rgba(236,237,238,0.42)' }, 'text');
  const inputBg = useThemeColor({ light: 'rgba(15,23,42,0.03)', dark: 'rgba(236,237,238,0.06)' }, 'background');

  const mapRef = useRef<MapView | null>(null);
  const [originLabel, setOriginLabel] = useState<string>('Finding your location…');
  const [destLabel, setDestLabel] = useState<string>('Move the pin to choose a destination');
  const [originQuery, setOriginQuery] = useState<string>('');
  const [destQuery, setDestQuery] = useState<string>('');
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [isEditingDest, setIsEditingDest] = useState(false);
  const [originSuggestions, setOriginSuggestions] = useState<Array<{ label: string; latitude: number; longitude: number }>>([]);
  const [destSuggestions, setDestSuggestions] = useState<Array<{ label: string; latitude: number; longitude: number }>>([]);
  const [isLoadingOriginSuggestions, setIsLoadingOriginSuggestions] = useState(false);
  const [isLoadingDestSuggestions, setIsLoadingDestSuggestions] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const rwandaRegion: Region = useMemo(
    () => ({
      latitude: -1.9441,
      longitude: 30.0619,
      latitudeDelta: 1.5,
      longitudeDelta: 1.5,
    }),
    []
  );

  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [destination, setDestination] = useState<{ latitude: number; longitude: number }>({
    latitude: rwandaRegion.latitude,
    longitude: rwandaRegion.longitude,
  });

  async function labelForCoords(latitude: number, longitude: number) {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      const first = results?.[0];
      if (!first) return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      const parts = [
        first.name,
        first.street,
        first.district,
        first.city,
        first.region,
        first.country,
      ].filter(Boolean);
      return parts.join(', ');
    } catch {
      return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    }
  }

  async function coordsForQuery(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return null;

    // Bias results toward Rwanda without hard-failing if the user includes a city/country.
    const candidates = [`${trimmed}, Rwanda`, trimmed];
    for (const q of candidates) {
      try {
        const results = await Location.geocodeAsync(q);
        const first = results?.[0];
        if (first?.latitude != null && first?.longitude != null) {
          return { latitude: first.latitude, longitude: first.longitude };
        }
      } catch {
        // continue
      }
    }
    return null;
  }

  async function suggestionsForQuery(query: string, limit = 5) {
    const trimmed = query.trim();
    if (trimmed.length < 3) return [];

    const seen = new Set<string>();
    const out: Array<{ label: string; latitude: number; longitude: number }> = [];
    const candidates = [`${trimmed}, Rwanda`, trimmed];

    for (const q of candidates) {
      try {
        const results = await Location.geocodeAsync(q);
        for (const r of results) {
          if (out.length >= limit) break;
          if (r?.latitude == null || r?.longitude == null) continue;
          const key = `${r.latitude.toFixed(5)},${r.longitude.toFixed(5)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const label = await labelForCoords(r.latitude, r.longitude);
          out.push({ label, latitude: r.latitude, longitude: r.longitude });
        }
      } catch {
        // ignore
      }
      if (out.length >= limit) break;
    }
    return out.slice(0, limit);
  }

  function applyOriginSuggestion(s: { label: string; latitude: number; longitude: number }) {
    const coords = { latitude: s.latitude, longitude: s.longitude };
    setOrigin(coords);
    setOriginLabel(s.label);
    setOriginQuery(s.label);
    setOriginSuggestions([]);
    setIsEditingOrigin(false);
    Keyboard.dismiss();
    fitRoute(coords, destination);
  }

  function applyDestSuggestion(s: { label: string; latitude: number; longitude: number }) {
    const coords = { latitude: s.latitude, longitude: s.longitude };
    setDestination(coords);
    setDestLabel(s.label);
    setDestQuery(s.label);
    setDestSuggestions([]);
    setIsEditingDest(false);
    Keyboard.dismiss();
    if (origin) fitRoute(origin, coords);
  }

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const subShow = Keyboard.addListener(showEvent, (e) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const subHide = Keyboard.addListener(hideEvent, () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const baseMapHeight = useMemo(() => {
    // Responsive base height (no keyboard).
    const raw = Math.round(windowHeight * 0.50);
    return Math.max(260, Math.min(520, raw));
  }, [windowHeight]);

  const mapHeight = useMemo(() => {
    // iOS: shrink map when keyboard is open so inputs remain visible.
    if (Platform.OS === 'ios' && isKeyboardVisible && keyboardHeight > 0) {
      const shrinkBy = Math.round(keyboardHeight * 0.40);
      return Math.max(180, baseMapHeight - shrinkBy);
    }
    return baseMapHeight;
  }, [baseMapHeight, isKeyboardVisible, keyboardHeight]);

  const sheetMaxHeight = useMemo(() => {
    // Keep the full map visible while typing; let the sheet scroll internally.
    const reserved = 64 /* top bar */ + 24 /* gaps */ + mapHeight + 32 /* paddings */;
    return Math.max(220, windowHeight - reserved);
  }, [windowHeight, mapHeight]);

  const keyboardOffset = useMemo(() => {
    // Keep iOS keyboard avoidance stable with safe-area.
    return Platform.OS === 'ios' ? insets.top + 12 : 0;
  }, [insets.top]);

  function fitRoute(nextOrigin: { latitude: number; longitude: number }, nextDest: { latitude: number; longitude: number }) {
    mapRef.current?.fitToCoordinates([nextOrigin, nextDest], {
      edgePadding: { top: 90, right: 90, bottom: 90, left: 90 },
      animated: true,
    });
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setOriginLabel('Enable location to set your pickup point');
          return;
        }

        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;

        const { latitude, longitude } = pos.coords;
        const label = await labelForCoords(latitude, longitude);
        if (cancelled) return;

        setOriginLabel(label);
        const nextOrigin = { latitude, longitude };
        setOrigin(nextOrigin);
        setDestination(nextOrigin);
        setOriginQuery(label);
        setDestQuery('');
        mapRef.current?.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.18,
            longitudeDelta: 0.18,
          },
          600
        );
      } catch {
        if (!cancelled) setOriginLabel('Could not get your location');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep origin text synced to current/pickup coordinate when not editing.
  useEffect(() => {
    if (!origin) return;
    let cancelled = false;
    const t = setTimeout(() => {
      (async () => {
        const label = await labelForCoords(origin.latitude, origin.longitude);
        if (cancelled) return;
        setOriginLabel(label);
        if (!isEditingOrigin) setOriginQuery(label);
      })();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [origin?.latitude, origin?.longitude, isEditingOrigin]);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      (async () => {
        const label = await labelForCoords(destination.latitude, destination.longitude);
        if (!cancelled) {
          setDestLabel(label);
          if (!isEditingDest) setDestQuery(label);
        }
      })();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [destination.latitude, destination.longitude]); // keep dest label synced to pin

  // When user types pickup, geocode and update route origin.
  useEffect(() => {
    if (!originQuery.trim()) return;
    let cancelled = false;
    const t = setTimeout(() => {
      (async () => {
        const coords = await coordsForQuery(originQuery);
        if (!coords || cancelled) return;
        setOrigin(coords);
        fitRoute(coords, destination);
      })();
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [originQuery, destination]);

  // Address suggestions for pickup (origin).
  useEffect(() => {
    let cancelled = false;
    const q = originQuery.trim();
    if (!isEditingOrigin || q.length < 3) {
      setOriginSuggestions([]);
      return;
    }
    setIsLoadingOriginSuggestions(true);
    const t = setTimeout(() => {
      (async () => {
        const sug = await suggestionsForQuery(q, 5);
        if (cancelled) return;
        setOriginSuggestions(sug);
        setIsLoadingOriginSuggestions(false);
      })();
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setIsLoadingOriginSuggestions(false);
    };
  }, [originQuery, isEditingOrigin]);

  // When user types, geocode and move the destination pin.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      (async () => {
        const q = destQuery.trim();
        if (!q) return;
        const coords = await coordsForQuery(q);
        if (!coords || cancelled) return;
        setDestination(coords);
        if (origin) fitRoute(origin, coords);
      })();
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [destQuery, origin]);

  // Address suggestions for destination.
  useEffect(() => {
    let cancelled = false;
    const q = destQuery.trim();
    if (!isEditingDest || q.length < 3) {
      setDestSuggestions([]);
      return;
    }
    setIsLoadingDestSuggestions(true);
    const t = setTimeout(() => {
      (async () => {
        const sug = await suggestionsForQuery(q, 5);
        if (cancelled) return;
        setDestSuggestions(sug);
        setIsLoadingDestSuggestions(false);
      })();
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
      setIsLoadingDestSuggestions(false);
    };
  }, [destQuery, isEditingDest]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: background }]} edges={['left', 'right', 'bottom']}>
      <View
        style={[
          styles.container,
          { backgroundColor: background, paddingBottom: Math.max(12, insets.bottom + 12) },
        ]}>
        <LinearGradient
          colors={colorScheme === 'dark' ? ['#0B1220', '#151718'] : [aquafinaSoft, '#EFE8FF']}
          locations={[0, 1]}
          style={styles.pageBg}
        />

        <ThemedView
          style={[styles.topBar, { paddingTop: insets.top + 6 }]}
          lightColor="transparent"
          darkColor="transparent">
          <View style={styles.brandWrap}>
            <View style={styles.logoWrap}>
              <LogoMark size={30} />
            </View>

            <View style={styles.greetingWrap}>
              <ThemedText style={[styles.greeting, { color: subText }]} numberOfLines={1}>
                Hello, <ThemedText style={[styles.greetingName, { color: text }]}>Saber Ali!</ThemedText>
              </ThemedText>
            </View>
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Settings" style={styles.settingsBtn}>
            <IconSymbol name="gearshape.fill" size={22} color={icon} />
          </Pressable>
        </ThemedView>

        <View style={[styles.mapCard, { height: mapHeight }]}>
          <MapView
            ref={(r) => {
              mapRef.current = r;
            }}
            provider={PROVIDER_GOOGLE}
            initialRegion={rwandaRegion}
            style={StyleSheet.absoluteFill}
            onPress={(e) => {
              Keyboard.dismiss();
              setIsEditingOrigin(false);
              setIsEditingDest(false);
              const next = e.nativeEvent.coordinate;
              setDestination(next);
              if (origin) fitRoute(origin, next);
            }}
            onPanDrag={() => {
              if (Platform.OS === 'ios') Keyboard.dismiss();
            }}
            showsUserLocation
            showsMyLocationButton={false}
            toolbarEnabled={false}>
            <Marker
              draggable
              coordinate={destination}
              onDragEnd={(e) => {
                const next = e.nativeEvent.coordinate;
                setDestination(next);
                if (origin) fitRoute(origin, next);
              }}
              tracksViewChanges={false}>
              <View style={styles.pinWrap}>
                <IconSymbol name="location.fill" size={34} color="#EF4444" />
              </View>
            </Marker>

            {origin ? (
              <Polyline
                coordinates={[origin, destination]}
                strokeColor={aquafina}
                strokeWidth={4}
                lineCap="round"
                lineJoin="round"
              />
            ) : null}
          </MapView>

          <View pointerEvents="none" style={styles.mapOverlayTopFade}>
            <LinearGradient
              colors={
                colorScheme === 'dark'
                  ? ['rgba(0,0,0,0.30)', 'rgba(0,0,0,0.00)']
                  : ['rgba(255,255,255,0.70)', 'rgba(255,255,255,0.00)']
              }
              style={StyleSheet.absoluteFill}
            />
          </View>
        </View>

        <ScrollView
          style={[styles.sheetScroll, { maxHeight: sheetMaxHeight }]}
          contentContainerStyle={{ flexGrow: 1 }}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          scrollIndicatorInsets={{ bottom: Math.max(12, insets.bottom + 12) }}
          onScrollBeginDrag={() => Keyboard.dismiss()}
          scrollEventThrottle={16}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={keyboardOffset}>
            <View style={[styles.sheet, { backgroundColor: surfaceStrong, borderColor: hairline }]}>
            <ThemedText style={[styles.sheetTitle, { color: text }]}>Where do you want to go?</ThemedText>

            <View style={styles.fieldGroup}>
              <View style={styles.fieldRow}>
                <View style={styles.pinColumn}>
                  <View style={[styles.bullet, { backgroundColor: aquafina }]} />
                  <View style={[styles.pinConnector, { backgroundColor: hairline }]} />
                  <View style={[styles.bullet, { backgroundColor: '#EF4444' }]} />
                </View>

                <View style={{ flex: 1 }}>
                  <View
                    style={[
                      styles.inputRow,
                      { backgroundColor: inputBg },
                      isEditingOrigin ? styles.inputRowFocused : null,
                    ]}>
                    <TextInput
                      value={originQuery}
                      onChangeText={setOriginQuery}
                      onFocus={() => setIsEditingOrigin(true)}
                      onBlur={() => setIsEditingOrigin(false)}
                      selectTextOnFocus
                      style={[styles.input, { color: text }]}
                      placeholder="Current location"
                      placeholderTextColor={placeholderText}
                      returnKeyType="search"
                      blurOnSubmit
                      onSubmitEditing={() => {
                        setIsEditingOrigin(false);
                        Keyboard.dismiss();
                      }}
                    />
                  </View>
                  {isEditingOrigin ? (
                    <View style={[styles.suggestions, { borderColor: hairline, backgroundColor: surfaceStrong }]}>
                      {isLoadingOriginSuggestions ? (
                        <ThemedText style={[styles.suggestionMeta, { color: subText }]}>Searching…</ThemedText>
                      ) : originSuggestions.length ? (
                        originSuggestions.map((s) => (
                          <Pressable
                            key={`${s.latitude},${s.longitude}`}
                            accessibilityRole="button"
                            onPress={() => applyOriginSuggestion(s)}
                            style={styles.suggestionRow}>
                            <IconSymbol name="location.fill" size={18} color={aquafina} />
                            <ThemedText style={[styles.suggestionText, { color: text }]} numberOfLines={2}>
                              {s.label}
                            </ThemedText>
                          </Pressable>
                        ))
                      ) : originQuery.trim().length >= 3 ? (
                        <ThemedText style={[styles.suggestionMeta, { color: subText }]}>No suggestions</ThemedText>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={[styles.divider, { backgroundColor: hairline }]} />
                  <View
                    style={[
                      styles.inputRow,
                      { backgroundColor: inputBg },
                      isEditingDest ? styles.inputRowFocused : null,
                    ]}>
                    <TextInput
                      value={destQuery}
                      onChangeText={setDestQuery}
                      onFocus={() => setIsEditingDest(true)}
                      onBlur={() => setIsEditingDest(false)}
                      selectTextOnFocus
                      style={[styles.input, { color: text }]}
                      placeholder="Enter destination"
                      placeholderTextColor={placeholderText}
                      returnKeyType="search"
                      blurOnSubmit
                      onSubmitEditing={() => {
                        setIsEditingDest(false);
                        Keyboard.dismiss();
                      }}
                    />
                  </View>
                  {isEditingDest ? (
                    <View style={[styles.suggestions, { borderColor: hairline, backgroundColor: surfaceStrong }]}>
                      {isLoadingDestSuggestions ? (
                        <ThemedText style={[styles.suggestionMeta, { color: subText }]}>Searching…</ThemedText>
                      ) : destSuggestions.length ? (
                        destSuggestions.map((s) => (
                          <Pressable
                            key={`${s.latitude},${s.longitude}`}
                            accessibilityRole="button"
                            onPress={() => applyDestSuggestion(s)}
                            style={styles.suggestionRow}>
                            <IconSymbol name="location.fill" size={18} color="#EF4444" />
                            <ThemedText style={[styles.suggestionText, { color: text }]} numberOfLines={2}>
                              {s.label}
                            </ThemedText>
                          </Pressable>
                        ))
                      ) : destQuery.trim().length >= 3 ? (
                        <ThemedText style={[styles.suggestionMeta, { color: subText }]}>No suggestions</ThemedText>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              <Chip label="Mirpur 4" />
              <Chip label="Miniso, Taltola Market" />
              <Chip label="+ Add Home" variant="ghost" />
            </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Chip({ label, variant = 'solid' }: { label: string; variant?: 'solid' | 'ghost' }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.chip, variant === 'ghost' ? styles.chipGhost : styles.chipSolid]}>
      <ThemedText style={styles.chipText}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  pageBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 420,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  brandWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 12,
  },
  logoWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingWrap: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600',
  },
  greetingName: {
    fontWeight: '900',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  mapCard: {
    marginTop: 8,
    // Full-bleed map: avoid the “inscribed card” look.
    marginHorizontal: -16,
    borderRadius: 0,
    overflow: 'hidden',
  },
  sheetScroll: {
    flex: 1,
    marginTop: 18,
  },
  mapOverlayTopFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 64,
  },
  pinWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    paddingTop: 22,
  },
  sheetTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  fieldGroup: {
    marginTop: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingTop: 12,
  },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  pinColumn: {
    width: 18,
    alignItems: 'center',
    paddingTop: 8,
  },
  pinConnector: {
    width: 2,
    height: 34,
    marginVertical: 6,
    borderRadius: 999,
    opacity: 0.7,
  },
  divider: {
    height: 1,
    opacity: 0.8,
  },
  inputRow: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputRowFocused: Platform.select({
    ios: {
      paddingTop: 16,
      paddingBottom: 10,
    },
    default: {},
  }),
  input: {
    fontSize: 14,
    fontWeight: '700',
    // iOS can clip bold glyph ascenders if the line box is too tight.
    // Avoid fixed height; give extra vertical padding and a slightly taller lineHeight.
    paddingHorizontal: 0,
    paddingVertical: Platform.OS === 'ios' ? 4 : 0,
    minHeight: Platform.OS === 'ios' ? 24 : undefined,
    lineHeight: Platform.OS === 'ios' ? 20 : 18,
    margin: 0,
  },
  suggestions: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  suggestionMeta: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
  chipsRow: {
    paddingTop: 12,
    gap: 10,
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  chipSolid: {
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  chipGhost: {
    backgroundColor: 'rgba(15,23,42,0.04)',
  },
  chipText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
  },
});
