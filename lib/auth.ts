import { parsePhoneNumber } from 'libphonenumber-js'
import { prisma } from './prisma'
import type { User, UserRole } from '@prisma/client'

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
    return phoneNumber.format('E.164') // Returns +250XXXXXXXXX format
  } catch {
    // If parsing fails, try to normalize manually
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

export async function findOrCreateUser(
  phone: string,
  name: string,
  role: UserRole = 'PASSENGER'
): Promise<User> {
  const normalizedPhone = normalizePhoneNumber(phone)
  
  if (!validateRwandanPhone(normalizedPhone)) {
    throw new Error('Invalid Rwandan phone number')
  }

  const existingUser = await prisma.user.findUnique({
    where: { phone: normalizedPhone },
  })

  if (existingUser) {
    return existingUser
  }

  return prisma.user.create({
    data: {
      phone: normalizedPhone,
      name,
      role,
      phoneVerified: true, // Auto-verify Rwandan numbers
    },
  })
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const normalizedPhone = normalizePhoneNumber(phone)
  return prisma.user.findUnique({
    where: { phone: normalizedPhone },
  })
}

