/** Native (Expo Go / dev client): photo pick disabled until an internal EAS build enables it. */

export type PickedVerificationImage = { uri: string; mimeType: string };

/** True when the build includes a photo picker (set EXPO_PUBLIC_DRIVER_PHOTOS=true + native module at internal build). */
export function isVerificationPhotoPickAvailable(): boolean {
  return process.env.EXPO_PUBLIC_DRIVER_PHOTOS === 'true';
}

export async function pickVerificationImage(): Promise<PickedVerificationImage | null> {
  return null;
}
