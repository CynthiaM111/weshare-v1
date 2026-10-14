import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';
import { Platform } from 'react-native';

const ENCRYPTION_KEY_NAME = 'weshare_session_enc_key_v1';
const ENCRYPTED_PREFIX = 'enc:ctr:v1:';

let cachedKeyBytes: Uint8Array | null = null;

async function getOrCreateEncryptionKey(): Promise<Uint8Array | null> {
  if (Platform.OS === 'web') return null;
  if (cachedKeyBytes) return cachedKeyBytes;

  try {
    const isAvailable = await SecureStore.isAvailableAsync();
    if (!isAvailable) return null;

    let hexKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
    if (!hexKey || hexKey.length !== 64) {
      // Generate a new 256-bit random key
      const randomBytes = new Uint8Array(32);
      if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(randomBytes);
      } else {
        for (let i = 0; i < 32; i++) {
          randomBytes[i] = Math.floor(Math.random() * 256);
        }
      }
      const newHexKey = aesjs.utils.hex.fromBytes(randomBytes);
      await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, newHexKey, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
      });
      hexKey = newHexKey;
    }

    cachedKeyBytes = aesjs.utils.hex.toBytes(hexKey as string);
    return cachedKeyBytes;
  } catch (err) {
    console.warn('[encrypted-storage] SecureStore unavailable, falling back to AsyncStorage', err);
    return null;
  }
}

function encryptText(text: string, keyBytes: Uint8Array): string {
  const aesCtr = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(5));
  const textBytes = aesjs.utils.utf8.toBytes(text);
  const encryptedBytes = aesCtr.encrypt(textBytes);
  return ENCRYPTED_PREFIX + aesjs.utils.hex.fromBytes(encryptedBytes);
}

function decryptText(cipherText: string, keyBytes: Uint8Array): string | null {
  try {
    const hex = cipherText.slice(ENCRYPTED_PREFIX.length);
    const encryptedBytes = aesjs.utils.hex.toBytes(hex);
    const aesCtr = new aesjs.ModeOfOperation.ctr(keyBytes, new aesjs.Counter(5));
    const decryptedBytes = aesCtr.decrypt(encryptedBytes);
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  } catch (err) {
    console.error('[encrypted-storage] Decryption failed', err);
    return null;
  }
}

/**
 * Encrypted storage adapter for Supabase client:
 * Combines hardware-backed key storage (expo-secure-store) with payload storage (AsyncStorage)
 * to bypass 2KB Keychain limits while maintaining encryption at rest and seamless migration.
 */
export const encryptedStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) return null;

      const keyBytes = await getOrCreateEncryptionKey();
      if (!keyBytes) {
        return raw;
      }

      // If already encrypted, decrypt it
      if (raw.startsWith(ENCRYPTED_PREFIX)) {
        return decryptText(raw, keyBytes);
      }

      // Seamless migration of existing plaintext session:
      // Encrypt in-place so future reads use ciphertext
      try {
        const encrypted = encryptText(raw, keyBytes);
        await AsyncStorage.setItem(key, encrypted);
      } catch (migrationErr) {
        console.warn('[encrypted-storage] In-place migration failed:', migrationErr);
      }

      return raw;
    } catch (err) {
      console.error('[encrypted-storage] getItem error:', err);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      const keyBytes = await getOrCreateEncryptionKey();
      if (!keyBytes) {
        await AsyncStorage.setItem(key, value);
        return;
      }

      const encrypted = encryptText(value, keyBytes);
      await AsyncStorage.setItem(key, encrypted);
    } catch (err) {
      console.error('[encrypted-storage] setItem error:', err);
      await AsyncStorage.setItem(key, value);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.error('[encrypted-storage] removeItem error:', err);
    }
  },
};
