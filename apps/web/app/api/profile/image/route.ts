import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { saveProfileImage, FILE_LIMITS, getFileExtension } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!FILE_LIMITS.allowedImageTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use JPEG, PNG, or WebP.' },
        { status: 400 }
      )
    }
    if (file.size > FILE_LIMITS.maxSizeBytes) {
      return NextResponse.json(
        { error: 'File too large. Max size: 5MB' },
        { status: 400 }
      )
    }

    const ext = getFileExtension(file.type)
    const buffer = Buffer.from(await file.arrayBuffer())
    const relativePath = await saveProfileImage(userId, buffer, ext)

    await prisma.$executeRaw`
      UPDATE "User" SET "profileImageUrl" = ${relativePath}, "updatedAt" = NOW() WHERE id = ${userId}
    `

    return NextResponse.json({
      success: true,
      profileImageUrl: relativePath,
    })
  } catch (error) {
    console.error('Profile image upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
