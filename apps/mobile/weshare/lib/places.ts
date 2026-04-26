export type PlaceSuggestion = {
  id: string;
  primaryText: string;
  secondaryText?: string;
  fullText: string;
  source: 'google';
};

export type LatLng = { latitude: number; longitude: number };

export type OsmSuggestion = {
  id: string;
  fullText: string;
  coords: LatLng;
  source: 'osm';
};

function apiKey() {
  // Set this in `.env` or your EAS env:
  // EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
  return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
}

export function hasPlacesKey() {
  return Boolean(apiKey());
}

export async function googlePlacesAutocomplete(opts: {
  input: string;
  country?: string; // e.g. 'rw'
  locationBias?: LatLng;
  radiusMeters?: number;
  limit?: number;
}): Promise<PlaceSuggestion[]> {
  const key = apiKey();
  if (!key) return [];

  const params = new URLSearchParams();
  params.set('input', opts.input);
  params.set('key', key);
  params.set('language', 'en');
  if (opts.country) params.set('components', `country:${opts.country}`);
  if (opts.locationBias) {
    params.set('location', `${opts.locationBias.latitude},${opts.locationBias.longitude}`);
    params.set('radius', String(opts.radiusMeters ?? 40000));
  }

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`);
  if (!res.ok) return [];
  const json = (await res.json()) as any;
  const preds: any[] = json?.predictions ?? [];
  const limit = opts.limit ?? 6;

  return preds.slice(0, limit).map((p) => {
    const structured = p.structured_formatting ?? {};
    const primaryText = structured.main_text ?? p.description ?? '';
    const secondaryText = structured.secondary_text;
    return {
      id: p.place_id,
      primaryText,
      secondaryText,
      fullText: p.description ?? primaryText,
      source: 'google' as const,
    };
  });
}

export async function googlePlaceDetails(placeId: string): Promise<{ coords: LatLng; formattedAddress: string } | null> {
  const key = apiKey();
  if (!key) return null;

  const params = new URLSearchParams();
  params.set('place_id', placeId);
  params.set('fields', 'geometry/location,formatted_address,name');
  params.set('key', key);

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`);
  if (!res.ok) return null;
  const json = (await res.json()) as any;
  const result = json?.result;
  const loc = result?.geometry?.location;
  const formatted = result?.formatted_address ?? result?.name;
  if (loc?.lat == null || loc?.lng == null || !formatted) return null;
  return {
    coords: { latitude: loc.lat, longitude: loc.lng },
    formattedAddress: formatted,
  };
}

function nominatimHeaders() {
  // Nominatim usage policy asks for a valid User-Agent / Referer.
  // On device, we keep this lightweight.
  return {
    'Accept-Language': 'en',
  } as Record<string, string>;
}

async function nominatimSearch(opts: {
  q: string;
  countrycodes?: string; // comma-separated
  viewbox?: string; // "left,top,right,bottom" (lon/lat)
  bounded?: boolean;
  limit?: number;
}): Promise<OsmSuggestion[]> {
  const params = new URLSearchParams();
  params.set('format', 'jsonv2');
  params.set('addressdetails', '1');
  params.set('q', opts.q);
  params.set('limit', String(opts.limit ?? 6));
  if (opts.countrycodes) params.set('countrycodes', opts.countrycodes);
  if (opts.viewbox) params.set('viewbox', opts.viewbox);
  if (opts.bounded) params.set('bounded', '1');

  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: nominatimHeaders(),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as any[];
  if (!Array.isArray(json)) return [];

  return json
    .map((r) => {
      const lat = Number(r.lat);
      const lon = Number(r.lon);
      const name = r.display_name as string | undefined;
      const osmId = r.osm_id ? String(r.osm_id) : `${lat},${lon}`;
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !name) return null;
      return {
        id: `osm:${osmId}`,
        fullText: name,
        coords: { latitude: lat, longitude: lon },
        source: 'osm' as const,
      };
    })
    .filter(Boolean) as OsmSuggestion[];
}

/**
 * Autocomplete via OpenStreetMap Nominatim (no key required).
 * Prioritizes Rwanda first, then East Africa.
 */
export async function nominatimAutocomplete(opts: { input: string; limit?: number }): Promise<OsmSuggestion[]> {
  const q = opts.input.trim();
  if (q.length < 3) return [];

  // Rwanda bounding box (approx): lon 28.86..30.90, lat -2.84..-1.05
  const rwViewBox = '28.86,-1.05,30.90,-2.84';
  const rw = await nominatimSearch({
    q,
    countrycodes: 'rw',
    viewbox: rwViewBox,
    bounded: true,
    limit: opts.limit ?? 6,
  });
  if (rw.length) return rw;

  // East Africa (looser): Rwanda, Uganda, Kenya, Tanzania, Burundi, South Sudan, Ethiopia
  return await nominatimSearch({
    q,
    countrycodes: 'rw,ug,ke,tz,bi,ss,et',
    limit: opts.limit ?? 6,
  });
}

export async function nominatimReverse(coords: LatLng): Promise<string | null> {
  const params = new URLSearchParams();
  params.set('format', 'jsonv2');
  params.set('lat', String(coords.latitude));
  params.set('lon', String(coords.longitude));
  params.set('zoom', '18');
  params.set('addressdetails', '1');
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    headers: nominatimHeaders(),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as any;
  const name = json?.display_name;
  if (!name || typeof name !== 'string') return null;
  return name;
}

