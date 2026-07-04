-- DropEnum
-- AuditAction was never referenced: AuditLog.action is a plain String and no
-- code imports the enum. Dropping an unused type is safe.
DROP TYPE "AuditAction";
