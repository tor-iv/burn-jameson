-- Update receipts table to rename venmo_username to paypal_email
ALTER TABLE receipts RENAME COLUMN venmo_username TO paypal_email;

-- Update the column comment
COMMENT ON COLUMN receipts.paypal_email IS 'PayPal email address for payout';
