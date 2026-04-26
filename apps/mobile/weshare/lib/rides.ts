import AsyncStorage from '@react-native-async-storage/async-storage';

export type RideCoord = { latitude: number; longitude: number };

export type Ride = {
  id: string;
  from: string;
  to: string;
  departAtISO: string; // ISO string
  seats: number;
  priceRwf?: number;
  note?: string;
  postedByUserId?: string;
  fromCoord?: RideCoord;
  toCoord?: RideCoord;
  createdAtISO: string;
};

// Note: earlier builds used a misspelled storage key ("rids").
// We keep backward compatibility by reading both and migrating forward.
const STORAGE_KEY = 'weshare:rides:v1';
const LEGACY_STORAGE_KEY = 'weshare:rids:v1';

function newId() {
  return `ride_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listRides(): Promise<Ride[]> {
  const [raw, legacyRaw] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEY),
    AsyncStorage.getItem(LEGACY_STORAGE_KEY),
  ]);

  const parsed = safeParseArray(raw);
  const legacyParsed = safeParseArray(legacyRaw);

  // Merge & de-duplicate by id (prefer current).
  const byId = new Map<string, Ride>();
  for (const r of legacyParsed) byId.set(r.id, r);
  for (const r of parsed) byId.set(r.id, r);

  const merged = Array.from(byId.values());
  merged.sort((a, b) => (b.createdAtISO ?? '').localeCompare(a.createdAtISO ?? ''));

  // One-time migrate legacy -> current key (best effort).
  if (legacyParsed.length && !parsed.length) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }

  return merged;
}

export async function saveRide(input: Omit<Ride, 'id' | 'createdAtISO'>): Promise<Ride> {
  const ride: Ride = {
    ...input,
    id: newId(),
    createdAtISO: new Date().toISOString(),
  };
  const rides = await listRides();
  const next = [ride, ...rides];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return ride;
}

export async function getRide(id: string): Promise<Ride | null> {
  const rides = await listRides();
  return rides.find((r) => r.id === id) ?? null;
}

export async function listRidesByUser(userId: string): Promise<Ride[]> {
  const rides = await listRides();
  return rides.filter((r) => r.postedByUserId === userId);
}

export async function clearRides() {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEY),
    AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
  ]);
}

function safeParseArray(raw: string | null): Ride[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Ride[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

