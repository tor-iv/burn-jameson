-- Updated schema for bottle scan flow
-- This migration updates the schema to support the new flow:
-- 1. User scans competitor bottle (Jameson)
-- 2. System detects bottle and creates session
-- 3. User uploads receipt with Keeper's Heart purchase
-- 4. Admin reviews and approves payment

-- Drop old tables if they exist
DROP TABLE IF EXISTS scans CASCADE;

-- Create bottle_scans table (replaces scans)
CREATE TABLE IF NOT EXISTS bottle_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT UNIQUE NOT NULL,
  bottle_image TEXT, -- Supabase Storage URL
  detected_brand TEXT,
  confidence DECIMAL(3,2), -- 0.00 to 1.00
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending_receipt' CHECK (status IN ('pending_receipt', 'completed', 'rejected')),
  ip_address TEXT,
  user_agent TEXT,
  image_hash TEXT -- For duplicate detection
);

-- Update receipts table to use session_id
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_scan_id_fkey;
ALTER TABLE receipts DROP COLUMN IF EXISTS scan_id;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS session_id TEXT NOT NULL;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS paypal_payout_id TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS auto_approved BOOLEAN DEFAULT false;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS review_reason TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS auto_approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE receipts ALTER COLUMN status TYPE TEXT;
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_status_check;
ALTER TABLE receipts ADD CONSTRAINT receipts_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'paid'));

-- Add foreign key for session_id
ALTER TABLE receipts DROP CONSTRAINT IF EXISTS fk_session;
ALTER TABLE receipts ADD CONSTRAINT fk_session
  FOREIGN KEY (session_id) REFERENCES bottle_scans(session_id) ON DELETE CASCADE;

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bottle_scans_session ON bottle_scans(session_id);
CREATE INDEX IF NOT EXISTS idx_bottle_scans_status ON bottle_scans(status);
CREATE INDEX IF NOT EXISTS idx_bottle_scans_ip ON bottle_scans(ip_address);
CREATE INDEX IF NOT EXISTS idx_bottle_scans_hash ON bottle_scans(image_hash);
CREATE INDEX IF NOT EXISTS idx_receipts_session ON receipts(session_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status_uploaded ON receipts(status, uploaded_at DESC);

-- Enable RLS on new tables
ALTER TABLE bottle_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bottle_scans
CREATE POLICY "Allow anonymous bottle scans insert"
  ON bottle_scans FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow read own bottle scans"
  ON bottle_scans FOR SELECT
  TO anon
  USING (true);

-- Admin-only access policies
CREATE POLICY "Admins can read all receipts"
  ON receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt() ->> 'email'
    )
  );

CREATE POLICY "Admins can update receipts"
  ON receipts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Create storage bucket for bottle images
INSERT INTO storage.buckets (id, name, public)
VALUES ('bottle-images', 'bottle-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for bottle images
CREATE POLICY "Allow public uploads to bottle-images"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'bottle-images');

CREATE POLICY "Allow public reads from bottle-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'bottle-images');

-- Rename receipts bucket to receipt-images for consistency
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-images', 'receipt-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipt images
CREATE POLICY "Allow public uploads to receipt-images"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'receipt-images');

CREATE POLICY "Allow public reads from receipt-images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'receipt-images');
