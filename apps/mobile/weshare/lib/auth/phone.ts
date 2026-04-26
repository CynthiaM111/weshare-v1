export type NormalizedRwandanPhone = `+2507${string}`;

/**
 * Normalizes common RW inputs into E.164 `+2507XXXXXXXX`.
 * Accepts:
 * - +250 7XX XXX XXX
 * - +2507XXXXXXXX
 * - 07XXXXXXXX
 * - 7XXXXXXXX
 */
export function normalizeRwandanPhone(input: string): NormalizedRwandanPhone | null {
  const digits = input.replace(/[^\d+]/g, '').replace(/[^\d]/g, '');

  let national: string | null = null;

  if (digits.startsWith('250')) {
    national = digits.slice(3);
  } else if (digits.startsWith('0')) {
    national = digits.slice(1);
  } else {
    national = digits;
  }

  // Rwanda mobile numbers are 9 digits and start with 7.
  if (!/^[7]\d{8}$/.test(national)) return null;
  return (`+250${national}` as NormalizedRwandanPhone);
}

export function isValidRwandanPhone(input: string): boolean {
  return normalizeRwandanPhone(input) != null;
}

/** Formats a normalized number as `+250 7XX XXX XXX`. */
export function formatRwandanPhoneDisplay(normalized: NormalizedRwandanPhone): string {
  const national = normalized.replace('+250', ''); // 7XXXXXXXX
  return `+250 ${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6, 9)}`;
}

