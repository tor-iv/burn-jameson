# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Burn That Ad" - A mobile-first Next.js application for Keeper's Heart Whiskey's marketing campaign. Consumers scan competitor whiskey bottles with their phone camera, watch an AR "burn" animation, upload a receipt showing they purchased Keeper's Heart, and receive a $5-10 rebate via PayPal Payouts. See [OVERVIEW.md](OVERVIEW.md) for complete project details.

**Status:** 85% complete - Production integration phase. Recent optimizations achieved 40-50% faster API performance (see [PERFORMANCE_OPTIMIZATIONS.md](PERFORMANCE_OPTIMIZATIONS.md)).

## Development Commands

```bash
npm run dev           # Start Next.js dev server on localhost:3000
npm run build         # Build production bundle
npm start             # Start production server
npm run lint          # Run ESLint
```

No test suite configured yet.

## Technology Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS 4
- **Animations:** Framer Motion, Three.js (@react-three/fiber, @react-three/drei)
- **Database:** Supabase (PostgreSQL + Storage)
- **ML/Computer Vision:** Google Cloud Vision API (bottle detection, receipt OCR)
- **Payments:** PayPal Payouts API (direct consumer rebates)
- **Hosting:** Vercel

## Architecture Overview

### Session Management Flow

The app uses **session-based tracking** (no user authentication required):

1. **Session Creation:** User lands on site → Age gate → `generateSessionId()` creates unique session ID (format: `kh-{timestamp}-{uuid}`)
2. **Session Persistence:** Session ID stored in `sessionStorage` via [lib/session-manager.ts](lib/session-manager.ts)
3. **Bottle Scan:** Session linked to bottle detection → Creates `bottle_scans` record in Supabase
4. **Receipt Upload:** Same session ID used to link receipt → Creates `receipts` record
5. **Admin Review:** Admin dashboard shows bottle + receipt side-by-side for approval

**Critical:** Session IDs must persist through the entire flow (scan → upload → confirmation). Check `sessionStorage` when debugging.

### API Route Architecture

All API routes in [app/api/](app/api/) are Next.js route handlers (not Express). Key endpoints:

- **[detect-bottle/route.ts](app/api/detect-bottle/route.ts)** - Google Vision API integration. Detects 15+ competitor brands (Jameson, Bulleit, Woodford Reserve, etc. defined in `COMPETITOR_BRANDS` object). Returns `{ detected, brand, confidence, normalizedBoundingBox, expandedBoundingBox }`. Uses OBJECT_LOCALIZATION feature for accurate bottle bounding boxes, with 5% expansion for animation overlay.
- **[validate-receipt/route.ts](app/api/validate-receipt/route.ts)** - Google Vision API OCR to extract receipt text and validate "Keeper's Heart" purchase
- **[validate-image/route.ts](app/api/validate-image/route.ts)** - Image validation (format, size 100KB-10MB, quality, duplicate detection via perceptual hashing in [lib/image-hash.ts](lib/image-hash.ts))
- **[check-rate-limit/route.ts](app/api/check-rate-limit/route.ts)** - IP-based rate limiting (3 scans per 24 hours)
- **[paypal-payout/route.ts](app/api/paypal-payout/route.ts)** - PayPal Payouts API integration (admin triggers payout after receipt approval)
- **[morph-bottle-simple/route.ts](app/api/morph-bottle-simple/route.ts)** - Gemini API for bottle morphing animation (experimental, see [MORPH_DEBUGGING.md](MORPH_DEBUGGING.md))

### Database Schema (Supabase)

Schema defined in [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql):

**Tables:**
- `users` - Optional user info (email, age verification)
- `scans` - QR scans and coupon codes (legacy - being replaced by `bottle_scans`)
- `bottle_scans` - Bottle detection records (session_id, detected_brand, confidence, bottle_image URL, status, image_hash for duplicate detection)
- `receipts` - Receipt uploads (session_id FK, receipt_image URL, paypal_email, status: pending/approved/rejected/paid, rebate_amount, paypal_payout_id, image_hash for duplicate detection)

**Storage Buckets:**
- `bottle-images` - Bottle scan photos
- `receipt-images` - Receipt photos

**Database Migrations:**
- [001_initial_schema.sql](supabase/migrations/001_initial_schema.sql) - Initial tables (users, scans, receipts)
- [002_bottle_scan_schema.sql](supabase/migrations/002_bottle_scan_schema.sql) - Bottle scans table
- [003_receipt_fraud_prevention.sql](supabase/migrations/003_receipt_fraud_prevention.sql) - Receipt fraud prevention (adds image_hash, indexes for duplicate detection and rate limiting)

**Key Patterns:**
- Session ID links bottle scan to receipt (one-to-one relationship)
- Status transitions: `pending` → `approved` → `paid` (or `rejected`)
- Admin manually approves receipts, then triggers PayPal payout API
- SHA-256 image hashing prevents duplicate bottle/receipt submissions
- Indexed lookups for fast duplicate detection and PayPal email rate limiting

### Supabase Client Usage

Two client patterns in use:

1. **[lib/supabase.ts](lib/supabase.ts)** - Client-side Supabase client (uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
2. **[lib/supabase-helpers.ts](lib/supabase-helpers.ts)** - Server-side helpers for database operations

**Important:** When working with Supabase:
- Client-side: Use `createClient()` from [lib/supabase.ts](lib/supabase.ts)
- API routes: Create client inside route handler (Next.js API routes run server-side)
- Storage URLs: Use `supabase.storage.from('bucket').getPublicUrl(path)` for public access

### Image Processing Pipeline

1. **Capture:** [components/camera-scanner.tsx](components/camera-scanner.tsx) uses WebRTC `getUserMedia()` to access camera
2. **Upload:** Image sent to `/api/validate-image` for basic validation
3. **Detection:** Image sent to `/api/detect-bottle` → Google Vision API → Returns brand + bounding box
4. **Storage:** Valid images uploaded to Supabase Storage via `supabase.storage.from('bottle-images').upload()`
5. **Display:** Bottle bounding box used to position burn animation overlay ([components/BottleMorphAnimation.tsx](components/BottleMorphAnimation.tsx))

**Fraud Prevention (6-Layer System):**
1. **Bottle Image Hashing** - SHA-256 hash prevents same bottle photo from being scanned twice ([lib/image-hash.ts](lib/image-hash.ts))
2. **IP Rate Limiting** - 3 bottle scans per IP per 24 hours ([lib/supabase-helpers.ts](lib/supabase-helpers.ts))
3. **Session Validation** - 1 receipt per session, 24-hour expiry ([lib/supabase-helpers.ts](lib/supabase-helpers.ts))
4. **Receipt Image Hashing** - SHA-256 hash prevents same receipt from being submitted multiple times (configurable via `NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK`)
5. **PayPal Email Rate Limiting** - 1 payout per email per configurable period (default 30 days, configurable via `ENABLE_PAYPAL_EMAIL_RATE_LIMIT`)
6. **Manual Admin Review** - Human verification of all receipts before payout ([app/admin/page.tsx](app/admin/page.tsx))

See [FRAUD_PREVENTION_SUMMARY.md](FRAUD_PREVENTION_SUMMARY.md) and [docs/FRAUD_PREVENTION.md](docs/FRAUD_PREVENTION.md) for complete details.

### Animation System

Multiple burn animation implementations (experimental):

- **burn-animation.tsx** - Framer Motion-based burn effect
- **LottieBurnAnimation.tsx** - Lottie animation player
- **GifBurnAnimation.tsx** - GIF-based animation
- **ThreeBurnAnimation.tsx** - Three.js particle system
- **BottleMorphAnimation.tsx** / **SimpleBottleMorph.tsx** - Bottle → Keeper's Heart morph using Gemini API

**Current Issue:** Bottle morph animation displaying correctly. See [MORPH_DEBUGGING.md](MORPH_DEBUGGING.md) for details.

## Environment Variables

Copy [.env.example](.env.example) to `.env.local`:

```bash
# Supabase (required for database/storage)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Google Cloud Vision API (required for bottle detection)
GOOGLE_VISION_API_KEY=your_api_key

# Gemini API (optional - for bottle morph animation)
GEMINI_API_KEY=your_gemini_key

# PayPal Payouts (required for rebate processing)
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_client_secret
PAYPAL_ENVIRONMENT=sandbox  # or 'live' for production

# Admin Dashboard (simple password protection)
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password

# Fraud Prevention Settings (optional - defaults to enabled)
NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=true  # Prevent duplicate receipt submissions
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=true         # Limit payouts per email address
PAYPAL_EMAIL_RATE_LIMIT_DAYS=30             # Rate limit period in days (default: 30)
```

**Setup Guides:**
- Supabase: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)
- Google Vision: [docs/GOOGLE_VISION_SETUP.md](docs/GOOGLE_VISION_SETUP.md)
- PayPal Payouts: [PAYPAL_QUICK_START.md](PAYPAL_QUICK_START.md)

## Key Implementation Files

**Session Management:**
- [lib/session-manager.ts](lib/session-manager.ts) - Session ID generation (`kh-{timestamp}-{uuid}`) and sessionStorage persistence
- [lib/local-storage.ts](lib/local-storage.ts) - LocalStorage utilities for scan tracking

**ML/Computer Vision:**
- [app/api/detect-bottle/route.ts](app/api/detect-bottle/route.ts) - Bottle detection with `COMPETITOR_BRANDS` object defining 15+ brands. Uses Google Vision REST API with LABEL_DETECTION, TEXT_DETECTION, LOGO_DETECTION, and OBJECT_LOCALIZATION features. Returns normalized bounding boxes for animation overlay.
- [app/api/validate-receipt/route.ts](app/api/validate-receipt/route.ts) - Receipt OCR validation

**Payment Processing:**
- [app/api/paypal-payout/route.ts](app/api/paypal-payout/route.ts) - PayPal Payouts API integration with email rate limiting

**Fraud Prevention:**
- [lib/image-hash.ts](lib/image-hash.ts) - SHA-256 image hashing for bottle AND receipt duplicate detection
- [lib/supabase-helpers.ts](lib/supabase-helpers.ts) - IP rate limiting, session validation, duplicate detection logic
- [supabase/migrations/003_receipt_fraud_prevention.sql](supabase/migrations/003_receipt_fraud_prevention.sql) - Receipt fraud prevention schema (image_hash, indexes)
- [FRAUD_PREVENTION_SUMMARY.md](FRAUD_PREVENTION_SUMMARY.md) - Quick reference for fraud prevention features

**User Flow Pages:**
- [app/page.tsx](app/page.tsx) - Age gate (entry point)
- [app/intro/page.tsx](app/intro/page.tsx) - Campaign intro
- [app/scanning/\[sessionId\]/page.tsx](app/scanning/[sessionId]/page.tsx) - Live bottle detection camera with animation overlay
- [app/upload/\[sessionId\]/page.tsx](app/upload/[sessionId]/page.tsx) - Receipt upload
- [app/confirmation/\[sessionId\]/page.tsx](app/confirmation/[sessionId]/page.tsx) - Upload confirmation
- [app/success/\[sessionId\]/page.tsx](app/success/[sessionId]/page.tsx) - Final success screen

**Admin:**
- [app/admin/page.tsx](app/admin/page.tsx) - Receipt review interface with approve/reject workflow

## Common Debugging Patterns

**Session Lost Between Pages:**
- Check `sessionStorage.getItem('kh_current_session')` in browser DevTools
- Verify session ID passed in URL params (format: `kh-{timestamp}-{uuid}`)

**Google Vision API Errors:**
- Verify `GOOGLE_VISION_API_KEY` is set in `.env.local`
- Check API quota in Google Cloud Console
- Test endpoint: `curl -X POST http://localhost:3000/api/detect-bottle -F "image=@test-bottle.jpg"`

**Supabase Connection Issues:**
- Client-side variables must be prefixed with `NEXT_PUBLIC_`
- Check RLS policies in [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)

**Bottle Bounding Box Positioning:**
- API returns `normalizedBoundingBox` with x, y, width, height as 0-1 fractions
- Convert to pixels: `x * imageWidth`, `y * imageHeight`
- Use `expandedBoundingBox` for animation overlay (5% larger)

**Fraud Prevention Testing:**
- **Disable receipt duplicate detection:** Set `NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=false` in `.env.local` (allows same receipt to be uploaded multiple times for testing)
- **Disable PayPal email rate limiting:** Set `ENABLE_PAYPAL_EMAIL_RATE_LIMIT=false` in `.env.local` (allows multiple payouts to same email for testing)
- **Check receipt hash:** Query `SELECT image_hash FROM receipts WHERE id = 'xxx'` in Supabase SQL editor
- **Check email rate limit:** Look for "must wait X days" error message in PayPal payout API response
- **Production:** Always enable both fraud prevention features (`true`) before launch

## Implementation Notes

**Adding New Competitor Brands:**
Edit `COMPETITOR_BRANDS` object in [app/api/detect-bottle/route.ts](app/api/detect-bottle/route.ts):
```typescript
const COMPETITOR_BRANDS = {
  'brand-keyword': 'Brand Display Name',
  // ...
};
```

**Bounding Box Flow:**
1. Google Vision OBJECT_LOCALIZATION returns bottle location (most accurate)
2. `normalizeBoundingPoly()` converts vertices to 0-1 normalized coordinates
3. `expandNormalizedBox()` adds 5% margin for animation overlay
4. Client converts normalized coordinates to pixels for rendering

**PayPal Payouts Flow:**
1. Admin reviews receipt in dashboard
2. Admin clicks "Approve & Pay" button
3. Frontend calls `/api/paypal-payout` with receipt ID
4. API checks email rate limiting (1 payout per email per 30 days by default)
5. If allowed, API creates payout batch to user's PayPal email
6. Status updates to `paid` with `paypal_payout_id` and `paid_at` timestamp

**Fraud Prevention Configuration:**
- **Production (recommended):** All 6 layers enabled by default
- **Testing:** Disable receipt hash check and email rate limiting via ENV variables
- **Layers 1-3 and 6 always enabled:** Bottle hashing, IP rate limiting, session validation, manual review
- **Layers 4-5 configurable:** Receipt hashing and PayPal email rate limiting can be toggled for testing
