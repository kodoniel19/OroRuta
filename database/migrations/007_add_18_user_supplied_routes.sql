-- Migration 007: Add 18 user-supplied candidate routes and expand code column
ALTER TABLE routes MODIFY COLUMN code VARCHAR(20) NOT NULL;
ALTER TABLE routes MODIFY COLUMN verification_status
  ENUM('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'PUBLISHED', 'DATA_REVIEW_REQUIRED', 'ERROR', 'USER_SUPPLIED') NOT NULL DEFAULT 'DRAFT';
