import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile, fileExists } from '@/lib/storage'
import path from 'path'

export const dynamic = 'force-dynamic'

// Serves documents via auth-checked request. Never expose raw storage paths.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const relativePath = searchParams.get('path')
    const userId = request.headers.get('x-user-id')

    if (!relativePath) {
      return NextResponse.json({ error: 'Missing path' }, { status: 400 })
    }

    // Prevent path traversal
    if (relativePath.includes('..') || path.isAbsolute(relativePath)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // Fetch submission to check ownership - path format: userId/submissionId/filename
    const normalizedPath = relativePath.replace(/\\/g, '/')
    const parts = normalizedPath.split('/')
    if (parts.length < 3) {
      return NextResponse.json({ error: 'Invalid path format' }, { status: 400 })
    }
    const pathUserId = parts[0]
    const submissionId = parts[1]

    const submission = await prisma.driverVerificationSubmission.findUnique({
      where: { id: submissionId },
      include: { user: true },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Access control: driver can view own; admin can view all
    const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null
    const isOwner = userId === submission.userId
    const isAdmin = user?.role === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!(await fileExists(normalizedPath))) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const buffer = await readFile(normalizedPath)

    const ext = path.extname(relativePath).toLowerCase()
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    }
    const contentType = contentTypeMap[ext] || 'application/octet-stream'

    // Convert Node Buffer to Uint8Array for Fetch API compatibility (BodyInit)
    const body = new Uint8Array(buffer)

    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Document fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}
