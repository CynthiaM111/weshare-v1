import fs from 'fs'
import path from 'path'

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'driver-verification')
const PROFILE_ROOT = path.join(process.cwd(), 'storage', 'profile')

export function getStoragePath(userId: string, submissionId: string, filename: string): string {
  const dir = path.join(STORAGE_ROOT, userId, submissionId)
  return path.join(dir, filename)
}

export async function ensureDir(filePath: string): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.promises.mkdir(dir, { recursive: true })
}

export async function saveFile(
  userId: string,
  submissionId: string,
  filename: string,
  buffer: Buffer
): Promise<string> {
  const fullPath = getStoragePath(userId, submissionId, filename)
  await ensureDir(fullPath)
  await fs.promises.writeFile(fullPath, buffer)
  // Use forward slashes for DB storage (works across OS)
  const rel = path.relative(STORAGE_ROOT, fullPath)
  return rel.split(path.sep).join('/')
}

export async function readFile(relativePath: string): Promise<Buffer> {
  const fullPath = path.join(STORAGE_ROOT, relativePath)
  return fs.promises.readFile(fullPath)
}

export function fileExists(relativePath: string): boolean {
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
  const fullPath = path.join(PROFILE_ROOT, filename)
  await ensureDir(fullPath)
  await fs.promises.writeFile(fullPath, buffer)
  return `profile/${filename}`
}

export async function readProfileFile(relativePath: string): Promise<Buffer> {
  const fullPath = path.join(process.cwd(), 'storage', relativePath)
  return fs.promises.readFile(fullPath)
}

export function profileFileExists(relativePath: string): boolean {
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
