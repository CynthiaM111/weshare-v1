/**
 * Normalises a phone number to E.164 format.
 * Defaults to Rwanda (+250) if no country code is detected.
 */
export function toE164(raw: string, defaultCountry = '250'): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Already has a leading +
  if (raw.trimStart().startsWith('+')) {
    return digits.length >= 8 ? `+${digits}` : null;
  }

  // Starts with 00 (international prefix)
  if (digits.startsWith('00')) {
    const rest = digits.slice(2);
    return rest.length >= 8 ? `+${rest}` : null;
  }

  // Local number — prepend default country code
  const local = digits.startsWith('0') ? digits.slice(1) : digits;
  return local.length >= 7 ? `+${defaultCountry}${local}` : null;
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}