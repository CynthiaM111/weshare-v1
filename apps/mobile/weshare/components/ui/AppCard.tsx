import { StyleSheet, View, type ViewProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { Radii } from './app-styles';

export function AppCard({ style, ...props }: ViewProps) {
  const hairline = useThemeColor({ light: 'rgba(15,23,42,0.10)', dark: 'rgba(236,237,238,0.14)' }, 'background');
  const surface = useThemeColor({ light: '#FFFFFF', dark: '#202227' }, 'background');
  return <View style={[styles.card, { backgroundColor: surface, borderColor: hairline }, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.card,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
});

