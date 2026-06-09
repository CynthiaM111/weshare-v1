import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { CarColorIcon } from '@/components/CarColorIcon';
import { DriverVerifiedBadge } from '@/components/DriverVerifiedBadge';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { RideDriverPublic, RideDriverWithContact } from '@/lib/ride-drivers';

const TEAL = '#00C9B1';

type Props = {
  driver: RideDriverPublic | RideDriverWithContact;
  showContact?: boolean;
  textPri: string;
  textSub: string;
  hair: string;
  cardBg?: string;
};

function formatPhoneDisplay(e164: string) {
  const raw = e164.trim();
  if (raw.startsWith('+250')) return `+250 ${raw.slice(4)}`;
  return raw;
}

export function DriverSummaryCard({
  driver,
  showContact = false,
  textPri,
  textSub,
  hair,
  cardBg,
}: Props) {
  const contact = showContact && 'phoneE164' in driver
    ? (driver as RideDriverWithContact)
    : null;
  const hasBookingDetails = Boolean(contact && (contact.phoneE164 || contact.licensePlate));
  const displayName = contact?.fullName?.trim() || driver.displayName;

  return (
    <View style={[styles.card, { borderColor: hair, backgroundColor: cardBg ?? 'transparent' }]}>
      <CarColorIcon color={driver.carColor} size={44} />
      <View style={styles.body}>
        <ThemedText style={[styles.name, { color: textPri }]} numberOfLines={1}>
          {displayName}
        </ThemedText>
        {driver.driverVerified ? <DriverVerifiedBadge compact /> : null}
        <ThemedText style={[styles.carLine, { color: textSub }]} numberOfLines={1}>
          {driver.carModel} · {driver.carColor}
        </ThemedText>
        {hasBookingDetails && contact?.licensePlate ? (
          <ThemedText style={[styles.plateLine, { color: textPri }]} numberOfLines={1}>
            Plate {contact.licensePlate}
          </ThemedText>
        ) : null}
        {contact?.phoneE164 ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${contact.phoneE164}`)}
            style={[styles.phoneRow, { backgroundColor: TEAL + '14' }]}
          >
            <IconSymbol name="phone.fill" size={14} color={TEAL} />
            <ThemedText style={styles.phoneText}>{formatPhoneDisplay(contact.phoneE164)}</ThemedText>
          </Pressable>
        ) : !hasBookingDetails ? (
          <ThemedText style={[styles.hiddenContact, { color: textSub }]}>
            Plate & driver contact shared after you book
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  body: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: '900' },
  carLine: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  plateLine: { fontSize: 13, fontWeight: '800', marginTop: 2, letterSpacing: 0.3 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  phoneText: { color: TEAL, fontSize: 13, fontWeight: '800' },
  hiddenContact: { fontSize: 11, fontWeight: '600', marginTop: 4, fontStyle: 'italic' },
});
