/**
 * Screen safe area — omits top inset so a header can extend under the status bar
 * with one continuous background (avoids bg vs cardBg seam at the top).
 */

import * as SystemUI from 'expo-system-ui';
import { useEffect, type ReactNode } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenSafeAreaProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Background for scroll/content below the header. */
  backgroundColor: string;
  /**
   * Status bar / top inset fill. Use header surface color when the screen has a card header.
   * Defaults to backgroundColor.
   */
  topBackgroundColor?: string;
};

export function ScreenSafeArea({
  children,
  style,
  backgroundColor,
  topBackgroundColor,
}: ScreenSafeAreaProps) {
  const topBg = topBackgroundColor ?? backgroundColor;

  useEffect(() => {
    if (Platform.OS === 'android') {
      void SystemUI.setBackgroundColorAsync(topBg);
    }
  }, [topBg]);

  return (
    <SafeAreaView
      style={[{ flex: 1, backgroundColor }, style]}
      edges={['left', 'right', 'bottom']}
    >
      {children}
    </SafeAreaView>
  );
}
