import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  saveFile,
  FILE_LIMITS,
  getFileExtension,
} from '@/lib/storage'

export const dynamic = 'force-dynamic'

const DOCUMENT_TYPES = [
  'nationalIdFront',
  'nationalIdBack',
  'licenseFront',
  'licenseBack',
  'yellowCard',
  'insurance',
  'vehiclePhotoFront',
  'vehiclePhotoRear',
  'vehiclePhotoSide',
] as const

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const documentType = formData.get('documentType') as string
    const submissionId = formData.get('submissionId') as string
    const file = formData.get('file') as File

    if (!documentType || !submissionId || !file) {
      return NextResponse.json(
        { error: 'Missing documentType, submissionId, or file' },
        { status: 400 }
      )
    }

    if (!DOCUMENT_TYPES.includes(documentType as any)) {
      return NextResponse.json({ error: 'Invalid document type' }, { status: 400 })
    }

    // Verify submission belongs to user and is DRAFT
    const submission = await prisma.driverVerificationSubmission.findFirst({
      where: { id: submissionId, userId },
    })
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }
    if (submission.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only upload to draft submissions' },
        { status: 400 }
      )
    }

    // Validate file
    const isImageOnly = ['nationalIdFront', 'nationalIdBack', 'licenseFront', 'licenseBack', 'vehiclePhotoFront', 'vehiclePhotoRear', 'vehiclePhotoSide'].includes(documentType)
    const allowedTypes = isImageOnly ? FILE_LIMITS.allowedImageTypes : FILE_LIMITS.allowedDocTypes

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type. Allowed: ${allowedTypes.join(', ')}` },
        { status: 400 }
      )
    }
    if (file.size > FILE_LIMITS.maxSizeBytes) {
      return NextResponse.json(
        { error: `File too large. Max size: 5MB` },
        { status: 400 }
      )
    }

    const ext = getFileExtension(file.type)
    const filename = `${documentType}-${Date.now()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const relativePath = await saveFile(userId, submissionId, filename, buffer)

    const columnMap: Record<string, string> = {
      nationalIdFront: 'nationalIdFront',
      nationalIdBack: 'nationalIdBack',
      licenseFront: 'licenseFront',
      licenseBack: 'licenseBack',
      yellowCard: 'yellowCardPath',
      insurance: 'insurancePath',
      vehiclePhotoFront: 'vehiclePhotoFront',
      vehiclePhotoRear: 'vehiclePhotoRear',
      vehiclePhotoSide: 'vehiclePhotoSide',
    }
    const column = columnMap[documentType]

    await prisma.driverVerificationSubmission.update({
      where: { id: submissionId },
      data: { [column]: relativePath },
    })

    return NextResponse.json({
      success: true,
      path: relativePath,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
