# Supabase Setup Guide

Complete guide to integrating Supabase with the Burn That Ad campaign.

---

## 🎯 Overview

This guide will help you:
1. Create a Supabase project
2. Set up the database schema
3. Configure storage for receipt images
4. Add credentials to your app
5. Test the integration

**Estimated Time:** 15-20 minutes

---

## Option 1: Cloud Setup (Recommended for Production)

### Step 1: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)**
2. Click **"Start your project"** or **"New Project"**
3. Sign in with GitHub (recommended)
4. Click **"New Project"**
5. Fill in project details:
   - **Name:** `burn-that-ad` (or your preferred name)
   - **Database Password:** Generate a strong password (save this!)
   - **Region:** Choose closest to your users (e.g., `us-east-1`)
   - **Pricing Plan:** Free tier is fine for MVP
6. Click **"Create new project"**
7. Wait 2-3 minutes for project to provision

### Step 2: Run Database Migration

1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)
6. You should see: **"Success. No rows returned"**

**Verify Tables Created:**
1. Click **"Table Editor"** in left sidebar
2. You should see 3 tables:
   - `users`
   - `scans`
   - `receipts`

### Step 3: Configure Storage Bucket

The migration should have created the `receipts` bucket automatically. Verify:

1. Click **"Storage"** in left sidebar
2. You should see a bucket named **"receipts"**
3. If not, create it manually:
   - Click **"New bucket"**
   - Name: `receipts`
   - Public bucket: **OFF** (keep private)
   - File size limit: `10MB`
   - Click **"Create bucket"**

### Step 4: Get API Credentials

1. Click **"Project Settings"** (gear icon in left sidebar)
2. Click **"API"** in the settings menu
3. You'll see two important values:

**Project URL:**
```
https://your-project-id.supabase.co
```

**anon/public key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ IMPORTANT:** The `anon` key is safe to use in your frontend. Do NOT use the `service_role` key in your app (it's for server-side only).

### Step 5: Add Credentials to Your App

1. In your project root, create `.env.local`:

```bash
cp .env.example .env.local
```

2. Edit `.env.local` and add your credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save the file

4. **Restart your dev server:**
```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### Step 6: Test the Connection

1. Open your browser console at http://localhost:3000
2. Run this test:

```javascript
// Test Supabase connection
const { data, error } = await fetch('/api/test-supabase').then(r => r.json())
console.log('Supabase connected:', !error)
```

Or create a quick test page:

**Create `app/test-supabase/page.tsx`:**
```tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TestSupabase() {
  const [status, setStatus] = useState("Testing...");

  useEffect(() => {
    testConnection();
  }, []);

  async function testConnection() {
    try {
      const { data, error } = await supabase.from("users").select("count");
      if (error) throw error;
      setStatus("✅ Supabase connected successfully!");
    } catch (error) {
      setStatus("❌ Connection failed: " + error.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-2xl">{status}</div>
    </div>
  );
}
```

Visit http://localhost:3000/test-supabase to verify.

---

## Option 2: Local Setup (For Development)

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

Or with Homebrew (Mac):
```bash
brew install supabase/tap/supabase
```

### Step 2: Initialize Supabase

```bash
# In your project root
supabase init
```

This creates a `supabase/` folder with config files.

### Step 3: Start Local Supabase

```bash
supabase start
```

**First time:** This downloads Docker images (takes 2-5 minutes)

**Output will show:**
```
API URL: http://localhost:54321
GraphQL URL: http://localhost:54321/graphql/v1
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
Inbucket URL: http://localhost:54324
JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
anon key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Run Migrations

```bash
supabase db reset
```

This runs all migrations in `supabase/migrations/`.

### Step 5: Add Local Credentials

Create `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Use the `anon key` from the `supabase start` output.

### Step 6: Access Local Studio

Open http://localhost:54323 to view:
- Table Editor
- SQL Editor
- Storage buckets
- Authentication

---

## 🔄 Updating Your Code to Use Supabase

### Current State: localStorage
Right now, scans are saved to localStorage in [lib/local-storage.ts](lib/local-storage.ts).

### Update to Supabase

**Replace `lib/local-storage.ts` with:**

```typescript
import { supabase } from "./supabase";
import { generateCouponCode } from "./generate-coupon";

export interface LocalScan {
  id: string;
  qrCode: string;
  scannedAt: string;
  couponCode: string;
}

/**
 * Get all scans for current user
 */
export async function getScans(): Promise<LocalScan[]> {
  try {
    const { data, error } = await supabase
      .from("scans")
      .select("*")
      .order("scanned_at", { ascending: false });

    if (error) throw error;

    return data.map((scan) => ({
      id: scan.id,
      qrCode: scan.qr_code,
      scannedAt: scan.scanned_at,
      couponCode: scan.coupon_code,
    }));
  } catch (error) {
    console.error("Error fetching scans:", error);
    return [];
  }
}

/**
 * Save a new scan to Supabase
 */
export async function saveScan(qrCode: string): Promise<LocalScan> {
  try {
    const couponCode = generateCouponCode();

    const { data, error } = await supabase
      .from("scans")
      .insert({
        qr_code: qrCode,
        coupon_code: couponCode,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      qrCode: data.qr_code,
      scannedAt: data.scanned_at,
      couponCode: data.coupon_code,
    };
  } catch (error) {
    console.error("Error saving scan:", error);
    throw error;
  }
}

/**
 * Get a specific scan by ID
 */
export async function getScanById(id: string): Promise<LocalScan | null> {
  try {
    const { data, error } = await supabase
      .from("scans")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return {
      id: data.id,
      qrCode: data.qr_code,
      scannedAt: data.scanned_at,
      couponCode: data.coupon_code,
    };
  } catch (error) {
    console.error("Error fetching scan:", error);
    return null;
  }
}

/**
 * Get the count of scans
 */
export async function getScansCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("scans")
      .select("*", { count: "exact", head: true });

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error("Error counting scans:", error);
    return 0;
  }
}

/**
 * Clear all scans (for testing/debugging)
 */
export async function clearScans(): Promise<void> {
  try {
    const { error } = await supabase.from("scans").delete().neq("id", "");
    if (error) throw error;
  } catch (error) {
    console.error("Error clearing scans:", error);
  }
}
```

### Update Receipt Upload Component

**In `app/upload/[scanId]/page.tsx`, replace the submit handler:**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!selectedFile || !paypalEmail) {
    alert("Please upload a receipt and enter the PayPal email for the payout");
    return;
  }

  try {
    setIsUploading(true);

    // 1. Upload image to Supabase Storage
    const fileExt = selectedFile.name.split(".").pop();
    const fileName = `${scanId}-${Date.now()}.${fileExt}`;
    const filePath = `receipts/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, selectedFile);

    if (uploadError) throw uploadError;

    // 2. Get public URL
    const { data: urlData } = supabase.storage
      .from("receipts")
      .getPublicUrl(filePath);

    // 3. Save receipt record to database
    const { error: dbError } = await supabase
      .from("receipts")
      .insert({
        scan_id: scanId,
        image_url: urlData.publicUrl,
        paypal_email: paypalEmail,
        status: "pending",
        rebate_amount: 5.0,
      });

    if (dbError) throw dbError;

    setIsSubmitted(true);
  } catch (error) {
    console.error("Error uploading receipt:", error);
    alert("Failed to upload receipt. Please try again.");
  } finally {
    setIsUploading(false);
  }
};
```

---

## 🔒 Security Configuration

### Row Level Security (RLS)

The migration already enabled RLS and created basic policies. For production, you may want to add more restrictive policies.

**Example: Only allow users to see their own receipts:**

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "Users can view their own receipts" ON receipts;

-- Create stricter policy (requires auth)
CREATE POLICY "Users can view their own receipts"
  ON receipts FOR SELECT
  USING (auth.uid() = user_id);
```

### Storage Policies

**Make receipt uploads more secure:**

```sql
-- Only allow authenticated uploads
CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'receipts' AND
    auth.role() = 'authenticated'
  );
```

---

## 🧪 Testing Your Integration

### Test 1: Scan a QR Code
1. Go to http://localhost:3000
2. Complete age gate → intro
3. Click "START SCANNING"
4. Scan any QR code
5. Watch burn animation
6. Verify coupon appears

**Check Supabase:**
- Go to Table Editor → `scans`
- Should see new row with your QR code and coupon

### Test 2: Upload a Receipt
1. From coupon page, click "Upload Receipt"
2. Select an image
3. Enter PayPal email address
4. Submit

**Check Supabase:**
- Table Editor → `receipts` (should see pending receipt)
- Storage → `receipts` bucket (should see image)

### Test 3: Multiple Scans
1. Scan 3 different QR codes
2. Check that counter increases
3. Verify all scans in database

---

## 🐛 Troubleshooting

### "Failed to fetch" errors

**Problem:** Can't connect to Supabase

**Solutions:**
- Check `.env.local` has correct URL and key
- Restart dev server after adding env vars
- Verify Supabase project is running (cloud) or `supabase start` (local)
- Check browser console for CORS errors

### "Row Level Security policy violation"

**Problem:** RLS blocking your queries

**Solutions:**
- For MVP, you can disable RLS temporarily:
  ```sql
  ALTER TABLE scans DISABLE ROW LEVEL SECURITY;
  ALTER TABLE receipts DISABLE ROW LEVEL SECURITY;
  ```
- Or update policies to allow anonymous access (see migration file)

### Storage upload fails

**Problem:** Can't upload images

**Solutions:**
- Check bucket exists: Storage → should see `receipts`
- Verify bucket is private (not public)
- Check file size < 10MB
- Review storage policies in SQL Editor

### "relation does not exist" error

**Problem:** Tables not created

**Solutions:**
- Re-run migration in SQL Editor
- Check for SQL errors in migration
- Verify you're connected to correct database

---

## 📊 Monitoring & Maintenance

### View Logs
**Cloud:** Dashboard → Logs
**Local:** `supabase logs`

### Backup Database
**Cloud:** Dashboard → Database → Backups (automatic)
**Local:**
```bash
supabase db dump -f backup.sql
```

### Reset Database
**Cloud:** Re-run migration SQL
**Local:**
```bash
supabase db reset
```

---

## 🚀 Production Deployment

### Environment Variables for Vercel

1. Go to Vercel dashboard → Your Project → Settings → Environment Variables
2. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` = Your production Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your production anon key

3. Redeploy:
```bash
vercel --prod
```

### Production Checklist

- [ ] Enable RLS on all tables
- [ ] Review and tighten security policies
- [ ] Set up database backups
- [ ] Enable auth (if needed)
- [ ] Set up storage size limits
- [ ] Configure CORS for production domain
- [ ] Monitor usage and billing

---

## 📞 Need Help?

**Supabase Docs:** https://supabase.com/docs
**Discord:** https://discord.supabase.com
**GitHub:** https://github.com/supabase/supabase

**Common Issues:**
- [Supabase Troubleshooting Guide](https://supabase.com/docs/guides/platform/troubleshooting)
- [RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)

---

## ✅ Quick Start Checklist

**For Cloud Setup:**
- [ ] Create project at supabase.com
- [ ] Run migration SQL in SQL Editor
- [ ] Verify `receipts` bucket exists in Storage
- [ ] Copy URL and anon key to `.env.local`
- [ ] Restart dev server
- [ ] Test connection at /test-supabase
- [ ] Scan a QR code and verify it saves
- [ ] Upload a receipt and verify it saves

**For Local Setup:**
- [ ] Install Supabase CLI
- [ ] Run `supabase init`
- [ ] Run `supabase start`
- [ ] Run `supabase db reset`
- [ ] Copy local credentials to `.env.local`
- [ ] Test at http://localhost:54323

---

**You're all set!** Once Supabase is configured, the app will automatically use it instead of localStorage. 🎉
