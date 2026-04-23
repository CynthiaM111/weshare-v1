-- Create VerificationStatus enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerificationStatus') THEN
    CREATE TYPE "VerificationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');
  END IF;
END
$$;

-- Create AuditAction enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    CREATE TYPE "AuditAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');
  END IF;
END
$$;

-- Create DriverVerificationSubmission table if not exists
CREATE TABLE IF NOT EXISTS "DriverVerificationSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fullName" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "nationalIdNumber" TEXT,
    "nationalIdFront" TEXT,
    "nationalIdBack" TEXT,
    "licenseFront" TEXT,
    "licenseBack" TEXT,
    "plateNumber" TEXT,
    "vehicleMake" TEXT,
    "vehicleModel" TEXT,
    "vehicleColor" TEXT,
    "vehicleSeats" INTEGER,
    "yellowCardPath" TEXT,
    "insurancePath" TEXT,
    "vehiclePhotoFront" TEXT,
    "vehiclePhotoRear" TEXT,
    "vehiclePhotoSide" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "insuranceExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverVerificationSubmission_pkey" PRIMARY KEY ("id")
);

-- Create VerificationAuditLog table if not exists
CREATE TABLE IF NOT EXISTS "VerificationAuditLog" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAuditLog_pkey" PRIMARY KEY ("id")
);

-- Create indexes for DriverVerificationSubmission (idempotent - ignore if exists)
CREATE UNIQUE INDEX IF NOT EXISTS "DriverVerificationSubmission_userId_version_key" ON "DriverVerificationSubmission"("userId", "version");
CREATE INDEX IF NOT EXISTS "DriverVerificationSubmission_userId_idx" ON "DriverVerificationSubmission"("userId");
CREATE INDEX IF NOT EXISTS "DriverVerificationSubmission_status_idx" ON "DriverVerificationSubmission"("status");
CREATE INDEX IF NOT EXISTS "DriverVerificationSubmission_submittedAt_idx" ON "DriverVerificationSubmission"("submittedAt");

-- Create indexes for VerificationAuditLog
CREATE INDEX IF NOT EXISTS "VerificationAuditLog_submissionId_idx" ON "VerificationAuditLog"("submissionId");
CREATE INDEX IF NOT EXISTS "VerificationAuditLog_adminId_idx" ON "VerificationAuditLog"("adminId");
CREATE INDEX IF NOT EXISTS "VerificationAuditLog_createdAt_idx" ON "VerificationAuditLog"("createdAt");

-- Add foreign keys (only if they don't exist - use DO block for safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'DriverVerificationSubmission_userId_fkey'
  ) THEN
    ALTER TABLE "DriverVerificationSubmission" ADD CONSTRAINT "DriverVerificationSubmission_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'VerificationAuditLog_submissionId_fkey'
  ) THEN
    ALTER TABLE "VerificationAuditLog" ADD CONSTRAINT "VerificationAuditLog_submissionId_fkey"
      FOREIGN KEY ("submissionId") REFERENCES "DriverVerificationSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
