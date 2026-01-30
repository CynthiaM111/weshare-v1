import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Debug: Check environment variables on Prisma initialization
if (typeof process !== 'undefined') {
  console.log('Prisma init - DB URL:', process.env.DATABASE_URL ? 'present' : 'missing');
  console.log('Prisma init - NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'present' : 'missing');
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

