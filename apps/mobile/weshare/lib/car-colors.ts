/** Map free-text car color to a display hex (Uber-style car icon tint). */
const COLOR_MAP: Record<string, string> = {
  white: '#F5F5F5',
  black: '#1A1A1A',
  silver: '#C0C0C0',
  grey: '#808080',
  gray: '#808080',
  red: '#DC2626',
  blue: '#2563EB',
  green: '#16A34A',
  yellow: '#EAB308',
  orange: '#EA580C',
  brown: '#92400E',
  beige: '#D4C4A8',
  gold: '#CA8A04',
  navy: '#1E3A5F',
  maroon: '#7F1D1D',
  purple: '#7C3AED',
  pink: '#DB2777',
  cream: '#FFFDD0',
  bronze: '#CD7F32',
};

export function carColorToHex(raw: string | null | undefined): string {
  const key = (raw ?? '').trim().toLowerCase();
  if (!key) return '#64748B';
  if (COLOR_MAP[key]) return COLOR_MAP[key];
  if (key.startsWith('#') && /^#[0-9A-Fa-f]{3,8}$/.test(key)) return key;
  for (const [name, hex] of Object.entries(COLOR_MAP)) {
    if (key.includes(name)) return hex;
  }
  return '#64748B';
}

export const CAR_COLOR_SUGGESTIONS = [
  'White',
  'Black',
  'Silver',
  'Grey',
  'Red',
  'Blue',
  'Green',
  'Yellow',
  'Orange',
  'Brown',
  'Beige',
  'Gold',
  'Navy',
  'Maroon',
  'Purple',
] as const;
