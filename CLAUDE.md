# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Burn That Ad" - A mobile-first Next.js application for Keeper's Heart Whiskey's marketing campaign. Consumers scan competitor whiskey bottles with their phone camera, watch an AR "burn" animation, upload a receipt showing they purchased Keeper's Heart, and receive a $5-10 rebate via PayPal Payouts. See [OVERVIEW.md](OVERVIEW.md) for complete project details.

**Status:** 75% complete - Production integration phase focusing on Google Vision API and PayPal Payouts integration.

## Development Commands

```bash
# Development
npm run dev           # Start Next.js dev server on localhost:3000
npm run build         # Build production bundle
npm start             # Start production server
npm run lint          # Run Next.js ESLint

# No test suite configured yet
```

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

- **[/api/detect-bottle/route.ts](app/api/detect-bottle/route.ts)** - Google Vision API integration for bottle brand detection (15+ competitor brands). Returns `{ detected, brand, confidence, boundingBox, expandedBoundingBox }`. Uses bounding box normalization for overlay positioning.
- **[/api/validate-receipt/route.ts](app/api/validate-receipt/route.ts)** - Google Vision API OCR to extract receipt text and validate "Keeper's Heart" purchase
- **[/api/validate-image/route.ts](app/api/validate-image/route.ts)** - Image validation (format, size, quality, duplicate detection via perceptual hashing in [lib/image-hash.ts](lib/image-hash.ts))
- **[/api/check-rate-limit/route.ts](app/api/check-rate-limit/route.ts)** - IP-based rate limiting (3 scans per 24 hours)
- **[/api/paypal-payout/route.ts](app/api/paypal-payout/route.ts)** - PayPal Payouts API integration (admin triggers payout after receipt approval)
- **[/api/morph-bottle/route.ts](app/api/morph-bottle/route.ts)** - Gemini API experiment for bottle morphing animation (in progress, see [MORPH_DEBUGGING.md](MORPH_DEBUGGING.md))

### Database Schema (Supabase)

Schema defined in [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql):

**Tables:**
- `users` - Optional user info (email, age verification)
- `scans` - QR scans and coupon codes (legacy - being replaced by `bottle_scans`)
- `bottle_scans` - Bottle detection records (session_id, detected_brand, confidence, bottle_image URL, status)
- `receipts` - Receipt uploads (session_id FK, receipt_image URL, paypal_email, status: pending/approved/rejected/paid, rebate_amount, paypal_payout_id)

**Storage Buckets:**
- `bottle-images` - Bottle scan photos
- `receipt-images` - Receipt photos

**Key Patterns:**
- Session ID links bottle scan to receipt (one-to-one relationship)
- Status transitions: `pending` → `approved` → `paid` (or `rejected`)
- Admin manually approves receipts, then triggers PayPal payout API

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

**Duplicate Prevention:** Perceptual image hashing in [lib/image-hash.ts](lib/image-hash.ts) detects same photo reused (Hamming distance threshold).

### Animation System

Multiple burn animation implementations (experimental):

- **[components/burn-animation.tsx](components/burn-animation.tsx)** - Framer Motion-based burn effect
- **[components/LottieBurnAnimation.tsx](components/LottieBurnAnimation.tsx)** - Lottie animation player
- **[components/GifBurnAnimation.tsx](components/GifBurnAnimation.tsx)** - GIF-based animation
- **[components/ThreeBurnAnimation.tsx](components/ThreeBurnAnimation.tsx)** - Three.js particle system
- **[components/BottleMorphAnimation.tsx](components/BottleMorphAnimation.tsx)** - Bottle → Keeper's Heart morph using Gemini API (in progress)

**Current Issue:** Bottle morph animation positioning/timing needs refinement. See [MORPH_DEBUGGING.md](MORPH_DEBUGGING.md) for details.

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
```

**Setup Guides:**
- Supabase: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)
- Google Vision: [docs/GOOGLE_VISION_SETUP.md](docs/GOOGLE_VISION_SETUP.md)
- PayPal Payouts: [PAYPAL_QUICK_START.md](PAYPAL_QUICK_START.md)

## Key Files to Understand

When working on specific features, refer to these files:

**Session Management:**
- [lib/session-manager.ts](lib/session-manager.ts) - Session ID generation and persistence
- [lib/local-storage.ts](lib/local-storage.ts) - LocalStorage utilities for scan tracking

**ML/Computer Vision:**
- [app/api/detect-bottle/route.ts](app/api/detect-bottle/route.ts) - Bottle detection logic (15+ competitor brands defined here)
- [app/api/validate-receipt/route.ts](app/api/validate-receipt/route.ts) - Receipt OCR validation

**Payment Processing:**
- [app/api/paypal-payout/route.ts](app/api/paypal-payout/route.ts) - PayPal Payouts API integration

**Admin Dashboard:**
- [app/admin/page.tsx](app/admin/page.tsx) - Receipt review interface with approve/reject workflow

**User Flow:**
- [app/page.tsx](app/page.tsx) - Age gate (entry point)
- [app/intro/page.tsx](app/intro/page.tsx) - "How It Works" screen
- [app/scan/page.tsx](app/scan/page.tsx) - QR code scanner (redirects to microsite)
- [app/scanning/\[sessionId\]/page.tsx](app/scanning/[sessionId]/page.tsx) - Live bottle detection camera
- [app/upload/\[sessionId\]/page.tsx](app/upload/[sessionId]/page.tsx) - Receipt upload
- [app/confirmation/\[sessionId\]/page.tsx](app/confirmation/[sessionId]/page.tsx) - Upload confirmation
- [app/success/\[sessionId\]/page.tsx](app/success/[sessionId]/page.tsx) - Final success screen

## Common Debugging Patterns

**Session Lost Between Pages:**
- Check `sessionStorage.getItem('kh_current_session')` in browser DevTools
- Verify session ID passed in URL params (`/scanning/[sessionId]`)
- Session IDs have format: `kh-{timestamp}-{uuid}`

**Google Vision API Errors:**
- Verify `GOOGLE_VISION_API_KEY` is set in `.env.local`
- Check API quota in Google Cloud Console
- Test with sample image: `curl -X POST http://localhost:3000/api/detect-bottle -F "image=@test-bottle.jpg"`

**Supabase Connection Issues:**
- Verify environment variables are prefixed with `NEXT_PUBLIC_` for client-side usage
- Check Supabase project status in dashboard
- Review RLS policies in [supabase/migrations/001_initial_schema.sql](supabase/migrations/001_initial_schema.sql)

**Bottle Bounding Box Positioning:**
- API returns `normalizedBoundingBox` (x, y, width, height as 0-1 fractions)
- Convert to pixels: `x * imageWidth`, `y * imageHeight`
- Use `expandedBoundingBox` for overlay positioning (5% larger to cover edges)

## Brand Design System

**Colors:**
- Primary: Whiskey Amber (`#B8860B`, `#CD853F`)
- Secondary: Cream (`#FFF8DC`)
- Accent: Emerald (`#2C5F2D`), Copper (`#B87333`)

**Typography:**
- Headlines: Playfair Display (serif, elegant)
- Body: Inter (sans-serif, clean)

**Component Standards:**
- Border radius: `12px`
- Button padding: `16px` vertical, `32px` horizontal
- Minimum tap target: `44px` (mobile accessibility)

## Legal & Compliance

- Age gating required (21+ verification)
- Privacy policy and terms of service needed for production
- Comparative advertising compliance (competitor brands)
- Alcohol marketing regulations (responsible drinking messaging)
