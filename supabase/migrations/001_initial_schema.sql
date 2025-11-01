-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    phone TEXT,
    age_verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scans table
CREATE TABLE IF NOT EXISTS scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    qr_code TEXT NOT NULL,
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    coupon_code TEXT NOT NULL UNIQUE
);

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rebate_amount DECIMAL(10, 2),
    venmo_username TEXT,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_scanned_at ON scans(scanned_at DESC);
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_scan_id ON receipts(scan_id);
CREATE INDEX idx_receipts_status ON receipts(status);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 🚨 CRITICAL SECURITY VULNERABILITY - INSECURE RLS POLICIES!
-- ============================================
-- ALL policies below use "USING (true)" which allows UNRESTRICTED ACCESS!
-- This means ANY user can read/modify ANY data in the database!
--
-- IMPACT:
-- - Anyone can view ALL receipts (including PayPal emails, amounts)
-- - Anyone can modify receipt statuses to 'approved' or 'paid'
-- - Anyone can change payout amounts before processing
-- - Complete data breach of all user PII
--
-- FIX REQUIRED: See supabase/migrations/005_fix_rls_policies.sql
-- See: SECURITY.md - Vulnerability #3 (SQL Injection via RLS)
-- See: docs/SECURITY_ROADMAP.md - Phase 1.3 (Fix Supabase RLS Policies)
-- ============================================

-- ❌ INSECURE: Allows viewing ALL users!
-- RLS Policies for users table
CREATE POLICY "Users can view their own data"
    ON users FOR SELECT
    USING (true);

-- ❌ INSECURE: Allows inserting as ANY user!
CREATE POLICY "Users can insert their own data"
    ON users FOR INSERT
    WITH CHECK (true);

-- ❌ INSECURE: Allows viewing ALL scans!
-- RLS Policies for scans table
CREATE POLICY "Anyone can view scans"
    ON scans FOR SELECT
    USING (true);

-- ❌ INSECURE: Allows creating scans for ANY session!
CREATE POLICY "Anyone can create scans"
    ON scans FOR INSERT
    WITH CHECK (true);

-- ❌ INSECURE: Policy name says "own receipts" but USING (true) allows ALL receipts!
-- RLS Policies for receipts table
CREATE POLICY "Users can view their own receipts"
    ON receipts FOR SELECT
    USING (true);

-- ❌ INSECURE: Allows creating receipts for ANY session!
CREATE POLICY "Users can create receipts"
    ON receipts FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update their own receipts"
    ON receipts FOR UPDATE
    USING (true);

-- Create a storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for receipt images
CREATE POLICY "Anyone can upload receipts"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Anyone can view receipts"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'receipts');
