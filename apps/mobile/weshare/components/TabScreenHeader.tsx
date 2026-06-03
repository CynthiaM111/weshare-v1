/**
 * Single-row tab header: title on the left, optional icon CTA + notification bell on the right.
 */

import { LinearGradient } from 'expo-linear-gradient';
import { type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationBellButton } from '@/components/NotificationBell';

/** Space below the status bar before the title row. */
export function screenHeaderPaddingTop(insetTop: number) {
  return insetTop + 14;
}
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

type IconName = ComponentProps<typeof IconSymbol>['name'];

type HeaderIconActionProps = {
  onPress: () => void;
  colors: [string, string];
  icon: IconName;
  accessibilityLabel: string;
};

/** Icon-only header button (40×40), pairs with the inline notification bell. */
export function HeaderIconAction({ onPress, colors, icon, accessibilityLabel }: HeaderIconActionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.iconAction}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.iconActionGrad}>
        <IconSymbol name={icon} size={20} color="#fff" />
      </LinearGradient>
    </Pressable>
  );
}

type TabScreenHeaderProps = {
  title: string;
  textPri: string;
  hair: string;
  cardBg: string;
  action?: ReactNode;
};

export function TabScreenHeader({
  title,
  textPri,
  hair,
  cardBg,
  action,
}: TabScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: screenHeaderPaddingTop(insets.top),
          borderBottomColor: hair,
          backgroundColor: cardBg,
        },
      ]}
    >
      <ThemedText style={[styles.title, { color: textPri }]} numberOfLines={1}>
        {title}
      </ThemedText>
      <View style={styles.trailing}>
        {action}
        <NotificationBellButton variant="inline" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    minHeight: 52,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    minWidth: 0,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  iconAction: { borderRadius: 20, overflow: 'hidden' },
  iconActionGrad: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
