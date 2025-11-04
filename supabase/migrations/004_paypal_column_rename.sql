-- Migration 004: PayPal Integration Documentation
--
-- HISTORY: This migration was originally created to rename venmo_username → paypal_email
-- and venmo_payment_id → paypal_payout_id. However, migrations 001 and 002 have been
-- updated to use the correct PayPal column names from the start.
--
-- This migration now serves as documentation and adds helpful column comments.
-- The actual columns are created with correct names in migrations 001 & 002.

-- Add column comments for clarity and documentation
COMMENT ON COLUMN receipts.paypal_email
  IS 'User PayPal email address for rebate payment via PayPal Payouts API';

COMMENT ON COLUMN receipts.paypal_payout_id
  IS 'PayPal payout batch item ID returned from PayPal Payouts API after successful payment';

COMMENT ON COLUMN receipts.auto_approved
  IS 'Whether receipt was auto-approved by AI confidence threshold';

COMMENT ON COLUMN receipts.confidence_score
  IS 'AI confidence score (0.00-1.00) from receipt OCR validation';

COMMENT ON COLUMN receipts.review_reason
  IS 'Reason for manual review if auto-approval failed (e.g., "Low confidence", "Missing Keeper\'\'s Heart")';

-- Verification query (optional - can be run manually):
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'receipts'
--   AND column_name IN ('paypal_email', 'paypal_payout_id', 'auto_approved', 'confidence_score')
-- ORDER BY column_name;
