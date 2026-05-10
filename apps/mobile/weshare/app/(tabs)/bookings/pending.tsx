import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { loadSession } from '@/lib/auth/session';
import { getUserById, type UserProfile } from '@/lib/auth/users';
import { getBooking, updateBooking, type Booking } from '@/lib/bookings';
import { AppCard } from '@/components/ui/AppCard';
import { SecondaryButton } from '@/components/ui/AppButton';
import { AppHeader, HeaderIconButton, HeaderSpacer } from '@/components/ui/AppHeader';

function formatWhen(iso: string) {
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

export default function BookingPendingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : '';

  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const icon = useThemeColor({}, 'icon');
  const hairline = useThemeColor({ light: 'rgba(15,23,42,0.10)', dark: 'rgba(236,237,238,0.14)' }, 'background');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#202227' }, 'background');
  const subText = useThemeColor({ light: 'rgba(17,24,28,0.68)', dark: 'rgba(236,237,238,0.72)' }, 'text');

  const [booking, setBooking] = useState<Booking | null>(null);
  const [driver, setDriver] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const s = await loadSession();
      if (cancelled) return;
      if (!s) {
        router.replace({ pathname: '/auth', params: { redirect: `/bookings/pending?bookingId=${encodeURIComponent(bookingId)}` } });
        return;
      }
      const b = bookingId ? await getBooking(bookingId) : null;
      if (cancelled) return;
      setBooking(b);
      if (b?.driverUserId) {
        const u = await getUserById(b.driverUserId);
        if (!cancelled) setDriver(u);
      } else {
        setDriver(null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId, router]);

  const pending = useMemo(() => booking?.status === 'pending', [booking]);

  async function onCancel() {
    if (!booking || !pending || cancelling) return;
    Alert.alert('Cancel request?', 'You can cancel while waiting for driver confirmation.', [
      { text: 'Keep waiting', style: 'cancel' },
      {
        text: 'Cancel request',
        style: 'destructive',
        onPress: async () => {
          setCancelling(true);
          try {
            const next = await updateBooking(booking.id, { status: 'cancelled' });
            setBooking(next);
            router.replace('/my-bookings');
          } finally {
            setCancelling(false);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: background }]} edges={['left', 'right', 'bottom']}>
      <AppHeader
        title="WeShare"
        subtitle="Booking request"
        left={<HeaderIconButton iconName="chevron.left" accessibilityLabel="Back" onPress={() => router.back()} />}
        right={<HeaderSpacer />}
      />

      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: Math.max(16, insets.bottom + 16) }]}>
        {loading ? (
          <AppCard>
            <ThemedText style={[styles.meta, { color: subText }]}>Loading…</ThemedText>
          </AppCard>
        ) : !booking ? (
          <AppCard>
            <ThemedText style={[styles.meta, { color: subText }]}>Booking not found.</ThemedText>
          </AppCard>
        ) : (
          <>
            <AppCard>
              <View style={styles.pendingRow}>
                <ActivityIndicator color="#00AEEF" />
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.pendingTitle, { color: text }]}>
                    {pending ? 'Waiting for driver confirmation' : booking.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}
                  </ThemedText>
                  <ThemedText style={[styles.pendingSub, { color: subText }]}>
                    {pending ? 'We’ll notify you once the driver responds.' : 'Status updated.'}
                  </ThemedText>
                </View>
              </View>
            </AppCard>

            <AppCard>
              <ThemedText style={[styles.sectionTitle, { color: text }]}>Driver</ThemedText>
              <View style={styles.row}>
                <IconSymbol name="person.circle.fill" size={28} color={icon} />
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.primaryValue, { color: text }]} numberOfLines={1}>
                    {driver?.fullName ?? 'Driver'}
                  </ThemedText>
                  <ThemedText style={[styles.secondaryValue, { color: subText }]} numberOfLines={1}>
                    {driver?.phoneE164 ?? '—'}
                  </ThemedText>
                </View>
              </View>
            </AppCard>

            <AppCard>
              <ThemedText style={[styles.sectionTitle, { color: text }]}>Ride</ThemedText>
              <Row label="Route" value={`${booking.from} → ${booking.to}`} text={text} subText={subText} />
              <Row label="Departure" value={formatWhen(booking.departAtISO)} text={text} subText={subText} />
              <Row label="Seats" value={`${booking.seatsAtBooking}`} text={text} subText={subText} />
              <Row label="Price" value={booking.priceRwf ? `${booking.priceRwf} RWF / seat` : '—'} text={text} subText={subText} />
            </AppCard>

            {pending ? (
              <SecondaryButton
                title={cancelling ? 'Cancelling…' : 'Cancel request'}
                onPress={onCancel}
                disabled={cancelling}
                danger
                right={<IconSymbol name="trash" size={18} color="#EF4444" />}
              />
            ) : null}
          </>
        )}
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
    <View style={styles.rowBlock}>
      <ThemedText style={[styles.label, { color: subText }]}>{label}</ThemedText>
      <ThemedText style={[styles.value, { color: text }]} numberOfLines={3}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingHorizontal: 16, gap: 12 },
  meta: { fontSize: 13, fontWeight: '700', opacity: 0.9 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pendingTitle: { fontSize: 14, fontWeight: '900' },
  pendingSub: { marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: '700', opacity: 0.88 },
  sectionTitle: { fontSize: 14, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowBlock: { gap: 4 },
  label: { fontSize: 12, fontWeight: '800', opacity: 0.9 },
  value: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  primaryValue: { fontSize: 14, fontWeight: '900' },
  secondaryValue: { fontSize: 12, fontWeight: '700', opacity: 0.85 },
});

