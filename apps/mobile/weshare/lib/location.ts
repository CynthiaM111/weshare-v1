import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

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

/** Device GPS for ride start or complete (after permission is granted). */
export async function getCoordsForRideGps(
  purpose: 'start' | 'complete'
): Promise<{ latitude: number; longitude: number }> {
  const allowed = await ensureForegroundLocation(purpose);
  if (!allowed) {
    throw new Error('LOCATION_PERMISSION_DENIED');
  }
  return getCurrentCoords();
}
