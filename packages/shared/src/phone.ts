import { parsePhoneNumber } from 'libphonenumber-js'

export function validateRwandanPhone(phone: string): boolean {
  try {
    const phoneNumber = parsePhoneNumber(phone, 'RW')
    return phoneNumber.isValid() && phoneNumber.country === 'RW'
  } catch {
    return false
  }
}

export function normalizePhoneNumber(phone: string): string {
  try {
    const phoneNumber = parsePhoneNumber(phone, 'RW')
    return phoneNumber.format('E.164')
  } catch {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('250')) {
      return `+${cleaned}`
    }
    if (cleaned.startsWith('0')) {
      return `+250${cleaned.substring(1)}`
    }
    return phone
  }
}
