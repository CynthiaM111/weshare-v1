import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readProfileFile, profileFileExists } from '@/lib/storage'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const rows = await prisma.$queryRaw<{ profileImageUrl: string | null }[]>`
      SELECT "profileImageUrl" FROM "User" WHERE id = ${userId}
    `
    const profileImageUrl = rows[0]?.profileImageUrl

    if (!profileImageUrl) {
      return NextResponse.json({ error: 'No profile image' }, { status: 404 })
    }

    if (!(await profileFileExists(profileImageUrl))) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const buffer = await readProfileFile(profileImageUrl)
    const ext = path.extname(profileImageUrl).toLowerCase()
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    }
    const contentType = contentTypeMap[ext] || 'image/jpeg'

    // Convert Node Buffer to Uint8Array for Fetch API compatibility (BodyInit)
    const body = new Uint8Array(buffer)

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=60',
      },
    })
  } catch (error) {
    console.error('Profile image fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    )
  }
}
