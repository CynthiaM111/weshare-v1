-- Promote seed admin (+250788000000) to SUPER_ADMIN (runs in separate transaction after enum is committed)
UPDATE "User"
SET role = 'SUPER_ADMIN'
WHERE phone = '+250788000000' AND role = 'ADMIN';
