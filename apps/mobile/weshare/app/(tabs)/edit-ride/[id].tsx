/**
 * WeShare — Edit Ride
 * Driver-only. Allowed only when the ride has 0 active bookings (gated by the
 * caller in My Rides). Route is read-only; date/time/seats/price/note are editable.
 */

import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSession } from '@/hooks/use-session';
import { countActiveBookingsForRides } from '@/lib/bookings';
import { getRide, updateRide, type Ride } from '@/lib/rides';

const NAVY = '#08111F';
const NAVY_2 = '#0E1E35';
const ACCENT = '#FF6B35';
const TEAL = '#00C9B1';
const DANGER = '#EF4444';

function pad2(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function formatHM(d: Date) { return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function formatDateLong(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function EditRideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { session } = useSession();
  const { id } = useLocalSearchParams<{ id: string }>();

  const hair = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(8,17,31,0.09)';
  const textPri = isDark ? '#FFFFFF' : NAVY;
  const textSub = isDark ? 'rgba(255,255,255,0.50)' : 'rgba(8,17,31,0.48)';
  const inputBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(8,17,31,0.05)';
  const cardBg = isDark ? NAVY_2 : '#FFF';
  const bg = isDark ? NAVY : '#F5F7FA';
  const borderStrong = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(8,17,31,0.5)';

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState<string | null>(null);

  const [departAt, setDepartAt] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [seats, setSeats] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!id) { setLoading(false); return; }
      const r = await getRide(id);
      if (cancelled) return;
      if (!r) { setUnavailable('Ride not found.'); setLoading(false); return; }
      if (session && r.postedByUserId !== session.userId) {
        setUnavailable('You can only edit your own rides.'); setLoading(false); return;
      }
      if (r.status !== 'active') {
        setUnavailable('Only active rides can be edited.'); setLoading(false); return;
      }
      const counts = await countActiveBookingsForRides([r.id]);
      if (cancelled) return;
      if ((counts[r.id] ?? 0) > 0) {
        setUnavailable('This ride already has bookings and can no longer be edited.');
        setLoading(false);
        return;
      }
      setRide(r);
      setDepartAt(new Date(r.departAtISO));
      setSeats(String(r.seats));
      setPrice(String(r.priceRwf));
      setNote(r.note ?? '');
      setLoading(false);
    }
    run();
    return () => { cancelled = true; };
  }, [id, session?.userId]);

  function onDateChange(event: any, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (event?.type === 'dismissed') return;
    }
    if (!selected) return;
    setDepartAt(prev => {
      const base = prev ?? new Date();
      const next = new Date(selected);
      next.setHours(base.getHours(), base.getMinutes(), 0, 0);
      return next;
    });
  }

  function onTimeChange(event: any, selected?: Date) {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (event?.type === 'dismissed') return;
    }
    if (!selected) return;
    setDepartAt(prev => {
      const base = prev ?? new Date();
      const next = new Date(base);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      return next;
    });
  }

  const canSave = !!departAt && Number(seats) > 0 && Number(price) > 0 && !saving;

  async function onSave() {
    if (!ride || !departAt || !canSave) return;
    setError(''); setSaving(true);
    const err = await updateRide(ride.id, {
      departAtISO: departAt.toISOString(),
      seats: Number(seats),
      priceRwf: Number(price),
      note: note.trim() || undefined,
    });
    setSaving(false);
    if (err) { setError(err); return; }
    router.back();
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <View style={styles.center}><ActivityIndicator color={ACCENT} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (unavailable) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: hair, backgroundColor: cardBg }]}>
          <Pressable onPress={() => router.back()} style={styles.headerBack}>
            <IconSymbol name="arrow.left" size={16} color={textPri} />
            <ThemedText style={[styles.headerBackText, { color: textPri }]}>Back</ThemedText>
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: textPri }]}>Edit Ride</ThemedText>
          <View style={{ width: 64 }} />
        </View>
        <View style={styles.center}>
          <View style={[styles.emptyCard, { backgroundColor: cardBg, borderColor: hair }]}>
            <ThemedText style={{ fontSize: 32 }}>🔒</ThemedText>
            <ThemedText style={[styles.emptyTitle, { color: textPri }]}>Cannot edit</ThemedText>
            <ThemedText style={[styles.emptySub, { color: textSub }]}>{unavailable}</ThemedText>
            <Pressable onPress={() => router.back()} style={styles.emptyBtn}>
              <LinearGradient colors={[ACCENT, '#FF4500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.emptyBtnGrad}>
                <ThemedText style={styles.emptyBtnText}>Go back</ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: hair, backgroundColor: cardBg }]}>
          <Pressable onPress={() => router.back()} style={styles.headerBack}>
            <IconSymbol name="arrow.left" size={16} color={textPri} />
            <ThemedText style={[styles.headerBackText, { color: textPri }]}>Back</ThemedText>
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: textPri }]}>Edit Ride</ThemedText>
          <View style={{ width: 64 }} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Route (read-only) */}
          <View style={styles.fieldGroup}>
            <ThemedText style={[styles.fieldLabel, { color: textSub }]}>ROUTE (CANNOT BE CHANGED)</ThemedText>
            <View style={[styles.routeCard, { backgroundColor: cardBg, borderColor: hair }]}>
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: TEAL }]} />
                <ThemedText style={[styles.routeText, { color: textPri }]} numberOfLines={1}>{ride!.fromShort}</ThemedText>
              </View>
              <View style={[styles.routeDivider, { backgroundColor: hair }]} />
              <View style={styles.routeRow}>
                <View style={[styles.routeDot, { backgroundColor: ACCENT }]} />
                <ThemedText style={[styles.routeText, { color: textPri }]} numberOfLines={1}>{ride!.toShort}</ThemedText>
              </View>
            </View>
          </View>

          {/* Date + Time */}
          <View style={styles.rowFields}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <ThemedText style={[styles.fieldLabel, { color: textSub }]}>DATE</ThemedText>
              <Pressable onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }} style={[styles.fieldBox, { backgroundColor: inputBg, borderColor: hair }]}>
                <IconSymbol name="calendar" size={15} color={textSub} />
                <ThemedText style={[styles.fieldInput, { color: departAt ? textPri : textSub }]}>
                  {departAt ? formatDateLong(departAt) : 'Select date'}
                </ThemedText>
              </Pressable>
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <ThemedText style={[styles.fieldLabel, { color: textSub }]}>TIME</ThemedText>
              <Pressable onPress={() => { Keyboard.dismiss(); setShowTimePicker(true); }} style={[styles.fieldBox, { backgroundColor: inputBg, borderColor: hair }]}>
                <IconSymbol name="clock" size={15} color={textSub} />
                <ThemedText style={[styles.fieldInput, { color: departAt ? textPri : textSub }]}>
                  {departAt ? formatHM(departAt) : 'Select time'}
                </ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Seats + Price */}
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

          {/* Note */}
          <View style={styles.fieldGroup}>
            <ThemedText style={[styles.fieldLabel, { color: textSub }]}>NOTE (OPTIONAL)</ThemedText>
            <View style={[styles.noteBox, { backgroundColor: inputBg, borderColor: hair }]}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. AC available, no smoking, luggage ok…"
                placeholderTextColor={textSub}
                style={[styles.noteInput, { color: textPri }]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {error ? (
            <View style={[styles.errorBox, { backgroundColor: DANGER + '12', borderColor: DANGER + '30' }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={15} color={DANGER} />
              <ThemedText style={[styles.errorText, { color: DANGER }]}>{error}</ThemedText>
            </View>
          ) : null}

          {/* Actions */}
          <View style={styles.navRow}>
            <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: inputBg, borderColor: borderStrong }]}>
              <IconSymbol name="arrow.left" size={14} color={textPri} />
              <ThemedText style={[styles.backBtnText, { color: textPri }]}>Cancel</ThemedText>
            </Pressable>
            <Pressable onPress={onSave} disabled={!canSave} style={[styles.saveBtn, { flex: 1, opacity: canSave ? 1 : 0.4 }]}>
              <LinearGradient colors={[ACCENT, '#FF4500']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.saveBtnGrad}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><IconSymbol name="checkmark" size={15} color="#fff" /><ThemedText style={styles.saveBtnText}>Save changes</ThemedText></>
                }
              </LinearGradient>
            </Pressable>
          </View>
        </ScrollView>

        {/* Pickers */}
        {Platform.OS === 'android' && showDatePicker && (
          <DateTimePicker
            value={departAt ?? new Date()}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}
        {Platform.OS === 'android' && showTimePicker && (
          <DateTimePicker
            value={departAt ?? new Date()}
            mode="time"
            display="default"
            is24Hour
            onChange={onTimeChange}
          />
        )}
        {Platform.OS === 'ios' && (showDatePicker || showTimePicker) && (
          <Modal
            transparent
            animationType="fade"
            visible
            onRequestClose={() => { setShowDatePicker(false); setShowTimePicker(false); }}
          >
            <Pressable
              style={styles.pickerBackdrop}
              onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}
            />
            <View style={[styles.pickerSheet, { backgroundColor: cardBg, borderTopColor: hair }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: hair }]}>
                <Pressable onPress={() => { setShowDatePicker(false); setShowTimePicker(false); }}>
                  <ThemedText style={[styles.pickerDone, { color: ACCENT }]}>Done</ThemedText>
                </Pressable>
              </View>
              <DateTimePicker
                value={departAt ?? new Date()}
                mode={showDatePicker ? 'date' : 'time'}
                display="spinner"
                onChange={showDatePicker ? onDateChange : onTimeChange}
                textColor={textPri}
              />
            </View>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1,
  },
  headerBack: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 64 },
  headerBackText: { fontSize: 14, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: -0.2 },
  scroll: { padding: 20, gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  fieldBox: { flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, gap: 10 },
  fieldInput: { flex: 1, fontSize: 14, fontWeight: '700', padding: 0 },
  routeCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  routeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeText: { flex: 1, fontSize: 14, fontWeight: '800' },
  routeDivider: { height: 1, marginLeft: 18 },
  rowFields: { flexDirection: 'row', gap: 12 },
  currencyLabel: { fontSize: 11, fontWeight: '800' },
  noteBox: { borderRadius: 14, borderWidth: 1, padding: 12, minHeight: 90 },
  noteInput: { fontSize: 14, fontWeight: '600', padding: 0, flex: 1 },
  errorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  errorText: { flex: 1, fontSize: 13, fontWeight: '700' },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 50, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  backBtnText: { fontSize: 14, fontWeight: '700' },
  saveBtn: { borderRadius: 14, overflow: 'hidden' },
  saveBtnGrad: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: 10, maxWidth: 360 },
  emptyTitle: { fontSize: 18, fontWeight: '900' },
  emptySub: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  emptyBtn: { borderRadius: 14, overflow: 'hidden', width: '100%', marginTop: 4 },
  emptyBtnGrad: { height: 48, alignItems: 'center', justifyContent: 'center' },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  pickerSheet: { borderTopWidth: 1, paddingBottom: 24 },
  pickerHeader: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  pickerDone: { fontSize: 16, fontWeight: '800' },
}) as any;
