/**
 * WeShare — Find Ride (Home)
 * Map-first. Low bottom sheet so map stays visible while typing.
 * GPS-locked fields — must pick from suggestion to confirm a place.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type Region } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import {
    autocomplete,
    googlePlaceDetails,
    fetchRoutePolyline,
    hasPlacesKey,
    type PlaceSuggestion,
} from '@/lib/places';
import { searchRides, type Ride } from '@/lib/rides';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const GOLD = '#F5C842';
const SURFACE = 'rgba(8,17,31,0.94)';
const SURFACE_LT = 'rgba(255,255,255,0.98)';
const HAIRLINE = 'rgba(255,255,255,0.10)';
const HAIRLINE_LT = 'rgba(8,17,31,0.09)';
const TEXT_W = '#FFFFFF';
const TEXT_W2 = 'rgba(255,255,255,0.50)';
const TEXT_D = '#08111F';
const TEXT_D2 = 'rgba(8,17,31,0.48)';

const { height: SCREEN_H } = Dimensions.get('window');

// Sheet heights — lower peek so map is always visible while typing
const SHEET_PEEK = 190;   // resting: just the two fields + Go button
const SHEET_SUGGEST = 420;   // while typing: fields + suggestions list visible
const SHEET_RESULTS = SCREEN_H * 0.72; // after search: full results

type LatLng = { latitude: number; longitude: number };

const KIGALI: Region = {
    latitude: -1.9441, longitude: 30.0619,
    latitudeDelta: 0.28, longitudeDelta: 0.28,
};

function formatDepart(d: Date) {
    return d.toLocaleString(undefined, {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
    });
}


async function fetchSuggestions(query: string): Promise<PlaceSuggestion[]> {
    const q = query.trim();
    if (q.length < 2) return [];
    return autocomplete(q, 6);
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function FindRideScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const scheme = useColorScheme();
    const isDark = scheme === 'dark';
    const { session } = useSession();
    const mapRef = useRef<MapView | null>(null);

    const sheetAnim = useRef(new Animated.Value(SHEET_PEEK)).current;
    const [sheetMode, setSheetMode] = useState<'peek' | 'suggest' | 'results'>('peek');

    function animateSheet(toValue: number, mode: typeof sheetMode) {
        setSheetMode(mode);
        Animated.spring(sheetAnim, {
            toValue, useNativeDriver: false, tension: 68, friction: 12,
        }).start();
    }

    // ── Place state ───────────────────────────────────────────
    // Each field has: display text + whether a GPS pick has been confirmed
    const [fromText, setFromText] = useState('');
    const [toText, setToText] = useState('');
    const [fromConfirmed, setFromConfirmed] = useState(false); // true only after picking suggestion
    const [toConfirmed, setToConfirmed] = useState(false);
    const [fromCoord, setFromCoord] = useState<LatLng | null>(null);
    const [toCoord, setToCoord] = useState<LatLng | null>(null);
    const [fromFull, setFromFull] = useState('');
    const [toFull, setToFull] = useState('');
    const [routeCoords, setRouteCoords] = useState<LatLng[] | null>(null);

    const [editing, setEditing] = useState<'from' | 'to' | null>(null);
    const [fromSugs, setFromSugs] = useState<PlaceSuggestion[]>([]);
    const [toSugs, setToSugs] = useState<PlaceSuggestion[]>([]);
    const [loadingFrom, setLoadingFrom] = useState(false);
    const [loadingTo, setLoadingTo] = useState(false);

    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [results, setResults] = useState<Ride[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // ── Autocomplete debounce ─────────────────────────────────
    useEffect(() => {
        if (editing !== 'from') {
            setLoadingFrom(false);
            return;
        }
        if (!fromText.trim() || fromConfirmed) {
            setFromSugs([]);
            setLoadingFrom(false);
            return;
        }
        if (fromText.trim().length < 2) {
            setFromSugs([]);
            setLoadingFrom(false);
            return;
        }

        let cancelled = false;
        setLoadingFrom(true);
        const q = fromText;
        const t = setTimeout(() => {
            void (async () => {
                try {
                    const sugs = await fetchSuggestions(q);
                    if (!cancelled) setFromSugs(sugs);
                } finally {
                    if (!cancelled) setLoadingFrom(false);
                }
            })();
        }, 280);

        return () => {
            cancelled = true;
            clearTimeout(t);
            setLoadingFrom(false);
        };
    }, [fromText, editing, fromConfirmed]);

    useEffect(() => {
        if (editing !== 'to') {
            setLoadingTo(false);
            return;
        }
        if (!toText.trim() || toConfirmed) {
            setToSugs([]);
            setLoadingTo(false);
            return;
        }
        if (toText.trim().length < 2) {
            setToSugs([]);
            setLoadingTo(false);
            return;
        }

        let cancelled = false;
        setLoadingTo(true);
        const q = toText;
        const t = setTimeout(() => {
            void (async () => {
                try {
                    const sugs = await fetchSuggestions(q);
                    if (!cancelled) setToSugs(sugs);
                } finally {
                    if (!cancelled) setLoadingTo(false);
                }
            })();
        }, 280);

        return () => {
            cancelled = true;
            clearTimeout(t);
            setLoadingTo(false);
        };
    }, [toText, editing, toConfirmed]);

    // ── Pick suggestion ───────────────────────────────────────
    async function pickSuggestion(kind: 'from' | 'to', sug: PlaceSuggestion) {
        setLoadingFrom(false);
        setLoadingTo(false);

        let coords = sug.coords ?? null;
        let full = sug.fullAddress;

        if (sug.source === 'google') {
            const d = await googlePlaceDetails(sug.id);
            if (d) { coords = d.coords; full = d.formattedAddress; }
        }

        if (kind === 'from') {
            setFromText(sug.shortLabel);
            setFromFull(full);
            setFromCoord(coords);
            setFromConfirmed(true);
            setFromSugs([]);
        } else {
            setToText(sug.shortLabel);
            setToFull(full);
            setToCoord(coords);
            setToConfirmed(true);
            setToSugs([]);
        }

        setEditing(null);
        Keyboard.dismiss();
        animateSheet(SHEET_PEEK, 'peek');

        if (coords) {
            mapRef.current?.animateToRegion(
                { ...coords, latitudeDelta: 0.12, longitudeDelta: 0.12 }, 500
            );
        }
    }

    // ── When user edits a confirmed field, reset its GPS lock ─
    function onFromChange(v: string) {
        setFromText(v);
        if (fromConfirmed) { setFromConfirmed(false); setFromCoord(null); setFromFull(''); }
    }
    function onToChange(v: string) {
        setToText(v);
        if (toConfirmed) { setToConfirmed(false); setToCoord(null); setToFull(''); }
    }

    // ── Auto-fit map when both pins confirmed ─────────────────
    useEffect(() => {
        if (!fromCoord || !toCoord) return;
        mapRef.current?.fitToCoordinates([fromCoord, toCoord], {
            edgePadding: { top: 80, right: 60, bottom: SHEET_PEEK + 100, left: 60 },
            animated: true,
        });
    }, [fromCoord, toCoord]);

    // ── Route line draws as soon as both pins exist ───────────
    useEffect(() => {
        if (!fromCoord || !toCoord) { setRouteCoords(null); return; }
        let cancelled = false;
        fetchRoutePolyline(fromCoord, toCoord).then(c => {
            if (!cancelled) setRouteCoords(c);
        });
        return () => { cancelled = true; };
    }, [fromCoord, toCoord]);

    // ── Search — only possible when both GPS confirmed ────────
    // canSearch requires actual GPS picks, not just typed text
    const canSearch = fromConfirmed && toConfirmed;

    async function onSearch() {
        if (!canSearch || searching) return;
        setSearching(true);
        Keyboard.dismiss();
        try {
            const rides = await searchRides(fromText.trim(), toText.trim());
            const filtered = session
                ? rides.filter(r => r.postedByUserId !== session.userId)
                : rides;
            setResults(filtered);
            setSearched(true);
            setExpandedId(null);
            animateSheet(SHEET_RESULTS, 'results');
        } catch {
            setResults([]); setSearched(true);
            animateSheet(SHEET_RESULTS, 'results');
        } finally {
            setSearching(false);
        }
    }

    function onBookRide(rideId: string) {
        const redirect = `/bookings/confirm?rideId=${encodeURIComponent(rideId)}`;
        if (!session) { router.push({ pathname: '/auth', params: { redirect } }); return; }
        router.push(redirect as any);
    }

    function dismissAll() {
        Keyboard.dismiss();
        setEditing(null);
        setFromSugs([]);
        setToSugs([]);
        if (sheetMode === 'suggest') animateSheet(SHEET_PEEK, 'peek');
    }

    // ── Theme ─────────────────────────────────────────────────
    const surf = isDark ? SURFACE : SURFACE_LT;
    const hair = isDark ? HAIRLINE : HAIRLINE_LT;
    const textPri = isDark ? TEXT_W : TEXT_D;
    const textSub = isDark ? TEXT_W2 : TEXT_D2;
    const inputBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(8,17,31,0.05)';

    const activeSugs = editing === 'from' ? fromSugs : toSugs;

    return (
        <View style={styles.root}>

            {/* ── Full-bleed map ── */}
            <MapView
                ref={r => { mapRef.current = r; }}
                provider={PROVIDER_GOOGLE}
                initialRegion={KIGALI}
                style={StyleSheet.absoluteFill}
                customMapStyle={isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE}
                showsUserLocation
                showsMyLocationButton={false}
                toolbarEnabled={false}
                onPress={dismissAll}
            >
                {fromCoord && (
                    <Marker coordinate={fromCoord}>
                        <View style={styles.pinWrap}>
                            <View style={[styles.pin, { backgroundColor: TEAL, shadowColor: TEAL }]}>
                                <View style={styles.pinInner} />
                            </View>
                            <View style={[styles.pinTail, { borderTopColor: TEAL }]} />
                        </View>
                    </Marker>
                )}
                {toCoord && (
                    <Marker coordinate={toCoord}>
                        <View style={styles.pinWrap}>
                            <View style={[styles.pin, { backgroundColor: ACCENT, shadowColor: ACCENT }]}>
                                <View style={styles.pinInner} />
                            </View>
                            <View style={[styles.pinTail, { borderTopColor: ACCENT }]} />
                        </View>
                    </Marker>
                )}
                {routeCoords && routeCoords.length >= 2 && (
                    <Polyline
                        coordinates={routeCoords}
                        strokeColor={ACCENT}
                        strokeWidth={3.5}
                        lineCap="round"
                        lineJoin="round"
                        lineDashPattern={hasPlacesKey() ? undefined : [10, 7]}
                    />
                )}
            </MapView>

            {/* ── Location FAB ── */}
            <Pressable
                onPress={() => mapRef.current?.animateToRegion(KIGALI, 700)}
                style={[styles.locFab, {
                    bottom: SHEET_PEEK + 14,
                    backgroundColor: isDark ? NAVY_2 : '#FFF',
                    borderColor: hair,
                }]}
            >
                <IconSymbol name="location.fill" size={19} color={ACCENT} />
            </Pressable>

            {/* ── Bottom sheet ── */}
            <Animated.View style={[styles.sheet, { height: sheetAnim, backgroundColor: surf }]}>

                {/* Drag handle */}
                <Pressable onPress={dismissAll} style={styles.handleArea}>
                    <View style={[styles.handle, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.13)',
                    }]} />
                </Pressable>

                {/* ── Search fields ── */}
                <View style={styles.searchSection}>
                    {/* Route connector */}
                    <View style={styles.connector}>
                        <View style={[styles.connDot, {
                            backgroundColor: fromConfirmed ? TEAL : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'),
                        }]} />
                        <View style={[styles.connLine, { backgroundColor: hair }]} />
                        <View style={[styles.connDot, {
                            backgroundColor: toConfirmed ? ACCENT : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)'),
                        }]} />
                    </View>

                    <View style={styles.fieldsCol}>
                        {/* From field */}
                        <View style={[
                            styles.fieldBox,
                            { backgroundColor: inputBg },
                            editing === 'from' && { borderColor: TEAL, borderWidth: 1.5 },
                            fromConfirmed && editing !== 'from' && { borderColor: TEAL + '60', borderWidth: 1 },
                        ]}>
                            <TextInput
                                value={fromText}
                                onChangeText={onFromChange}
                                onFocus={() => {
                                    setEditing('from');
                                    animateSheet(SHEET_SUGGEST, 'suggest');
                                }}
                                placeholder="From"
                                placeholderTextColor={textSub}
                                style={[styles.fieldInput, { color: textPri }]}
                                returnKeyType="next"
                            // Do NOT selectTextOnFocus — let user see what they typed
                            />
                            {fromConfirmed && (
                                <View style={[styles.confirmedBadge, { backgroundColor: TEAL + '20' }]}>
                                    <IconSymbol name="checkmark" size={10} color={TEAL} />
                                </View>
                            )}
                            {fromText.length > 0 && (
                                <Pressable onPress={() => {
                                    setFromText(''); setFromConfirmed(false);
                                    setFromCoord(null); setFromFull(''); setFromSugs([]);
                                }}>
                                    <IconSymbol name="xmark.circle.fill" size={16} color={textSub} />
                                </Pressable>
                            )}
                        </View>

                        {/* Swap + divider */}
                        <View style={styles.swapRow}>
                            <View style={[styles.swapDivider, { backgroundColor: hair }]} />
                            <Pressable
                                onPress={() => {
                                    const tf = fromText; const tc = fromCoord; const tfa = fromFull; const tfc = fromConfirmed;
                                    setFromText(toText); setFromCoord(toCoord); setFromFull(toFull); setFromConfirmed(toConfirmed);
                                    setToText(tf); setToCoord(tc); setToFull(tfa); setToConfirmed(tfc);
                                    setFromSugs([]); setToSugs([]);
                                }}
                                style={[styles.swapCircle, { backgroundColor: inputBg, borderColor: hair }]}
                            >
                                <IconSymbol name="arrow.up.arrow.down" size={12} color={textSub} />
                            </Pressable>
                            <View style={[styles.swapDivider, { backgroundColor: hair }]} />
                        </View>

                        {/* To field */}
                        <View style={[
                            styles.fieldBox,
                            { backgroundColor: inputBg },
                            editing === 'to' && { borderColor: ACCENT, borderWidth: 1.5 },
                            toConfirmed && editing !== 'to' && { borderColor: ACCENT + '60', borderWidth: 1 },
                        ]}>
                            <TextInput
                                value={toText}
                                onChangeText={onToChange}
                                onFocus={() => {
                                    setEditing('to');
                                    animateSheet(SHEET_SUGGEST, 'suggest');
                                }}
                                placeholder="To"
                                placeholderTextColor={textSub}
                                style={[styles.fieldInput, { color: textPri }]}
                                returnKeyType="search"
                                onSubmitEditing={onSearch}
                            />
                            {toConfirmed && (
                                <View style={[styles.confirmedBadge, { backgroundColor: ACCENT + '20' }]}>
                                    <IconSymbol name="checkmark" size={10} color={ACCENT} />
                                </View>
                            )}
                            {toText.length > 0 && (
                                <Pressable onPress={() => {
                                    setToText(''); setToConfirmed(false);
                                    setToCoord(null); setToFull(''); setToSugs([]);
                                }}>
                                    <IconSymbol name="xmark.circle.fill" size={16} color={textSub} />
                                </Pressable>
                            )}
                        </View>
                    </View>

                    {/* Go button */}
                    <Pressable
                        onPress={onSearch}
                        disabled={!canSearch || searching}
                        style={[styles.goBtn, { opacity: !canSearch || searching ? 0.38 : 1 }]}
                    >
                        <LinearGradient
                            colors={[ACCENT, '#FF4500']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.goBtnGrad}
                        >
                            {searching
                                ? <ActivityIndicator color="#fff" size="small" />
                                : <>
                                    <IconSymbol name="magnifyingglass" size={17} color="#fff" />
                                    <ThemedText style={styles.goBtnText}>Go</ThemedText>
                                </>
                            }
                        </LinearGradient>
                    </Pressable>
                </View>

                {/* ── Hint when field is focused but nothing typed ── */}
                {editing !== null && fromSugs.length === 0 && toSugs.length === 0
                    && !loadingFrom && !loadingTo
                    && (editing === 'from' ? !fromText.trim() : !toText.trim()) && (
                        <View style={styles.hintRow}>
                            <IconSymbol name="magnifyingglass" size={13} color={textSub} />
                            <ThemedText style={[styles.hintText, { color: textSub }]}>
                                Start typing a city or place in Rwanda
                            </ThemedText>
                        </View>
                    )}

                {/* ── Loading indicator ── */}
                {(loadingFrom || loadingTo) && (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator size="small" color={loadingFrom ? TEAL : ACCENT} />
                        <ThemedText style={[styles.loadingText, { color: textSub }]}>
                            Finding places…
                        </ThemedText>
                    </View>
                )}

                {/* ── Suggestions list ── */}
                {activeSugs.length > 0 && (
                    <View style={[styles.sugList, { borderColor: hair }]}>
                        {activeSugs.map((s, i, arr) => (
                            <Pressable
                                key={s.id}
                                onPress={() => pickSuggestion(editing === 'from' ? 'from' : 'to', s)}
                                style={[
                                    styles.sugItem,
                                    i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: hair },
                                ]}
                            >
                                {/* Icon */}
                                <View style={[styles.sugIcon, {
                                    backgroundColor: editing === 'from' ? TEAL + '18' : ACCENT + '18',
                                }]}>
                                    <IconSymbol
                                        name="mappin"
                                        size={13}
                                        color={editing === 'from' ? TEAL : ACCENT}
                                    />
                                </View>

                                {/* Two-line label (Uber-style) */}
                                <View style={styles.sugLabels}>
                                    <ThemedText style={[styles.sugMain, { color: textPri }]} numberOfLines={1}>
                                        {s.shortLabel}
                                    </ThemedText>
                                    {s.subLabel ? (
                                        <ThemedText style={[styles.sugSub, { color: textSub }]} numberOfLines={1}>
                                            {s.subLabel}
                                        </ThemedText>
                                    ) : null}
                                </View>

                                <IconSymbol name="arrow.up.left" size={11} color={textSub} />
                            </Pressable>
                        ))}
                    </View>
                )}

                {/* ── Results ── */}
                {sheetMode === 'results' && searched && (
                    <ScrollView
                        style={styles.resultsList}
                        contentContainerStyle={{
                            paddingBottom: insets.bottom + 40,
                            paddingHorizontal: 16,
                            gap: 10,
                            paddingTop: 4,
                        }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.resultsHdr}>
                            <View>
                                <ThemedText style={[styles.resultsCount, { color: textPri }]}>
                                    {results.length > 0
                                        ? `${results.length} ride${results.length === 1 ? '' : 's'}`
                                        : 'No rides'}
                                </ThemedText>
                                <ThemedText style={[styles.routeLabel, { color: textSub }]}>
                                    {fromText} → {toText}
                                </ThemedText>
                            </View>
                            <Pressable
                                onPress={() => animateSheet(SHEET_PEEK, 'peek')}
                                style={[styles.closeBtn, { backgroundColor: inputBg }]}
                            >
                                <IconSymbol name="xmark" size={13} color={textSub} />
                            </Pressable>
                        </View>

                        {results.length === 0 && (
                            <View style={[styles.noResults, { borderColor: hair, backgroundColor: inputBg }]}>
                                <ThemedText style={{ fontSize: 36, textAlign: 'center' }}>🛣️</ThemedText>
                                <ThemedText style={[styles.noResultsTitle, { color: textPri }]}>
                                    No rides on this route
                                </ThemedText>
                                <ThemedText style={[styles.noResultsSub, { color: textSub }]}>
                                    Try nearby cities or check back later.
                                </ThemedText>
                                <Pressable
                                    onPress={() => router.push('/post-ride' as any)}
                                    style={styles.postRideBtn}
                                >
                                    <ThemedText style={styles.postRideBtnText}>Post a ride →</ThemedText>
                                </Pressable>
                            </View>
                        )}

                        {results.map(r => (
                            <RideCard
                                key={r.id}
                                ride={r}
                                expanded={expandedId === r.id}
                                onToggle={() => setExpandedId(cur => cur === r.id ? null : r.id)}
                                onBook={() => onBookRide(r.id)}
                                onManage={() => router.push(`/rides/${r.id}` as any)}
                                isOwn={session?.userId === r.postedByUserId}
                                isDark={isDark}
                                hair={hair}
                                textPri={textPri}
                                textSub={textSub}
                                inputBg={inputBg}
                            />
                        ))}
                    </ScrollView>
                )}
            </Animated.View>
        </View>
    );
}

// ─── Ride card ────────────────────────────────────────────────────────────────
function RideCard({ ride, expanded, onToggle, onBook, onManage, isOwn, isDark, hair, textPri, textSub, inputBg }: {
    ride: Ride; expanded: boolean; onToggle: () => void;
    onBook: () => void; onManage: () => void; isOwn: boolean;
    isDark: boolean; hair: string; textPri: string; textSub: string; inputBg: string;
}) {
    const depart = new Date(ride.departAtISO);
    const bg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(8,17,31,0.03)';

    return (
        <Pressable onPress={onToggle} style={[styles.card, { backgroundColor: bg, borderColor: hair }]}>
            <View style={styles.cardTop}>
                <View style={styles.chipRow}>
                    <View style={[styles.chip, { backgroundColor: TEAL + '18' }]}>
                        <ThemedText style={[styles.chipText, { color: TEAL }]}>{ride.fromShort}</ThemedText>
                    </View>
                    <ThemedText style={{ fontSize: 11, color: textSub }}>→</ThemedText>
                    <View style={[styles.chip, { backgroundColor: ACCENT + '18' }]}>
                        <ThemedText style={[styles.chipText, { color: ACCENT }]}>{ride.toShort}</ThemedText>
                    </View>
                </View>
                <View style={styles.priceCol}>
                    <ThemedText style={styles.price}>RWF {ride.priceRwf.toLocaleString()}</ThemedText>
                    <ThemedText style={[styles.priceSub, { color: textSub }]}>/ seat</ThemedText>
                </View>
            </View>

            <View style={styles.metaRow}>
                <View style={[styles.metaChip, { backgroundColor: inputBg }]}>
                    <IconSymbol name="clock.fill" size={11} color={textSub} />
                    <ThemedText style={[styles.metaText, { color: textSub }]}>
                        {Number.isNaN(depart.getTime()) ? ride.departAtISO : formatDepart(depart)}
                    </ThemedText>
                </View>
                <View style={[styles.metaChip, { backgroundColor: inputBg }]}>
                    <IconSymbol name="person.2.fill" size={11} color={textSub} />
                    <ThemedText style={[styles.metaText, { color: textSub }]}>{ride.seats} seats</ThemedText>
                </View>
                <View style={{ flex: 1 }} />
                <IconSymbol name={expanded ? 'chevron.up' : 'chevron.down'} size={12} color={textSub} />
            </View>

            {expanded && (
                <View style={[styles.cardExpanded, { borderTopColor: hair }]}>
                    {ride.note ? (
                        <View style={[styles.noteWrap, { backgroundColor: inputBg }]}>
                            <IconSymbol name="text.bubble.fill" size={12} color={textSub} />
                            <ThemedText style={[styles.noteText, { color: textSub }]}>{ride.note}</ThemedText>
                        </View>
                    ) : null}
                    <Pressable onPress={isOwn ? onManage : onBook} style={styles.ctaBtn}>
                        <LinearGradient
                            colors={isOwn ? ['#0EA5E9', '#0369A1'] : [ACCENT, '#FF4500']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.ctaBtnGrad}
                        >
                            <ThemedText style={styles.ctaBtnText}>
                                {isOwn ? 'Manage ride' : 'Book this ride →'}
                            </ThemedText>
                        </LinearGradient>
                    </Pressable>
                </View>
            )}
        </Pressable>
    );
}

// ─── Map styles ───────────────────────────────────────────────────────────────
const DARK_MAP_STYLE = [
    { elementType: 'geometry', stylers: [{ color: '#0d1b2a' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#6b7f99' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#08111f' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#162944' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#1a3354' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1f3d66' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#05101d' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0b1929' }] },
];

const LIGHT_MAP_STYLE = [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#e8e8e8' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9e8f5' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#555' }] },
];

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: NAVY },

    locFab: {
        position: 'absolute', right: 16,
        width: 44, height: 44, borderRadius: 14,
        borderWidth: 1, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 }, elevation: 8,
    },

    pinWrap: { alignItems: 'center' },
    pin: {
        width: 24, height: 24, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        shadowOpacity: 0.5, shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 }, elevation: 6,
    },
    pinInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.9)' },
    pinTail: {
        width: 0, height: 0,
        borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 8,
        borderLeftColor: 'transparent', borderRightColor: 'transparent',
        marginTop: -1,
    },

    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 36,
        shadowOffset: { width: 0, height: -8 }, elevation: 36,
        overflow: 'hidden',
    },
    handleArea: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
    handle: { width: 38, height: 4, borderRadius: 2 },

    searchSection: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 18, paddingBottom: 14, gap: 10,
    },
    connector: { alignItems: 'center', paddingTop: 2, gap: 2 },
    connDot: { width: 10, height: 10, borderRadius: 5 },
    connLine: { width: 2, height: 32, borderRadius: 1, marginVertical: 2 },

    fieldsCol: { flex: 1, gap: 0 },
    fieldBox: {
        flexDirection: 'row', alignItems: 'center',
        height: 46, borderRadius: 12, paddingHorizontal: 12,
        borderWidth: 1, borderColor: 'transparent', gap: 6,
    },
    fieldInput: {
        flex: 1, fontSize: 14, fontWeight: '700',
        padding: 0, margin: 0,
    },
    confirmedBadge: {
        width: 18, height: 18, borderRadius: 9,
        alignItems: 'center', justifyContent: 'center',
    },

    swapRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    swapDivider: { flex: 1, height: 1 },
    swapCircle: {
        width: 26, height: 26, borderRadius: 13,
        borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    },

    goBtn: { borderRadius: 14, overflow: 'hidden' },
    goBtnGrad: {
        width: 60, height: 100,
        alignItems: 'center', justifyContent: 'center', gap: 5,
    },
    goBtnText: { color: '#fff', fontSize: 11, fontWeight: '900' },

    hintRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingHorizontal: 20, paddingBottom: 10,
    },
    hintText: { fontSize: 13, fontWeight: '600' },

    loadingRow: {
        flexDirection: 'row', alignItems: 'center',
        gap: 8, paddingHorizontal: 20, paddingBottom: 8,
    },
    loadingText: { fontSize: 12, fontWeight: '600' },

    sugList: {
        marginHorizontal: 16, borderRadius: 14,
        borderWidth: 1, overflow: 'hidden', marginBottom: 8,
    },
    sugItem: {
        flexDirection: 'row', alignItems: 'center',
        gap: 10, paddingHorizontal: 14, paddingVertical: 12,
    },
    sugIcon: {
        width: 32, height: 32, borderRadius: 10,
        alignItems: 'center', justifyContent: 'center',
    },
    sugLabels: { flex: 1, gap: 1 },
    sugMain: { fontSize: 14, fontWeight: '800' },
    sugSub: { fontSize: 12, fontWeight: '500' },

    resultsList: { flex: 1 },
    resultsHdr: {
        flexDirection: 'row', alignItems: 'flex-start',
        justifyContent: 'space-between', marginBottom: 6,
    },
    resultsCount: { fontSize: 18, fontWeight: '900' },
    routeLabel: { fontSize: 12, fontWeight: '600', marginTop: 2 },
    closeBtn: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    noResults: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: 8 },
    noResultsTitle: { fontSize: 17, fontWeight: '900' },
    noResultsSub: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
    postRideBtn: {
        marginTop: 4, height: 38, paddingHorizontal: 16,
        borderRadius: 10, backgroundColor: ACCENT, justifyContent: 'center',
    },
    postRideBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },

    card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' },
    chip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
    chipText: { fontSize: 13, fontWeight: '900' },
    priceCol: { alignItems: 'flex-end' },
    price: { fontSize: 15, fontWeight: '900', color: GOLD },
    priceSub: { fontSize: 10, fontWeight: '700', marginTop: 1 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaChip: {
        flexDirection: 'row', alignItems: 'center',
        gap: 4, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4,
    },
    metaText: { fontSize: 11, fontWeight: '700' },
    cardExpanded: { borderTopWidth: 1, paddingTop: 12, gap: 10 },
    noteWrap: { flexDirection: 'row', gap: 8, borderRadius: 10, padding: 10, alignItems: 'flex-start' },
    noteText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
    ctaBtn: { borderRadius: 14, overflow: 'hidden' },
    ctaBtnGrad: { height: 46, alignItems: 'center', justifyContent: 'center' },
    ctaBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
}) as any;