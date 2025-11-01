-- Migration: 004_auto_approval.sql
-- Description: Add auto-approval tracking columns to receipts table
-- Date: 2025-10-27

-- Add auto-approval tracking columns
ALTER TABLE receipts
ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
ADD COLUMN IF NOT EXISTS review_reason TEXT,
ADD COLUMN IF NOT EXISTS auto_approved_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for admin dashboard queries
CREATE INDEX IF NOT EXISTS idx_receipts_auto_approved
  ON receipts(auto_approved, status, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_receipts_flagged_review
  ON receipts(status, auto_approved, uploaded_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_receipts_confidence_score
  ON receipts(confidence_score DESC)
  WHERE confidence_score IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN receipts.auto_approved IS 'TRUE if receipt was automatically approved without manual review';
COMMENT ON COLUMN receipts.confidence_score IS 'Fraud detection confidence score (0-1), higher is better';
COMMENT ON COLUMN receipts.review_reason IS 'Reason why receipt was flagged for manual review (null if auto-approved)';
COMMENT ON COLUMN receipts.auto_approved_at IS 'Timestamp when receipt was automatically approved';

-- Update existing receipts to mark them as manually reviewed
UPDATE receipts
SET auto_approved = FALSE
WHERE auto_approved IS NULL;

-- Add check constraint to ensure auto_approved_at is set when auto_approved is true
ALTER TABLE receipts
ADD CONSTRAINT receipts_auto_approved_at_check
  CHECK (
    (auto_approved = FALSE AND auto_approved_at IS NULL) OR
    (auto_approved = TRUE AND auto_approved_at IS NOT NULL)
  );
