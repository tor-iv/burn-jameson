# Backend Implementation Roadmap

**Goal:** Connect frontend to Supabase, integrate ML detection, and enable automated PayPal payouts

---

## Phase 1: Supabase Database Setup (Week 1)

### 1.1 Create Supabase Project
```bash
# Option 1: Use existing project (if you have one)
# Check SUPABASE_SETUP.md for existing config

# Option 2: Create new project
# Go to supabase.com/dashboard
# Click "New Project"
# Name: burn-jameson-mvp
# Region: Choose closest to target users
# Database password: Save securely
```

### 1.2 Set Up Database Schema

**Create Tables:**

```sql
-- Users table (optional - can use anonymous sessions)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE,
  phone TEXT,
  age_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Bottle scans table
CREATE TABLE bottle_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  session_id TEXT UNIQUE NOT NULL,
  bottle_image TEXT, -- Supabase Storage URL
  detected_brand TEXT,
  confidence DECIMAL(3,2), -- 0.00 to 1.00
  scanned_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'pending_receipt', -- pending_receipt, completed, rejected
  ip_address TEXT,
  user_agent TEXT
);

-- Receipts table
CREATE TABLE receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bottle_scan_id UUID REFERENCES bottle_scans(id),
  user_id UUID REFERENCES users(id),
  session_id TEXT NOT NULL,
  image_url TEXT NOT NULL, -- Supabase Storage URL
  paypal_email TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT now(),
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, paid
  rebate_amount DECIMAL(5,2) DEFAULT 5.00,
  paypal_payout_id TEXT,
  paid_at TIMESTAMP,
  admin_notes TEXT,
  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES bottle_scans(session_id)
);

-- Admin users table
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_bottle_scans_session ON bottle_scans(session_id);
CREATE INDEX idx_receipts_session ON receipts(session_id);
CREATE INDEX idx_receipts_status ON receipts(status);
CREATE INDEX idx_bottle_scans_status ON bottle_scans(status);
```

### 1.3 Configure Storage Buckets

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('bottle-images', 'bottle-images', false),
  ('receipt-images', 'receipt-images', false);

-- Set up storage policies (allow authenticated and anonymous uploads)
CREATE POLICY "Allow public uploads to bottle-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'bottle-images');

CREATE POLICY "Allow public uploads to receipt-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'receipt-images');

CREATE POLICY "Allow public reads from bottle-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bottle-images');

CREATE POLICY "Allow public reads from receipt-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipt-images');
```

### 1.4 Set Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE bottle_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for MVP - tighten later)
CREATE POLICY "Allow anonymous bottle scans"
ON bottle_scans FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow anonymous receipt uploads"
ON receipts FOR INSERT
TO anon
WITH CHECK (true);

-- Allow public reads of own data
CREATE POLICY "Allow read own bottle scans"
ON bottle_scans FOR SELECT
TO anon
USING (session_id IN (SELECT session_id FROM bottle_scans));

-- Admin-only access
CREATE POLICY "Admins can read all"
ON receipts FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (SELECT email FROM admin_users)
);

CREATE POLICY "Admins can update receipts"
ON receipts FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (SELECT email FROM admin_users)
);
```

### 1.5 Update Frontend to Use Supabase

**Create Supabase client:**
```typescript
// lib/supabase.ts (already exists, update with real credentials)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Add environment variables:**
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Update `/scan/page.tsx` to save bottle scans:**
```typescript
import { supabase } from '@/lib/supabase'

const handleFrame = async (imageBlob: Blob) => {
  // ... detection code ...

  if (data.detected && data.confidence > 0.75) {
    const sessionId = generateSessionId();
    saveSession(sessionId);

    // Upload bottle image to Supabase Storage
    const fileName = `${sessionId}-bottle.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('bottle-images')
      .upload(fileName, imageBlob);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('bottle-images')
      .getPublicUrl(fileName);

    // Insert into bottle_scans table
    const { error: insertError } = await supabase
      .from('bottle_scans')
      .insert({
        session_id: sessionId,
        bottle_image: publicUrl,
        detected_brand: data.brand,
        confidence: data.confidence,
        ip_address: await getClientIP(), // TODO: implement
        user_agent: navigator.userAgent,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return;
    }

    router.push(`/scanning/${sessionId}`);
  }
}
```

**Update `/upload/[sessionId]/page.tsx` to save receipts:**
```typescript
import { supabase } from '@/lib/supabase'

const handleSubmit = async () => {
  if (!isFormValid || !receiptImage) return;
  setIsSubmitting(true);

  try {
    // Upload receipt image
    const fileName = `${sessionId}-receipt.jpg`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipt-images')
      .upload(fileName, receiptImage);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('receipt-images')
      .getPublicUrl(fileName);

    // Insert into receipts table
    const { error: insertError } = await supabase
      .from('receipts')
      .insert({
        session_id: sessionId,
        image_url: publicUrl,
        paypal_email: paypalEmail,
        status: 'pending',
      });

    if (insertError) throw insertError;

    router.push(`/confirmation/${sessionId}`);
  } catch (error) {
    console.error('Upload error:', error);
    alert('Failed to upload. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
}
```

---

## Phase 2: ML Detection Integration (Week 1-2)

### 2.1 Choose ML Provider

**Option A: Google Vision API** (Recommended for MVP)
- **Pros:** Reliable, pre-trained, easy to use
- **Cons:** $1.50 per 1000 requests
- **Setup:** 30 minutes

**Option B: Roboflow** (Custom model)
- **Pros:** Train custom Jameson bottle detector
- **Cons:** Requires training data, more complex
- **Setup:** 2-3 hours + training time

**Option C: Clarifai** (Alternative)
- **Pros:** Good UI, easy integration
- **Cons:** Limited free tier
- **Setup:** 1 hour

**Recommendation:** Start with Google Vision API

### 2.2 Set Up Google Vision API

**Step 1: Create Google Cloud Project**
```bash
# Go to console.cloud.google.com
# Create new project: "burn-jameson-ml"
# Enable Vision API
# Enable billing (required, but free tier = 1000 requests/month)
```

**Step 2: Create Service Account**
```bash
# In Google Cloud Console:
# IAM & Admin → Service Accounts → Create Service Account
# Name: burn-jameson-vision
# Role: Cloud Vision API User
# Create key → JSON
# Download key file
```

**Step 3: Add to Vercel Environment Variables**
```bash
# Convert JSON to base64
cat service-account-key.json | base64

# Add to Vercel:
GOOGLE_APPLICATION_CREDENTIALS=<base64-encoded-json>
GOOGLE_CLOUD_PROJECT_ID=burn-jameson-ml
```

**Step 4: Update `/api/detect-bottle/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import vision from '@google-cloud/vision';

// Initialize Vision client
const credentials = JSON.parse(
  Buffer.from(
    process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
    'base64'
  ).toString('utf-8')
);

const client = new vision.ImageAnnotatorClient({ credentials });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as Blob;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert blob to buffer
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Detect labels
    const [result] = await client.labelDetection(buffer);
    const labels = result.labelAnnotations || [];

    // Look for whiskey/Jameson labels
    const whiskeyLabels = labels.filter(label => {
      const desc = label.description?.toLowerCase() || '';
      return (
        desc.includes('whiskey') ||
        desc.includes('whisky') ||
        desc.includes('jameson') ||
        desc.includes('bottle') ||
        desc.includes('alcohol')
      );
    });

    // Check for Jameson specifically
    const jamesonLabel = labels.find(label =>
      label.description?.toLowerCase().includes('jameson')
    );

    // Also try text detection for "Jameson" text
    const [textResult] = await client.textDetection(buffer);
    const texts = textResult.textAnnotations || [];
    const hasJamesonText = texts.some(text =>
      text.description?.toLowerCase().includes('jameson')
    );

    const detected = !!jamesonLabel || hasJamesonText || whiskeyLabels.length >= 2;
    const confidence = jamesonLabel?.score ||
                       whiskeyLabels[0]?.score ||
                       (hasJamesonText ? 0.85 : 0);

    return NextResponse.json({
      detected,
      brand: detected ? 'Jameson Irish Whiskey' : 'Unknown',
      confidence: Math.round(confidence * 100) / 100,
      labels: labels.map(l => l.description).filter(Boolean),
      debugInfo: {
        whiskeyLabels: whiskeyLabels.map(l => ({
          label: l.description,
          confidence: l.score
        })),
        hasJamesonText,
        totalLabels: labels.length,
      }
    });
  } catch (error) {
    console.error('Detection error:', error);
    return NextResponse.json(
      { error: 'Detection failed', details: error },
      { status: 500 }
    );
  }
}
```

**Step 5: Install Dependencies**
```bash
npm install @google-cloud/vision
```

**Step 6: Test with Real Jameson Bottles**
```bash
# Take photo of Jameson bottle
# Upload via /scan route
# Check console logs for detection results
# Adjust confidence threshold if needed
```

### 2.3 Optimize ML Detection

**Improvements:**
```typescript
// Cache common results to reduce API calls
const labelCache = new Map<string, any>();

// Rate limiting (prevent abuse)
const rateLimit = new Map<string, number>();

// Image preprocessing (resize to reduce bandwidth)
import sharp from 'sharp';

const optimizedBuffer = await sharp(buffer)
  .resize(800, 800, { fit: 'inside' })
  .jpeg({ quality: 85 })
  .toBuffer();
```

---

## Phase 3: PayPal Payouts Integration (Week 2)

### 3.1 Enable PayPal Payouts

- Create or upgrade to a PayPal business account and verify your business identity.
- Request access to the Payouts product from the PayPal dashboard (usually under Developer → Payouts).
- Create live and sandbox REST API credentials with `payouts` scope.
- Store credentials in Supabase Edge Function secrets: `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, and `PAYPAL_ENV`.
- Decide on standard ($0.25) vs instant (1%) payout speed—standard is the default for MVP to keep costs low.
- Add `PAYPAL_SENDER_EMAIL` for the branded email that appears on receipts.

### 3.2 Build Admin Dashboard

**Create `/app/admin/page.tsx`:**

```typescript
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface PendingReceipt {
  id: string;
  session_id: string;
  image_url: string;
  paypal_email: string;
  paypal_payout_id: string | null;
  uploaded_at: string;
  bottle_scan: {
    bottle_image: string;
    detected_brand: string;
    confidence: number;
  };
}

export default function AdminDashboard() {
  const [receipts, setReceipts] = useState<PendingReceipt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Simple password protection for MVP
    const password = prompt("Enter admin password:");
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      loadPendingReceipts();
    } else {
      alert("Invalid password");
      window.location.href = "/";
    }
  };

  const loadPendingReceipts = async () => {
    const { data, error } = await supabase
      .from('receipts')
      .select(`
        *,
        bottle_scan:bottle_scans(*)
      `)
      .eq('status', 'pending')
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error loading receipts:', error);
      return;
    }

    setReceipts(data || []);
  };

  const handleApprove = async () => {
    const receipt = receipts[currentIndex];
    setIsPaying(true);

    try {
      const response = await fetch("/api/paypal-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptId: receipt.id,
          sessionId: receipt.session_id,
          email: receipt.paypal_email,
          amount: 5.0,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to send PayPal payout");
      }

      const { error: updateError } = await supabase
        .from('receipts')
        .update({
          status: 'paid',
          paypal_payout_id: result.batch_id,
          admin_notes: 'Paid via PayPal Payouts',
        })
        .eq('id', receipt.id);

      if (updateError) {
        throw updateError;
      }

      setReceipts(prev => prev.filter((_, index) => index !== currentIndex));
      setCurrentIndex(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      alert(`Payout failed: ${message}`);
    } finally {
      setIsPaying(false);
    }
  };

  const handleReject = async () => {
    const receipt = receipts[currentIndex];
    const reason = prompt("Reason for rejection:");

    const { error } = await supabase
      .from('receipts')
      .update({
        status: 'rejected',
        admin_notes: reason || 'Rejected by admin'
      })
      .eq('id', receipt.id);

    if (error) {
      alert('Error rejecting receipt');
      return;
    }

    setCurrentIndex(prev => prev + 1);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (isPaying) return;
    if (e.key === 'a' || e.key === 'A') handleApprove();
    if (e.key === 'r' || e.key === 'R') handleReject();
    if (e.key === 'ArrowRight') setCurrentIndex(prev => Math.min(prev + 1, receipts.length - 1));
    if (e.key === 'ArrowLeft') setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, receipts]);

  if (!isAuthenticated) return null;

  const receipt = receipts[currentIndex];

  if (!receipt) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <div className="text-cream text-2xl">No pending receipts</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-cream">Admin Dashboard</h1>
          <div className="text-cream/70">
            {currentIndex + 1} / {receipts.length} pending
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-charcoal/50 border-2 border-whiskey-amber/30 rounded-2xl p-8">
          {/* Session Info */}
          <div className="mb-6 text-cream/70">
            <div>Session: {receipt.session_id}</div>
            <div>Uploaded: {new Date(receipt.uploaded_at).toLocaleString()}</div>
            <div>PayPal Email: {receipt.paypal_email}</div>
            {receipt.paypal_payout_id && (
              <div>Payout Batch: {receipt.paypal_payout_id}</div>
            )}
          </div>

          {/* Images Side by Side */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* Bottle Image */}
            <div>
              <h3 className="text-cream font-bold mb-3">Bottle Scan</h3>
              <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden">
                <Image
                  src={receipt.bottle_scan.bottle_image}
                  alt="Bottle"
                  fill
                  className="object-contain"
                />
              </div>
              <div className="mt-2 text-cream/70 text-sm">
                {receipt.bottle_scan.detected_brand} ({Math.round(receipt.bottle_scan.confidence * 100)}% confidence)
              </div>
            </div>

            {/* Receipt Image */}
            <div>
              <h3 className="text-cream font-bold mb-3">Receipt</h3>
              <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden">
                <Image
                  src={receipt.image_url}
                  alt="Receipt"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={handleApprove}
              size="lg"
              className="flex-1 text-xl py-6 bg-green-600 hover:bg-green-700 disabled:opacity-50"
              disabled={isPaying}
            >
              {isPaying ? "Sending PayPal Payout..." : "✓ Approve & Pay (A)"}
            </Button>
            <Button
              onClick={handleReject}
              size="lg"
              variant="outline"
              className="flex-1 text-xl py-6 border-red-500 text-red-500 hover:bg-red-500/10"
            >
              ✗ Reject (R)
            </Button>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="mt-6 text-center text-cream/50 text-sm">
            Keyboard: A = Approve, R = Reject, → = Next, ← = Previous
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Add to `vercel.json` environment:**
```json
{
  "env": {
    "NEXT_PUBLIC_ADMIN_PASSWORD": "your-secure-password"
  }
}
```

### 3.3 Automated Payouts (Optional - Phase 2)

**If you want full automation, use PayPal Payouts API:**

```bash
# Install PayPal SDK
npm install @paypal/payouts-sdk
```

**Create Supabase Edge Function:**
```typescript
// supabase/functions/send-paypal-payout/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as paypal from "https://esm.sh/@paypal/payouts-sdk@1.1.1"

serve(async (req) => {
  const { email, amount, receipt_id, session_id } = await req.json()

  // Initialize PayPal client
  const environment = new paypal.core.SandboxEnvironment(
    Deno.env.get('PAYPAL_CLIENT_ID'),
    Deno.env.get('PAYPAL_SECRET')
  )
  const client = new paypal.core.PayPalHttpClient(environment)

  // Create payout
  const requestBody = {
    sender_batch_header: {
      sender_batch_id: `batch-${Date.now()}`,
      email_subject: "Burn That Ad Rebate",
      email_message: "You received a $5 rebate!"
    },
    items: [
      {
        recipient_type: "EMAIL",
        amount: {
          value: amount.toString(),
          currency: "USD"
        },
        receiver: email,
        note: "Burn That Ad rebate",
        sender_item_id: receipt_id,
        notification_language: "en-US",
        alternate_notification_email: Deno.env.get('PAYPAL_SENDER_EMAIL') ?? undefined,
        sender_item_description: `Session ${session_id}`
      }
    ]
  }

  const request = new paypal.payouts.PayoutsPostRequest()
  request.requestBody(requestBody)

  try {
    const response = await client.execute(request)

    return new Response(
      JSON.stringify({
        success: true,
        batch_id: response.result.batch_header.payout_batch_id
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

---

## Phase 4: Anti-Fraud Measures (Week 3)

### 4.1 Duplicate Detection

**Image Hashing:**
```bash
npm install sharp image-hash
```

```typescript
// lib/image-hash.ts
import { createHash } from 'crypto';
import sharp from 'sharp';

export async function hashImage(imageBuffer: Buffer): Promise<string> {
  // Resize to standard size
  const normalized = await sharp(imageBuffer)
    .resize(64, 64, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer();

  // Create hash
  return createHash('sha256').update(normalized).digest('hex');
}

// Check for duplicates
export async function isDuplicateImage(hash: string): Promise<boolean> {
  const { data } = await supabase
    .from('bottle_scans')
    .select('id')
    .eq('image_hash', hash)
    .limit(1);

  return (data?.length || 0) > 0;
}
```

### 4.2 Rate Limiting

```typescript
// lib/rate-limit.ts
import { supabase } from './supabase';

export async function checkRateLimit(
  identifier: string, // IP address or user ID
  limit: number = 3,
  windowMs: number = 24 * 60 * 60 * 1000 // 24 hours
): Promise<{ allowed: boolean; remaining: number }> {
  const since = new Date(Date.now() - windowMs);

  const { data } = await supabase
    .from('bottle_scans')
    .select('id')
    .eq('ip_address', identifier)
    .gte('scanned_at', since.toISOString());

  const count = data?.length || 0;
  const remaining = Math.max(0, limit - count);

  return {
    allowed: count < limit,
    remaining
  };
}
```

### 4.3 Session Validation

```typescript
// Middleware to validate session integrity
export async function validateSession(sessionId: string): Promise<boolean> {
  // Check if bottle scan exists
  const { data: bottleScan } = await supabase
    .from('bottle_scans')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (!bottleScan) return false;

  // Check if scan is recent (within 24 hours)
  const scanAge = Date.now() - new Date(bottleScan.scanned_at).getTime();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  if (scanAge > maxAge) return false;

  // Check if receipt already submitted
  const { data: receipt } = await supabase
    .from('receipts')
    .select('id')
    .eq('session_id', sessionId)
    .single();

  // Session valid if no receipt submitted yet
  return !receipt;
}
```

---

## Phase 5: Testing & Monitoring (Week 3-4)

### 5.1 End-to-End Testing

**Test Checklist:**
```bash
# Manual testing
- [ ] Scan real Jameson bottle (detection works)
- [ ] Upload receipt photo (saves to Supabase)
- [ ] Submit with valid PayPal email
- [ ] Admin can view in dashboard
- [ ] Admin can approve/reject
- [ ] Check Supabase Storage (images uploaded)
- [ ] Check database (records created)
- [ ] Test rate limiting (3 scans max)
- [ ] Test duplicate detection (same image)
- [ ] Test expired session (24h old)
```

### 5.2 Add Monitoring

**Vercel Analytics:**
```bash
npm install @vercel/analytics @vercel/speed-insights
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

**Sentry Error Tracking:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 5.3 Performance Optimization

**Image Optimization:**
```typescript
// Compress images before upload
import sharp from 'sharp';

const compressedImage = await sharp(imageBuffer)
  .resize(1200, 1600, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 85 })
  .toBuffer();
```

**Database Optimization:**
```sql
-- Add indexes
CREATE INDEX idx_receipts_status_uploaded ON receipts(status, uploaded_at DESC);
CREATE INDEX idx_bottle_scans_ip ON bottle_scans(ip_address);

-- Vacuum regularly
VACUUM ANALYZE bottle_scans;
VACUUM ANALYZE receipts;
```

---

## Implementation Timeline

### Week 1: Database + ML
- **Day 1-2:** Supabase setup, schema, storage
- **Day 3-4:** Connect frontend to Supabase
- **Day 5-7:** Google Vision API integration

### Week 2: Admin + Payouts
- **Day 1-3:** Build admin dashboard
- **Day 4-5:** Integrate PayPal Payouts API & sandbox testing
- **Day 6-7:** Testing with real bottles/receipts

### Week 3: Security + Polish
- **Day 1-2:** Anti-fraud measures
- **Day 3-4:** Rate limiting, duplicate detection
- **Day 5-7:** End-to-end testing

### Week 4: Launch Prep
- **Day 1-2:** Performance optimization
- **Day 3-4:** Documentation
- **Day 5-7:** Pilot launch! 🚀

---

## Cost Estimates (1000 Users)

### Supabase
- Free tier: 50k rows, 1GB storage
- **Cost:** $0 (within free tier)

### Google Vision API
- 1000 scans × $1.50/1000 = $1.50
- **Cost:** $1.50

### Vercel
- Free tier: 100 GB bandwidth
- **Cost:** $0 (within free tier)

### PayPal Payouts (Standard)
- $5 × 1000 users = $5,000 in rebates
- PayPal fees: $0.25 × 1000 = $250
- **Total Payout Cost:** $5,250 (campaign budget)

### Total Monthly Cost
- **Infrastructure:** ~$2
- **Rebates + Fees:** $5,250
- **Grand Total:** ~$5,252

---

## Next Immediate Steps

1. **Create Supabase project** → 10 min
2. **Run SQL migrations** → 5 min
3. **Add environment variables** → 5 min
4. **Test database connection** → 10 min
5. **Update `/scan` to save to DB** → 30 min
6. **Test full flow** → 15 min

**Total setup time:** ~1.5 hours

Ready to start with Supabase setup?
