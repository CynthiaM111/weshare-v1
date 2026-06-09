import * as SplashScreen from 'expo-splash-screen';

/** Call as early as possible so Expo Go / Router do not auto-hide before our UI mounts. */
export const splashPrevented = SplashScreen.preventAutoHideAsync().catch(() => {
  /* Already hidden in some dev clients */
});
