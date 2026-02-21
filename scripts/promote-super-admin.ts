/**
 * Promote a user to SUPER_ADMIN by phone number.
 * Usage: npx tsx scripts/promote-super-admin.ts +250788000000
 */
import { prisma } from '../lib/prisma'

async function main() {
    const phoneArg = process.argv[2] || '+250788000000'
    const digits = phoneArg.replace(/\D/g, '')
    const variants = [
        phoneArg,
        digits.startsWith('250') ? `+${digits}` : `+250${digits}`,
        digits.startsWith('0') ? `+250${digits.slice(1)}` : `+250${digits}`,
    ].filter((v, i, a) => a.indexOf(v) === i)

    const user = await prisma.user.findFirst({
        where: { phone: { in: variants } },
    })

    if (!user) {
        console.error(`❌ No user found with phone: ${phoneArg}`)
        process.exit(1)
    }

    if (user.role === 'SUPER_ADMIN') {
        console.log(`✅ ${user.name} (${user.phone}) is already SUPER_ADMIN.`)
        return
    }

    await prisma.user.update({
        where: { id: user.id },
        data: { role: 'SUPER_ADMIN' },
    })

    console.log(`✅ Promoted ${user.name} (${user.phone}) to SUPER_ADMIN.`)
    console.log('   Log out and log back in to see admin features.')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
