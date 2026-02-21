import fs from 'fs'
import path from 'path'
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'driver-verification')
const PROFILE_ROOT = path.join(process.cwd(), 'storage', 'profile')

// S3 config - used in production (Netlify, Vercel) where filesystem is read-only
const S3_BUCKET = process.env.MY_S3_BUCKET

let _s3Client: S3Client | null | undefined = undefined

function getS3Client(): S3Client | null {
    if (_s3Client !== undefined) return _s3Client
    if (!process.env.MY_S3_BUCKET || !process.env.MY_AWS_ACCESS_KEY_ID || !process.env.MY_AWS_SECRET_ACCESS_KEY) {
        _s3Client = null
        return null
    }
    _s3Client = new S3Client({
        region: process.env.MY_S3_REGION || 'auto',
        ...(process.env.MY_S3_ENDPOINT && {
            endpoint: process.env.MY_S3_ENDPOINT,
            forcePathStyle: true,
        }),
        credentials: {
            accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
        },
    })
    return _s3Client
}

function useS3(): boolean {
    return getS3Client() !== null
}

export function getStoragePath(userId: string, submissionId: string, filename: string): string {
    const dir = path.join(STORAGE_ROOT, userId, submissionId)
    return path.join(dir, filename)
}

export async function ensureDir(filePath: string): Promise<void> {
    if (useS3()) return // S3 has no directories, keys are flat
    const dir = path.dirname(filePath)
    await fs.promises.mkdir(dir, { recursive: true })
}

export async function saveFile(
    userId: string,
    submissionId: string,
    filename: string,
    buffer: Buffer
): Promise<string> {
    const key = `driver-verification/${userId}/${submissionId}/${filename}`

    if (useS3()) {
        const client = getS3Client()!
        await client.send(
            new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: key,
                Body: buffer,
            })
        )
        return `${userId}/${submissionId}/${filename}`
    }

    const fullPath = path.join(STORAGE_ROOT, userId, submissionId, filename)
    await ensureDir(fullPath)
    await fs.promises.writeFile(fullPath, buffer)
    const rel = path.relative(STORAGE_ROOT, fullPath)
    return rel.split(path.sep).join('/')
}

export async function readFile(relativePath: string): Promise<Buffer> {
    if (useS3()) {
        const key = `driver-verification/${relativePath}`
        const client = getS3Client()!
        const res = await client.send(
            new GetObjectCommand({ Bucket: S3_BUCKET!, Key: key })
        )
        const bytes = await res.Body?.transformToByteArray()
        return Buffer.from(bytes || [])
    }

    const fullPath = path.join(STORAGE_ROOT, relativePath)
    return fs.promises.readFile(fullPath)
}

export async function fileExists(relativePath: string): Promise<boolean> {
    if (useS3()) {
        try {
            const client = getS3Client()!
            const key = `driver-verification/${relativePath}`
            await client.send(
                new HeadObjectCommand({ Bucket: S3_BUCKET!, Key: key })
            )
            return true
        } catch {
            return false
        }
    }
    const fullPath = path.join(STORAGE_ROOT, relativePath)
    return fs.existsSync(fullPath)
}

// File validation constants
export const FILE_LIMITS = {
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedDocTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
}

export async function saveProfileImage(userId: string, buffer: Buffer, ext: string): Promise<string> {
    const filename = `${userId}.${ext}`
    const key = `profile/${filename}`

    if (useS3()) {
        const client = getS3Client()!
        await client.send(
            new PutObjectCommand({
                Bucket: S3_BUCKET,
                Key: key,
                Body: buffer,
            })
        )
        return `profile/${filename}`
    }

    const fullPath = path.join(PROFILE_ROOT, filename)
    await ensureDir(fullPath)
    await fs.promises.writeFile(fullPath, buffer)
    return `profile/${filename}`
}

export async function readProfileFile(relativePath: string): Promise<Buffer> {
    if (useS3()) {
        const key = relativePath
        const client = getS3Client()!
        const res = await client.send(
            new GetObjectCommand({ Bucket: S3_BUCKET!, Key: key })
        )
        const bytes = await res.Body?.transformToByteArray()
        return Buffer.from(bytes || [])
    }

    const fullPath = path.join(process.cwd(), 'storage', relativePath)
    return fs.promises.readFile(fullPath)
}

export async function profileFileExists(relativePath: string): Promise<boolean> {
    if (useS3()) {
        try {
            const client = getS3Client()!
            await client.send(
                new HeadObjectCommand({ Bucket: S3_BUCKET!, Key: relativePath })
            )
            return true
        } catch {
            return false
        }
    }

    const fullPath = path.join(process.cwd(), 'storage', relativePath)
    return fs.existsSync(fullPath)
}

export function getFileExtension(mimeType: string): string {
    const map: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'application/pdf': 'pdf',
    }
    return map[mimeType] || 'bin'
}
