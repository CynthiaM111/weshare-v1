import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoMark from '@/components/LogoMark';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Radii, Spacing } from './app-styles';

export function AppHeader({
  title,
  subtitle,
  left,
  right,
}: {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const text = useThemeColor({}, 'text');
  const subText = useThemeColor({ light: 'rgba(17,24,28,0.70)', dark: 'rgba(236,237,238,0.72)' }, 'text');
  return (
    <ThemedView style={[styles.header, { paddingTop: insets.top + 10 }]} lightColor="transparent" darkColor="transparent">
      <View style={styles.side}>{left}</View>
      <View style={styles.center}>
        <LogoMark size={28} />
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.title, { color: text }]} numberOfLines={1}>
            {title}
          </ThemedText>
          {subtitle ? (
            <ThemedText style={[styles.subtitle, { color: subText }]} numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
      </View>
      <View style={styles.side}>{right}</View>
    </ThemedView>
  );
}

export function HeaderIconButton({
  iconName,
  onPress,
  accessibilityLabel,
}: {
  iconName: string;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const hairline = useThemeColor({ light: 'rgba(15,23,42,0.10)', dark: 'rgba(236,237,238,0.14)' }, 'background');
  const icon = useThemeColor({}, 'icon');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[styles.iconBtn, { borderColor: hairline }]}
    >
      <IconSymbol name={iconName as any} size={20} color={icon} />
    </Pressable>
  );
}

export function HeaderSpacer() {
  // Keep layout aligned without drawing a box.
  return <View style={styles.spacer} />;
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing.screenX,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  side: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontWeight: '900', lineHeight: 22 },
  subtitle: { marginTop: 2, fontSize: 12, lineHeight: 16, fontWeight: '600', opacity: 0.82 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: 44,
    height: 44,
  },
});

