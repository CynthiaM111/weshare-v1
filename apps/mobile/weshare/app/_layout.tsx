import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SessionExpiredScreen } from '@/components/SessionExpiredScreen';
import { SplashView } from '@/components/SplashView';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSplashReady } from '@/hooks/use-splash-ready';
import { SessionProvider, useSession } from '@/hooks/use-session';
import { syncDeviceNotifications } from '@/lib/device-notifications';
import { splashPrevented } from '@/lib/splash';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigator() {
  const { loading, session, sessionExpired, dismissSessionExpired } = useSession();
  const showSplash = useSplashReady(loading);
  const userId = session?.userId;

  useEffect(() => {
    if (!userId) return;
    void syncDeviceNotifications(userId);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncDeviceNotifications(userId);
    });
    return () => sub.remove();
  }, [userId]);

  useEffect(() => {
    if (!showSplash) {
      void splashPrevented.then(() => SplashScreen.hideAsync());
    }
  }, [showSplash]);

  return (
    <View style={styles.root}>
      <StatusBar style={showSplash ? 'light' : 'auto'} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <SessionExpiredScreen visible={sessionExpired} onDismiss={dismissSessionExpired} />
      {showSplash ? (
        <SplashView showSpinner={loading} style={styles.splashOverlay} />
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
        </ThemeProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
