import { prisma } from './prisma'
import type { User, UserRole } from '@prisma/client'
import { normalizePhoneNumber, validateRwandanPhone } from '@weshare/shared'

export { normalizePhoneNumber, validateRwandanPhone }

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
      phoneVerified: true,
    },
  })
}

export async function getUserByPhone(phone: string): Promise<User | null> {
  const normalizedPhone = normalizePhoneNumber(phone)
  return prisma.user.findUnique({
    where: { phone: normalizedPhone },
  })
}
