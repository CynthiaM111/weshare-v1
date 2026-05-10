export type PlaceSuggestion = {
  id: string;
  shortLabel: string;  // bold line shown in UI — e.g. "Kimironko Market"
  subLabel: string;    // muted line shown in UI — e.g. "Kigali"
  fullAddress: string; // stored in DB, never shown
  coords?: { latitude: number; longitude: number };
  source: 'google' | 'osm';
};

const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export function hasPlacesKey(): boolean {
  return Boolean(GOOGLE_KEY);
}

function parseLabels(fullText: string): { shortLabel: string; subLabel: string } {
  const parts = fullText.split(',').map(p => p.trim()).filter(Boolean);
  const shortLabel = parts[0] ?? fullText;
  const sub = parts
    .slice(1)
    .filter(p => p.toLowerCase() !== 'rwanda' && p.length > 1)
    .slice(0, 2)
    .join(', ');
  return { shortLabel, subLabel: sub };
}

// ─── Google Places (New API v1) ───────────────────────────────────────────────

type GoogleResult = {
  id: string;
  fullText: string;
  shortLabel: string;
  subLabel: string;
};

export async function googlePlacesAutocomplete(opts: {
  input: string;
  country?: string;
  locationBias?: { latitude: number; longitude: number };
  limit?: number;
}): Promise<GoogleResult[]> {
  if (!GOOGLE_KEY) return [];

  const body: Record<string, any> = {
    input: opts.input,
    languageCode: 'en',
  };

  if (opts.country) body.includedRegionCodes = [opts.country];

  if (opts.locationBias) {
    body.locationBias = {
      circle: {
        center: {
          latitude: opts.locationBias.latitude,
          longitude: opts.locationBias.longitude,
        },
      },
    };
  }

  try {
    const res = await fetch(
      'https://places.googleapis.com/v1/places:autocomplete',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_KEY,
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[Places] Google autocomplete error:', res.status, errText);
      return [];
    }

    const json = await res.json();
    const suggestions = json.suggestions ?? [];

    return suggestions
      .slice(0, opts.limit ?? 6)
      .map((s: any) => {
        const prediction = s.placePrediction;
        const fullText: string =
          prediction?.text?.text ??
          prediction?.structuredFormat?.mainText?.text ?? '';
        const { shortLabel, subLabel } = parseLabels(fullText);
        return { id: prediction?.placeId ?? '', fullText, shortLabel, subLabel };
      })
      .filter((s: GoogleResult) => s.id && s.fullText);
  } catch (e) {
    console.warn('[Places] Google autocomplete threw:', e);
    return [];
  }
}

export async function googlePlaceDetails(placeId: string): Promise<{
  formattedAddress: string;
  shortLabel: string;
  subLabel: string;
  coords: { latitude: number; longitude: number };
} | null> {
  if (!GOOGLE_KEY) return null;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${placeId}?fields=formattedAddress,location`,
      {
        headers: {
          'X-Goog-Api-Key': GOOGLE_KEY,
          'X-Goog-FieldMask': 'formattedAddress,location',
        },
      }
    );

    if (!res.ok) {
      console.warn('[Places] Google place details error:', res.status);
      return null;
    }

    const json = await res.json();
    const addr: string = json.formattedAddress ?? '';
    const loc = json.location;
    if (!loc) return null;

    const { shortLabel, subLabel } = parseLabels(addr);
    return {
      formattedAddress: addr,
      shortLabel,
      subLabel,
      coords: { latitude: loc.latitude, longitude: loc.longitude },
    };
  } catch (e) {
    console.warn('[Places] Google place details threw:', e);
    return null;
  }
}

// ─── Nominatim OSM fallback ───────────────────────────────────────────────────

export async function nominatimAutocomplete(opts: {
  input: string;
  limit?: number;
}): Promise<PlaceSuggestion[]> {
  try {
    const params = new URLSearchParams({
      q: opts.input,
      format: 'json',
      addressdetails: '1',
      limit: String(opts.limit ?? 6),
      countrycodes: 'rw',
    });

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'WeShare/1.0' } }
    );

    if (!res.ok) {
      console.warn('[Places] Nominatim error:', res.status);
      return [];
    }

    const json = await res.json();
    const rows = Array.isArray(json) ? json : [];

    return (rows as any[]).map((item) => {
      const fullAddress: string = item.display_name ?? '';
      const { shortLabel, subLabel } = parseLabels(fullAddress);
      return {
        id: String(item.place_id),
        shortLabel,
        subLabel,
        fullAddress,
        coords: {
          latitude: parseFloat(item.lat),
          longitude: parseFloat(item.lon),
        },
        source: 'osm' as const,
      };
    });
  } catch (e) {
    console.warn('[Places] Nominatim threw:', e);
    return [];
  }
}

// ─── Combined autocomplete with proper fallback ───────────────────────────────
// Use this instead of calling googlePlacesAutocomplete directly in index.tsx
// It tries Google first, falls back to Nominatim if Google returns nothing.

export async function autocomplete(
  input: string,
  limit = 6
): Promise<PlaceSuggestion[]> {
  const q = input.trim();
  if (q.length < 2) return [];

  let out: PlaceSuggestion[] = [];

  if (hasPlacesKey()) {
    const rw = await googlePlacesAutocomplete({
      input: q,
      country: 'rw',
      locationBias: { latitude: -1.9441, longitude: 30.0619 },
      limit,
    });
    if (rw.length) {
      out = rw.map((p) => ({
        id: p.id,
        shortLabel: p.shortLabel,
        subLabel: p.subLabel,
        fullAddress: p.fullText,
        source: 'google' as const,
      }));
    }

    if (out.length === 0) {
      const ea = await googlePlacesAutocomplete({
        input: q,
        locationBias: { latitude: -1.9441, longitude: 30.0619 },
        limit,
      });
      if (ea.length) {
        out = ea.map((p) => ({
          id: p.id,
          shortLabel: p.shortLabel,
          subLabel: p.subLabel,
          fullAddress: p.fullText,
          source: 'google' as const,
        }));
      }
    }
  }

  if (out.length > 0) {
    return out;
  }

  return nominatimAutocomplete({ input: q, limit });
}

// ─── Directions ───────────────────────────────────────────────────────────────

export type LatLng = { latitude: number; longitude: number };

export function decodePolyline(encoded: string): LatLng[] {
  let index = 0;
  const len = encoded.length;
  let lat = 0, lng = 0;
  const out: LatLng[] = [];

  while (index < len) {
    let b = 0, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    out.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return out;
}

export async function fetchRoutePolyline(
  origin: LatLng,
  destination: LatLng
): Promise<LatLng[]> {
  const straightLine = (): LatLng[] => [origin, destination];
  if (!GOOGLE_KEY) return straightLine();

  try {
    const params = new URLSearchParams({
      origin: `${origin.latitude},${origin.longitude}`,
      destination: `${destination.latitude},${destination.longitude}`,
      key: GOOGLE_KEY,
      region: 'rw',
      mode: 'driving',
    });

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`
    );
    if (!res.ok) {
      console.warn('[Places] Directions HTTP error:', res.status);
      return straightLine();
    }

    const json = await res.json();
    const status: string | undefined = json?.status;

    // OK paths without polyline or empty routes — fall back silently (straight line).
    if (status !== 'OK' || !Array.isArray(json.routes) || json.routes.length === 0) {
      return straightLine();
    }

    const points = json.routes[0]?.overview_polyline?.points as string | undefined;
    if (!points || typeof points !== 'string') {
      return straightLine();
    }

    const decoded = decodePolyline(points);
    return decoded.length ? decoded : straightLine();
  } catch (e) {
    console.warn('[Places] Directions error:', e);
    return straightLine();
  }
}