import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

const TEAL = '#00C9B1';

export function DriverVerifiedBadge({ compact }: { compact?: boolean }) {
  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <IconSymbol name="checkmark.seal.fill" size={compact ? 11 : 13} color={TEAL} />
      <ThemedText style={[styles.text, compact && styles.textCompact]}>Verified driver</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: TEAL + '18',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  text: {
    color: TEAL,
    fontSize: 11,
    fontWeight: '800',
  },
  textCompact: {
    fontSize: 10,
  },
});
