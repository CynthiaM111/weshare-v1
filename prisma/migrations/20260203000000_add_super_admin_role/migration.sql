-- Add SUPER_ADMIN to UserRole enum (PostgreSQL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'SUPER_ADMIN'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'UserRole')
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'SUPER_ADMIN';
  END IF;
END
$$;

-- Promote seed admin (+250788000000) to SUPER_ADMIN if they exist
UPDATE "User"
SET role = 'SUPER_ADMIN'
WHERE phone = '+250788000000' AND role = 'ADMIN';
