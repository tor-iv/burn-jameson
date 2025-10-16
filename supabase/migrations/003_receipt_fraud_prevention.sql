-- Add fraud prevention fields to receipts table
-- Migration 003: Receipt fraud prevention

-- Add image_hash field for duplicate receipt detection
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS image_hash TEXT;

-- Add index on image_hash for fast duplicate lookups
CREATE INDEX IF NOT EXISTS idx_receipts_image_hash ON receipts(image_hash);

-- Add index on paypal_email + paid_at for rate limiting checks
CREATE INDEX IF NOT EXISTS idx_receipts_paypal_email_paid ON receipts(paypal_email, paid_at)
WHERE status = 'paid';

-- Add comment to document the fraud prevention measures
COMMENT ON COLUMN receipts.image_hash IS 'SHA-256 hash of receipt image for duplicate detection';

-- Note: We intentionally do NOT add a UNIQUE constraint on image_hash or paypal_email
-- to allow flexibility in testing and edge cases (e.g., legitimate resubmissions after rejection)
-- Fraud prevention is enforced at the application layer with configurable ENV variables
