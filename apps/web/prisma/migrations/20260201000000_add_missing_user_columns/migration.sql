-- Add missing User columns (idempotent - safe to run even if some exist)
-- Fixes: "The column User.driverVerified does not exist" in production

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "driverVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nationalId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "drivingLicenseNumber" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "licensePlate" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profileImageUrl" TEXT;

-- Add ADMIN to UserRole enum if not present (PostgreSQL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'ADMIN'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'ADMIN';
  END IF;
END
$$;
