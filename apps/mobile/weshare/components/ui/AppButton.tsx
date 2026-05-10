import { Pressable, StyleSheet, type PressableProps, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { AQUAFINA, Radii } from './app-styles';

export function PrimaryButton({
  title,
  left,
  disabled,
  style,
  ...props
}: PressableProps & { title: string; left?: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.primary,
        { opacity: disabled ? 0.55 : pressed ? 0.9 : 1, backgroundColor: AQUAFINA },
        style as any,
      ]}
      {...props}
    >
      {left ? <View style={styles.left}>{left}</View> : null}
      <ThemedText style={styles.primaryText}>{title}</ThemedText>
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  left,
  right,
  danger,
  disabled,
  style,
  ...props
}: PressableProps & {
  title: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  const hairline = useThemeColor({ light: 'rgba(15,23,42,0.10)', dark: 'rgba(236,237,238,0.14)' }, 'background');
  const text = useThemeColor({}, 'text');
  const color = danger ? '#EF4444' : text;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.secondary,
        { borderColor: hairline, opacity: disabled ? 0.55 : pressed ? 0.92 : 1 },
        style as any,
      ]}
      {...props}
    >
      <View style={styles.secondaryLeft}>
        {left}
        <ThemedText style={[styles.secondaryText, { color }]}>{title}</ThemedText>
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    height: 54,
    borderRadius: Radii.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  left: { marginRight: 2 },
  primaryText: { color: 'white', fontSize: 15, fontWeight: '900' },
  secondary: {
    height: 52,
    borderRadius: Radii.button,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  secondaryText: { fontSize: 14, fontWeight: '900' },
});

