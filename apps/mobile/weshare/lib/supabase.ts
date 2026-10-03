// Hermes/React Native URL + fetch edge cases break supabase-js unless this loads first.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const isWebServer = Platform.OS === 'web' && typeof window === 'undefined';

const serverStorage = {
    getItem: async (_key: string) => null,
    setItem: async (_key: string, _value: string) => {},
    removeItem: async (_key: string) => {},
};

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
        'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Define them in .env at apps/mobile/weshare/ (or apps/mobile/weshare/app/.env), then fully restart Expo (stop and run `npx expo start` again).'
    );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: isWebServer ? serverStorage : AsyncStorage,
        autoRefreshToken: !isWebServer,
        persistSession: !isWebServer,
        detectSessionInUrl: false,
    },
});