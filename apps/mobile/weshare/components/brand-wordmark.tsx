import { StyleSheet, View } from 'react-native';

import { Brand } from '@/constants/brand';
import { ThemedText } from '@/components/themed-text';

type BrandWordmarkProps = {
  size?: 'sm' | 'md' | 'lg';
};

const SIZES = {
  sm: { we: 22, share: 22 },
  md: { we: 28, share: 28 },
  lg: { we: 36, share: 36 },
} as const;

export function BrandWordmark({ size = 'md' }: BrandWordmarkProps) {
  const fontSize = SIZES[size];

  return (
    <View style={styles.row} accessibilityLabel="WeShare">
      <ThemedText style={[styles.we, { fontSize: fontSize.we }]}>We</ThemedText>
      <ThemedText style={[styles.share, { fontSize: fontSize.share }]}>Share</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  we: {
    color: Brand.textOnNavy,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  share: {
    color: Brand.accent,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
});
