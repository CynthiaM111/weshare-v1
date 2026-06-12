import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

import { isGpsDevModeEnabled } from '@/lib/app-env';

/**
 * Ensures foreground location permission and that device location services are on.
 * Prompts to open Settings when permission was denied and cannot be re-requested in-app.
 */
export async function ensureForegroundLocation(purpose: 'start' | 'complete'): Promise<boolean> {
  const servicesOn = await Location.hasServicesEnabledAsync();
  if (!servicesOn) {
    Alert.alert(
      'Turn on location',
      'Enable Location Services on your device to start and complete rides with GPS verification.'
    );
    return false;
  }

  let permission = await Location.getForegroundPermissionsAsync();

  if (permission.status !== 'granted') {
    if (permission.status === 'denied' && !permission.canAskAgain) {
      Alert.alert(
        'Location required',
        `WeShare needs location access to ${purpose === 'start' ? 'start' : 'complete'} the ride. Enable it in Settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ]
      );
      return false;
    }

    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (permission.status === 'granted') return true;

  Alert.alert(
    'Location required',
    `Allow location access when prompted so WeShare can verify you are at the ${purpose === 'start' ? 'pickup' : 'drop-off'} point.`,
    permission.canAskAgain
      ? [{ text: 'OK' }]
      : [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => void Linking.openSettings() },
        ]
  );
  return false;
}

/** Reads the current device position after permission is granted. */
export async function getCurrentCoords(): Promise<{ latitude: number; longitude: number }> {
  const loc = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
}

export type RideGpsCoords = {
  fromLat: number | null;
  fromLng: number | null;
  toLat: number | null;
  toLng: number | null;
};

/**
 * Coordinates for ride start/complete GPS verification.
 * Internal Play build or sandbox + GPS_DEV_MODE uses ride from/to coords; production launch uses device GPS.
 */
export async function getCoordsForRideGps(
  purpose: 'start' | 'complete',
  ride?: RideGpsCoords
): Promise<{ latitude: number; longitude: number }> {
  if (isGpsDevModeEnabled() && ride) {
    const lat = purpose === 'start' ? ride.fromLat : ride.toLat;
    const lng = purpose === 'start' ? ride.fromLng : ride.toLng;
    if (lat != null && lng != null) {
      return { latitude: lat, longitude: lng };
    }
  }

  const allowed = await ensureForegroundLocation(purpose);
  if (!allowed) {
    throw new Error('LOCATION_PERMISSION_DENIED');
  }
  return getCurrentCoords();
}
