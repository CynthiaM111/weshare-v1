/**
 * WeShare — Post Ride
 * Auth-gated. GPS-locked fields. 3-step flow.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { AuthGate } from '@/components/ui/AuthGate';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import {
  autocomplete,
  googlePlaceDetails,
  type PlaceSuggestion,
} from '@/lib/places';
import { createRide } from '@/lib/rides';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const DANGER = '#EF4444';

type LatLng = { latitude: number; longitude: number };
const STEPS = ['Route', 'Details', 'Review'] as const;
type Step = typeof STEPS[number];

export default function PostRideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { session } = useSession();

  const surf = isDark ? 'rgba(8,17,31,0.94)' : 'rgba(255,255,255,0.98)';
  const hair = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(8,17,31,0.09)';
  const textPri = isDark ? '#FFFFFF' : NAVY;
  const textSub = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(8,17,31,0.48)';
  const inputBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(8,17,31,0.05)';
  const cardBg = isDark ? NAVY_2 : '#FFF';

  // ── Auth gate ─────────────────────────────────────────────
  if (!session) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: isDark ? NAVY : '#F5F7FA' }]}>
        <AuthGate
          icon="car.fill"
          title="Post a ride"
          description="Sign in to share your route and offer seats to passengers across Rwanda."
          redirectPath="/post-ride"
        />
      </SafeAreaView>
    );
  }

  return <PostRideForm
    router={router} insets={insets} isDark={isDark}
    hair={hair} textPri={textPri} textSub={textSub}
    inputBg={inputBg} cardBg={cardBg} session={session}
  />;
}

// Separate form component so hooks aren't called conditionally
function PostRideForm({ router, insets, isDark, hair, textPri, textSub, inputBg, cardBg, session }: any) {
  const [step, setStep] = useState<Step>('Route');
  const scrollRef = useRef<ScrollView>(null);

  // Route
  const [fromText, setFromText] = useState('');
  const [toText, setToText] = useState('');
  const [fromConfirmed, setFromConfirmed] = useState(false);
  const [toConfirmed, setToConfirmed] = useState(false);
  const [fromCoord, setFromCoord] = useState<LatLng | null>(null);
  const [toCoord, setToCoord] = useState<LatLng | null>(null);
  const [fromFull, setFromFull] = useState('');
  const [toFull, setToFull] = useState('');
  const [editing, setEditing] = useState<'from' | 'to' | null>(null);
  const [fromSugs, setFromSugs] = useState<PlaceSuggestion[]>([]);
  const [toSugs, setToSugs] = useState<PlaceSuggestion[]>([]);
  const [loadingFrom, setLoadingFrom] = useState(false);
  const [loadingTo, setLoadingTo] = useState(false);

  // Details
  const [departDate, setDepartDate] = useState('');
  const [departTime, setDepartTime] = useState('');
  const [seats, setSeats] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');

  // Submit
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [posted, setPosted] = useState(false);

  // Autocomplete
  useEffect(() => {
    if (editing !== 'from' || fromConfirmed || fromText.trim().length < 2) { setFromSugs([]); return; }
    setLoadingFrom(true);
    const t = setTimeout(async () => { setFromSugs(await autocomplete(fromText, 6)); setLoadingFrom(false); }, 280);
    return () => clearTimeout(t);
  }, [fromText, editing, fromConfirmed]);

  useEffect(() => {
    if (editing !== 'to' || toConfirmed || toText.trim().length < 2) { setToSugs([]); return; }
    setLoadingTo(true);
    const t = setTimeout(async () => { setToSugs(await autocomplete(toText, 6)); setLoadingTo(false); }, 280);
    return () => clearTimeout(t);
  }, [toText, editing, toConfirmed]);

  async function pickSuggestion(kind: 'from' | 'to', sug: PlaceSuggestion) {
    let coords = sug.coords ?? null;
    let full = sug.fullAddress;
    if (sug.source === 'google') {
      const d = await googlePlaceDetails(sug.id);
      if (d) { coords = d.coords; full = d.formattedAddress; }
    }
    if (kind === 'from') {
      setFromText(sug.shortLabel); setFromFull(full); setFromCoord(coords); setFromConfirmed(true); setFromSugs([]);
    } else {
      setToText(sug.shortLabel); setToFull(full); setToCoord(coords); setToConfirmed(true); setToSugs([]);
    }
    setEditing(null);
    Keyboard.dismiss();
  }

  function resetField(kind: 'from' | 'to') {
    if (kind === 'from') { setFromText(''); setFromFull(''); setFromCoord(null); setFromConfirmed(false); setFromSugs([]); }
    else { setToText(''); setToFull(''); setToCoord(null); setToConfirmed(false); setToSugs([]); }
  }

  const routeValid = fromConfirmed && toConfirmed;
  const detailsValid = departDate.trim().length === 10 && departTime.trim().length === 5
    && Number(seats) > 0 && Number(price) > 0;

  function buildDepartISO() {
    try { return new Date(`${departDate}T${departTime}:00`).toISOString(); } catch { return ''; }
  }

  async function onPost() {
    if (!routeValid || !detailsValid || loading) return;
    const departISO = buildDepartISO();
    if (!departISO) { setError('Invalid date or time.'); return; }
    setError(''); setLoading(true);
    try {
      await createRide(session.userId, {
        from: fromFull || fromText, fromShort: fromText.trim(),
        fromLat: fromCoord?.latitude ?? null, fromLng: fromCoord?.longitude ?? null,
        to: toFull || toText, toShort: toText.trim(),
        toLat: toCoord?.latitude ?? null, toLng: toCoord?.longitude ?? null,
        departAtISO: departISO, seats: Number(seats),
        priceRwf: Number(price), note: note.trim() || undefined,
      });
      setPosted(true);
    } catch (e: any) {
      setError(e.message ?? 'Failed to post ride.');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setPosted(false); setStep('Route');
    setFromText(''); setToText(''); setFromConfirmed(false); setToConfirmed(false);
    setFromCoord(null); setToCoord(null); setFromFull(''); setToFull('');
    setDepartDate(''); setDepartTime(''); setSeats(''); setPrice(''); setNote('');
    setError('');
  }

  const activeSugs = editing === 'from' ? fromSugs : toSugs;

  // ── Success screen ────────────────────────────────────────
  if (posted) {
    return (
      <View style={[styles.successRoot, { backgroundColor: isDark ? NAVY : '#F5F7FA' }]}>
        <LinearGradient colors={[TEAL + '22', 'transparent']} style={styles.successBlob} />
        <View style={[styles.successIcon, { backgroundColor: TEAL + '18', borderColor: TEAL + '30' }]}>
          <IconSymbol name="checkmark.circle.fill" size={52} color={TEAL} />
        </View>
        <ThemedText style={[styles.successTitle, { color: textPri }]}>Ride posted!</ThemedText>
        <ThemedText style={[styles.successSub, { color: textSub }]}>
          Your ride from {fromText} to {toText} is now live for passengers to find.
        </ThemedText>
        <Pressable onPress={() => router.replace('/my-rides' as any)} style={styles.successBtn}>
          <LinearGradient colors={[ACCENT, '#FF4500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.successBtnGrad}>
            <ThemedText style={styles.successBtnText}>View my rides →</ThemedText>
          </LinearGradient>
        </Pressable>
        <Pressable onPress={resetForm} style={[styles.successAlt, { borderColor: hair }]}>
          <ThemedText style={[styles.successAltText, { color: textSub }]}>Post another ride</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: isDark ? NAVY : '#F5F7FA' }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: hair }]}>
          <View>
            <ThemedText style={[styles.headerTitle, { color: textPri }]}>Post a Ride</ThemedText>
            <ThemedText style={[styles.headerSub, { color: textSub }]}>Share your route with passengers</ThemedText>
          </View>
        </View>

        {/* Step bar */}
        <View style={[styles.stepBar, { backgroundColor: cardBg, borderBottomColor: hair }]}>
          {STEPS.map((s, i) => {
            const done = STEPS.indexOf(step) > i;
            const active = step === s;
            return (
              <View key={s} style={styles.stepItem}>
                <View style={[
                  styles.stepDot,
                  active && { backgroundColor: ACCENT, borderColor: ACCENT },
                  done && { backgroundColor: TEAL, borderColor: TEAL },
                  !active && !done && { borderColor: hair },
                ]}>
                  {done
                    ? <IconSymbol name="checkmark" size={10} color="#fff" />
                    : <ThemedText style={[styles.stepNum, { color: active ? '#fff' : textSub }]}>{i + 1}</ThemedText>
                  }
                </View>
                <ThemedText style={[styles.stepLabel, {
                  color: active ? textPri : done ? TEAL : textSub,
                  fontWeight: active ? '800' : '600',
                }]}>{s}</ThemedText>
                {i < STEPS.length - 1 && <View style={[styles.stepLine, { backgroundColor: done ? TEAL : hair }]} />}
              </View>
            );
          })}
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── STEP 1: ROUTE ── */}
          {step === 'Route' && (
            <View style={styles.stepContent}>
              <ThemedText style={[styles.sectionTitle, { color: textPri }]}>Where are you going?</ThemedText>
              <ThemedText style={[styles.sectionSub, { color: textSub }]}>
                Choose from suggestions — passengers search by city name.
              </ThemedText>

              {/* From */}
              <View style={styles.fieldGroup}>
                <ThemedText style={[styles.fieldLabel, { color: textSub }]}>FROM</ThemedText>
                <View style={[styles.fieldBox, { backgroundColor: inputBg, borderColor: hair },
                editing === 'from' && { borderColor: TEAL, borderWidth: 1.5 },
                fromConfirmed && { borderColor: TEAL + '60', borderWidth: 1 },
                ]}>
                  <View style={[styles.fieldDot, { backgroundColor: fromConfirmed ? TEAL : hair }]} />
                  <TextInput
                    value={fromText}
                    onChangeText={v => { setFromText(v); if (fromConfirmed) { setFromConfirmed(false); setFromCoord(null); setFromFull(''); } }}
                    onFocus={() => setEditing('from')}
                    placeholder="Origin city or place"
                    placeholderTextColor={textSub}
                    style={[styles.fieldInput, { color: textPri }]}
                  />
                  {loadingFrom && <ActivityIndicator size="small" color={TEAL} />}
                  {fromConfirmed && <View style={[styles.confirmedBadge, { backgroundColor: TEAL + '20' }]}><IconSymbol name="checkmark" size={10} color={TEAL} /></View>}
                  {fromText.length > 0 && <Pressable onPress={() => resetField('from')}><IconSymbol name="xmark.circle.fill" size={17} color={textSub} /></Pressable>}
                </View>
              </View>

              {/* Swap */}
              <Pressable
                onPress={() => {
                  const tf = fromText; const tc = fromCoord; const tfa = fromFull; const tfc = fromConfirmed;
                  setFromText(toText); setFromCoord(toCoord); setFromFull(toFull); setFromConfirmed(toConfirmed);
                  setToText(tf); setToCoord(tc); setToFull(tfa); setToConfirmed(tfc);
                }}
                style={[styles.swapBtn, { backgroundColor: inputBg, borderColor: hair }]}
              >
                <IconSymbol name="arrow.up.arrow.down" size={14} color={textSub} />
                <ThemedText style={[styles.swapText, { color: textSub }]}>Swap</ThemedText>
              </Pressable>

              {/* To */}
              <View style={styles.fieldGroup}>
                <ThemedText style={[styles.fieldLabel, { color: textSub }]}>TO</ThemedText>
                <View style={[styles.fieldBox, { backgroundColor: inputBg, borderColor: hair },
                editing === 'to' && { borderColor: ACCENT, borderWidth: 1.5 },
                toConfirmed && { borderColor: ACCENT + '60', borderWidth: 1 },
                ]}>
                  <View style={[styles.fieldDot, { backgroundColor: toConfirmed ? ACCENT : hair }]} />
                  <TextInput
                    value={toText}
                    onChangeText={v => { setToText(v); if (toConfirmed) { setToConfirmed(false); setToCoord(null); setToFull(''); } }}
                    onFocus={() => setEditing('to')}
                    placeholder="Destination city or place"
                    placeholderTextColor={textSub}
                    style={[styles.fieldInput, { color: textPri }]}
                  />
                  {loadingTo && <ActivityIndicator size="small" color={ACCENT} />}
                  {toConfirmed && <View style={[styles.confirmedBadge, { backgroundColor: ACCENT + '20' }]}><IconSymbol name="checkmark" size={10} color={ACCENT} /></View>}
                  {toText.length > 0 && <Pressable onPress={() => resetField('to')}><IconSymbol name="xmark.circle.fill" size={17} color={textSub} /></Pressable>}
                </View>
              </View>

              {/* Suggestions */}
              {activeSugs.length > 0 && (
                <View style={[styles.sugList, { backgroundColor: cardBg, borderColor: hair }]}>
                  {activeSugs.map((s, i, arr) => (
                    <Pressable
                      key={s.id}
                      onPress={() => pickSuggestion(editing === 'from' ? 'from' : 'to', s)}
                      style={[styles.sugItem, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: hair }]}
                    >
                      <View style={[styles.sugIcon, { backgroundColor: editing === 'from' ? TEAL + '18' : ACCENT + '18' }]}>
                        <IconSymbol name="mappin" size={13} color={editing === 'from' ? TEAL : ACCENT} />
                      </View>
                      <View style={styles.sugLabels}>
                        <ThemedText style={[styles.sugMain, { color: textPri }]} numberOfLines={1}>{s.shortLabel}</ThemedText>
                        {s.subLabel ? <ThemedText style={[styles.sugSub, { color: textSub }]} numberOfLines={1}>{s.subLabel}</ThemedText> : null}
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Next */}
              <Pressable onPress={() => { setStep('Details'); setEditing(null); Keyboard.dismiss(); }} disabled={!routeValid} style={[styles.nextBtn, { opacity: routeValid ? 1 : 0.38 }]}>
                <LinearGradient colors={[ACCENT, '#FF4500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnGrad}>
                  <ThemedText style={styles.nextBtnText}>Next — Trip details</ThemedText>
                  <IconSymbol name="arrow.right" size={16} color="#fff" />
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {/* ── STEP 2: DETAILS ── */}
          {step === 'Details' && (
            <View style={styles.stepContent}>
              <ThemedText style={[styles.sectionTitle, { color: textPri }]}>Trip details</ThemedText>
              <ThemedText style={[styles.sectionSub, { color: textSub }]}>When are you leaving and how many seats?</ThemedText>

              <View style={styles.rowFields}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <ThemedText style={[styles.fieldLabel, { color: textSub }]}>DATE</ThemedText>
                  <View style={[styles.fieldBox, { backgroundColor: inputBg, borderColor: hair }]}>
                    <IconSymbol name="calendar" size={15} color={textSub} />
                    <TextInput value={departDate} onChangeText={v => setDepartDate(v.replace(/[^0-9-]/g, '').slice(0, 10))} placeholder="2025-12-01" placeholderTextColor={textSub} style={[styles.fieldInput, { color: textPri }]} keyboardType="numbers-and-punctuation" maxLength={10} />
                  </View>
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <ThemedText style={[styles.fieldLabel, { color: textSub }]}>TIME</ThemedText>
                  <View style={[styles.fieldBox, { backgroundColor: inputBg, borderColor: hair }]}>
                    <IconSymbol name="clock" size={15} color={textSub} />
                    <TextInput value={departTime} onChangeText={v => setDepartTime(v.replace(/[^0-9:]/g, '').slice(0, 5))} placeholder="08:00" placeholderTextColor={textSub} style={[styles.fieldInput, { color: textPri }]} keyboardType="numbers-and-punctuation" maxLength={5} />
                  </View>
                </View>
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <ThemedText style={[styles.fieldLabel, { color: textSub }]}>SEATS</ThemedText>
                  <View style={[styles.fieldBox, { backgroundColor: inputBg, borderColor: hair }]}>
                    <IconSymbol name="person.2" size={15} color={textSub} />
                    <TextInput value={seats} onChangeText={setSeats} placeholder="4" placeholderTextColor={textSub} style={[styles.fieldInput, { color: textPri }]} keyboardType="number-pad" maxLength={2} />
                  </View>
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <ThemedText style={[styles.fieldLabel, { color: textSub }]}>PRICE / SEAT</ThemedText>
                  <View style={[styles.fieldBox, { backgroundColor: inputBg, borderColor: hair }]}>
                    <ThemedText style={[styles.currencyLabel, { color: textSub }]}>RWF</ThemedText>
                    <TextInput value={price} onChangeText={setPrice} placeholder="5000" placeholderTextColor={textSub} style={[styles.fieldInput, { color: textPri }]} keyboardType="number-pad" />
                  </View>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <ThemedText style={[styles.fieldLabel, { color: textSub }]}>NOTE (OPTIONAL)</ThemedText>
                <View style={[styles.noteBox, { backgroundColor: inputBg, borderColor: hair }]}>
                  <TextInput value={note} onChangeText={setNote} placeholder="e.g. AC available, no smoking, luggage ok…" placeholderTextColor={textSub} style={[styles.noteInput, { color: textPri }]} multiline numberOfLines={3} textAlignVertical="top" />
                </View>
              </View>

              <View style={styles.navRow}>
                <Pressable onPress={() => setStep('Route')} style={[styles.backBtn, { borderColor: hair, backgroundColor: inputBg }]}>
                  <IconSymbol name="arrow.left" size={14} color={textSub} />
                  <ThemedText style={[styles.backBtnText, { color: textSub }]}>Back</ThemedText>
                </Pressable>
                <Pressable onPress={() => setStep('Review')} disabled={!detailsValid} style={[styles.nextBtn, { flex: 1, opacity: detailsValid ? 1 : 0.38 }]}>
                  <LinearGradient colors={[ACCENT, '#FF4500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnGrad}>
                    <ThemedText style={styles.nextBtnText}>Review</ThemedText>
                    <IconSymbol name="arrow.right" size={16} color="#fff" />
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── STEP 3: REVIEW ── */}
          {step === 'Review' && (
            <View style={styles.stepContent}>
              <ThemedText style={[styles.sectionTitle, { color: textPri }]}>Review your ride</ThemedText>
              <ThemedText style={[styles.sectionSub, { color: textSub }]}>Double-check before posting.</ThemedText>

              <View style={[styles.reviewCard, { backgroundColor: cardBg, borderColor: hair }]}>
                {[
                  { icon: 'location.fill', color: TEAL, label: 'Route', value: `${fromText} → ${toText}`, step: 'Route' as Step },
                  { icon: 'clock.fill', color: ACCENT, label: 'Departure', value: `${departDate} at ${departTime}`, step: 'Details' as Step },
                  { icon: 'person.2.fill', color: TEAL, label: 'Seats & price', value: `${seats} seat${Number(seats) !== 1 ? 's' : ''} · RWF ${Number(price).toLocaleString()} / seat`, step: 'Details' as Step },
                  ...(note.trim() ? [{ icon: 'text.bubble.fill', color: ACCENT, label: 'Note', value: note, step: 'Details' as Step }] : []),
                ].map((row, i, arr) => (
                  <View key={row.label}>
                    <View style={styles.reviewRow}>
                      <View style={[styles.reviewIcon, { backgroundColor: row.color + '18' }]}>
                        <IconSymbol name={row.icon as any} size={14} color={row.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={[styles.reviewLabel, { color: textSub }]}>{row.label}</ThemedText>
                        <ThemedText style={[styles.reviewValue, { color: textPri }]}>{row.value}</ThemedText>
                      </View>
                      <Pressable onPress={() => setStep(row.step)}>
                        <ThemedText style={[styles.editLink, { color: ACCENT }]}>Edit</ThemedText>
                      </Pressable>
                    </View>
                    {i < arr.length - 1 && <View style={[styles.reviewDivider, { backgroundColor: hair }]} />}
                  </View>
                ))}
              </View>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: DANGER + '12', borderColor: DANGER + '30' }]}>
                  <IconSymbol name="exclamationmark.triangle.fill" size={15} color={DANGER} />
                  <ThemedText style={[styles.errorText, { color: DANGER }]}>{error}</ThemedText>
                </View>
              ) : null}

              <View style={styles.navRow}>
                <Pressable onPress={() => setStep('Details')} style={[styles.backBtn, { borderColor: hair, backgroundColor: inputBg }]}>
                  <IconSymbol name="arrow.left" size={14} color={textSub} />
                  <ThemedText style={[styles.backBtnText, { color: textSub }]}>Back</ThemedText>
                </Pressable>
                <Pressable onPress={onPost} disabled={loading} style={[styles.nextBtn, { flex: 1, opacity: loading ? 0.6 : 1 }]}>
                  <LinearGradient colors={[TEAL, '#00a896']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextBtnGrad}>
                    {loading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <><IconSymbol name="paperplane.fill" size={15} color="#fff" /><ThemedText style={styles.nextBtnText}>Post ride</ThemedText></>
                    }
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '900' },
  headerSub: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  stepBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  stepItem: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  stepNum: { fontSize: 11, fontWeight: '900' },
  stepLabel: { fontSize: 12 },
  stepLine: { flex: 1, height: 1.5, marginHorizontal: 6 },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  stepContent: { gap: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '900' },
  sectionSub: { fontSize: 13, fontWeight: '600', lineHeight: 18, marginTop: -6 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  fieldBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, gap: 10 },
  fieldDot: { width: 8, height: 8, borderRadius: 4 },
  fieldInput: { flex: 1, fontSize: 14, fontWeight: '700', padding: 0 },
  confirmedBadge: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  swapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  swapText: { fontSize: 12, fontWeight: '700' },
  sugList: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sugItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  sugIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sugLabels: { flex: 1, gap: 1 },
  sugMain: { fontSize: 14, fontWeight: '800' },
  sugSub: { fontSize: 12, fontWeight: '500' },
  rowFields: { flexDirection: 'row', gap: 12 },
  currencyLabel: { fontSize: 11, fontWeight: '800' },
  noteBox: { borderRadius: 14, borderWidth: 1, padding: 12, minHeight: 90 },
  noteInput: { fontSize: 14, fontWeight: '600', padding: 0, flex: 1 },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 50, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  backBtnText: { fontSize: 14, fontWeight: '700' },
  nextBtn: { borderRadius: 14, overflow: 'hidden' },
  nextBtnGrad: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  reviewCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  reviewIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  reviewLabel: { fontSize: 11, fontWeight: '700', marginBottom: 2 },
  reviewValue: { fontSize: 14, fontWeight: '800', lineHeight: 18 },
  reviewDivider: { height: 1, marginHorizontal: 14 },
  editLink: { fontSize: 13, fontWeight: '800' },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  errorText: { flex: 1, fontSize: 13, fontWeight: '700' },
  successRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 16 },
  successBlob: { position: 'absolute', top: 0, left: 0, right: 0, height: 300 },
  successIcon: { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  successTitle: { fontSize: 28, fontWeight: '900', textAlign: 'center' },
  successSub: { fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 20 },
  successBtn: { borderRadius: 16, overflow: 'hidden', width: '100%', marginTop: 8 },
  successBtnGrad: { height: 54, alignItems: 'center', justifyContent: 'center' },
  successBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  successAlt: { height: 46, width: '100%', borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  successAltText: { fontSize: 14, fontWeight: '700' },
}) as any;
