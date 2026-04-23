-- AlterTable
ALTER TABLE "User" ADD COLUMN     "driverVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "drivingLicenseNumber" TEXT,
ADD COLUMN     "licensePlate" TEXT;
