# Burn That Ad - Keeper's Heart Whiskey Campaign

**Status:** 80% Complete - Production Integration Phase
**Tech Stack:** Next.js 15 • React 19 • TypeScript • Tailwind CSS • Supabase • Google Vision API • PayPal Payouts
**Last Updated:** 2025-10-16

A mobile-first web application for Keeper's Heart Whiskey's AR marketing campaign. Consumers scan competitor whiskey bottles with their phone camera, watch an AR "burn" animation, upload a receipt showing they purchased Keeper's Heart, and receive a $5-10 rebate via PayPal Payouts (1-2 days).

**Key Differentiator:** Bar/distributor-agnostic. Consumer gets paid directly. Zero friction for venues.

---

## 🎯 Quick Understanding

**What This App Does:**
- Users point their phone at a competitor whiskey bottle (Jameson, Bulleit, etc.)
- Google Vision API detects the bottle brand in real-time using ML
- AR "burn" animation plays over the bottle
- User purchases Keeper's Heart whiskey and uploads receipt photo
- Admin reviews and approves receipts in dashboard
- PayPal Payouts API sends $5-10 rebate directly to user's PayPal account
- **No POS integration. No bar partnerships. Direct to consumer.**

**Technical Architecture:**
- **Frontend:** Next.js 15 (App Router) with React 19 and TypeScript
- **Styling:** Tailwind CSS with custom Keeper's Heart brand theme
- **ML/AI:** Google Cloud Vision API for bottle detection (OBJECT_LOCALIZATION) and receipt OCR (TEXT_DETECTION)
- **Database:** Supabase (PostgreSQL) with two storage buckets (bottles, receipts)
- **Payments:** PayPal Payouts API ($0.25 per payout, 1-2 day standard)
- **Session Management:** Session-based tracking (no user login required) - session ID links bottle scan → receipt upload
- **Fraud Prevention:** Rate limiting, image hashing, duplicate detection, manual admin review

**What's Working:**
- ✅ All pages/UI complete (age gate, scanning, upload, admin dashboard)
- ✅ Google Vision API integrated (bottle detection + receipt OCR)
- ✅ PayPal Payouts API integrated (code complete, awaiting account setup)
- ✅ Database schema with payout tracking
- ✅ Image validation, duplicate prevention, rate limiting
- ✅ Session management from scan → receipt → payout

**What Needs Work:**
- 📋 PayPal Business account setup (manual - 1-2 hours)
- 📋 Bottle animation sizing/positioning fixes (too small currently)
- 📋 Legal pages (Privacy Policy, Terms, Official Rules)
- 📋 Production deployment to Vercel

**Estimated Time to Launch:** 2-3 days

---

## 📖 Essential Documentation

**Start Here:**
- **[OVERVIEW.md](OVERVIEW.md)** - Complete project overview, business model, competitor brands (15 brands tracked)
- **[PROGRESS.md](PROGRESS.md)** - Detailed progress tracker (80% complete, see what's done vs pending)
- **[CLAUDE.md](CLAUDE.md)** - AI development guidelines, architecture patterns, debugging tips

**Integration Guides:**
- **[PAYPAL_INTEGRATION_PLAN.md](PAYPAL_INTEGRATION_PLAN.md)** - PayPal Payouts setup (code complete, awaiting account setup)
- **[docs/GOOGLE_VISION_SETUP.md](docs/GOOGLE_VISION_SETUP.md)** - Google Vision API configuration (bottle detection + receipt OCR)
- **[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)** - Database and storage configuration

**Other Docs:**
- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) - Full feature specifications
- [docs/IMAGE_VALIDATION.md](docs/IMAGE_VALIDATION.md) - Image validation implementation
- [PAYPAL_QUICK_START.md](PAYPAL_QUICK_START.md) - Quick reference for PayPal integration

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (with npm)
- **Supabase account** (free tier available - [supabase.com](https://supabase.com))
- **Google Cloud account** (for Vision API - free tier with $300 credit)
- **PayPal Business account** (for payouts - see [PAYPAL_INTEGRATION_PLAN.md](PAYPAL_INTEGRATION_PLAN.md))

### Installation

1. **Clone and install dependencies:**
```bash
git clone <your-repo-url>
cd burn-jameson
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:
```bash
# Supabase (required for database/storage)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Google Cloud Vision API (required for bottle detection)
GOOGLE_VISION_API_KEY=your_api_key

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
- PayPal Payouts: [PAYPAL_INTEGRATION_PLAN.md](PAYPAL_INTEGRATION_PLAN.md)

3. **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 📁 Project Structure

```
/app
  /page.tsx                           # Age gate (entry point) ✅
  /intro/page.tsx                     # Campaign intro "How It Works" ✅
  /scanning/[sessionId]/page.tsx      # Live bottle detection camera with AR overlay ✅
  /upload/[sessionId]/page.tsx        # Receipt upload with PayPal email collection ✅
  /confirmation/[sessionId]/page.tsx  # Upload confirmation ✅
  /success/[sessionId]/page.tsx       # Final success screen ✅
  /admin/page.tsx                     # Receipt review dashboard with approve/payout ✅

  /api
    /detect-bottle/route.ts           # Google Vision API - bottle detection ✅
    /validate-receipt/route.ts        # Google Vision API - receipt OCR validation ✅
    /validate-image/route.ts          # Image validation (format, size, quality) ✅
    /check-rate-limit/route.ts        # IP-based rate limiting ✅
    /paypal-payout/route.ts           # PayPal Payouts API integration ✅

/components
  /ui/                                # shadcn/ui components ✅
  /camera-scanner.tsx                 # WebRTC camera with live detection ✅
  /BottleMorphAnimation.tsx           # Bottle burn/morph animation (experimental) ✅
  /burn-animation.tsx                 # Framer Motion burn effect ✅
  /LottieBurnAnimation.tsx            # Lottie animation player ✅
  /ThreeBurnAnimation.tsx             # Three.js particle system ✅

/lib
  /supabase.ts                        # Client-side Supabase client ✅
  /supabase-helpers.ts                # Server-side database helpers ✅
  /session-manager.ts                 # Session ID generation & persistence ✅
  /local-storage.ts                   # LocalStorage utilities ✅
  /image-hash.ts                      # Perceptual image hashing (duplicate detection) ✅

/supabase/migrations
  /001_initial_schema.sql             # Database schema (users, scans, receipts) ✅
  /002_bottle_scan_schema.sql         # Bottle scans table ✅
```

**Key Architecture Patterns:**
- **Session-based tracking** (no user auth required): Session ID links bottle scan → receipt upload
- **Next.js API routes** (not Express): All backend logic in `/app/api/`
- **Google Vision API**: Bottle detection (OBJECT_LOCALIZATION) + receipt OCR (TEXT_DETECTION)
- **PayPal Payouts**: Direct rebate payments via REST API
- **Supabase**: PostgreSQL database + file storage buckets

---

## 🗄️ Database Schema

**Supabase PostgreSQL + Storage**

### Tables

**`users`** - Optional user tracking
- `id` (uuid, primary key)
- `email` (text, nullable)
- `age_verified_at` (timestamp)

**`bottle_scans`** - Bottle detection records
- `id` (uuid, primary key)
- `session_id` (text, unique) - Links to receipts
- `bottle_image` (text) - Supabase Storage URL
- `detected_brand` (text) - e.g. "Jameson Irish Whiskey"
- `confidence` (float) - ML confidence score (0-1)
- `status` (enum) - `pending_receipt` | `completed` | `rejected`
- `scanned_at` (timestamp)
- `ip_address` (text) - Rate limiting
- `image_hash` (text) - Duplicate detection

**`receipts`** - Receipt uploads with payout tracking
- `id` (uuid, primary key)
- `session_id` (text, FK) - Links to bottle_scans
- `image_url` (text) - Supabase Storage URL
- `paypal_email` (text) - Recipient PayPal email
- `status` (enum) - `pending` | `approved` | `rejected` | `paid`
- `rebate_amount` (decimal) - Default 5.00 or 10.00
- `paypal_payout_id` (text) - PayPal transaction tracking
- `paid_at` (timestamp) - When payout was sent
- `admin_notes` (text) - Review notes

### Storage Buckets
- `bottle-images` - Scanned bottle photos
- `receipt-images` - Receipt photos

**Session Flow:**
1. User scans bottle → `bottle_scans` record created with unique `session_id`
2. User uploads receipt → `receipts` record created with same `session_id` (FK link)
3. Admin reviews → Approves/rejects receipt
4. Admin triggers payout → PayPal API called, status → `paid`

**See:** [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) for complete setup instructions

---

## 🎨 Tech Stack

**Frontend:**
- Next.js 15 (App Router) - React 19, TypeScript
- Tailwind CSS 4 - Custom brand theme
- Framer Motion - Animations & transitions
- Three.js (@react-three/fiber, @react-three/drei) - AR effects

**Backend:**
- Next.js API Routes - Server-side endpoints
- Supabase - PostgreSQL database + file storage
- Google Cloud Vision API - ML bottle detection & receipt OCR
- PayPal Payouts API - Direct consumer rebates

**Hosting & Infrastructure:**
- Vercel - Frontend hosting (recommended)
- Supabase Cloud - Database & storage
- Google Cloud Platform - Vision API
- PayPal - Payment processing

---

## 🎯 Current Status (80% Complete)

### ✅ Completed Features

**Core Functionality:**
- [x] Age gate (21+ verification)
- [x] Campaign intro with "How It Works"
- [x] Live bottle detection camera (WebRTC)
- [x] Google Vision API integration (bottle detection + receipt OCR)
- [x] Receipt upload with PayPal email collection
- [x] Admin dashboard with approve/reject workflow
- [x] PayPal Payouts API integration (code complete)
- [x] Session-based tracking (no user login required)
- [x] Image validation (format, size, quality)
- [x] Duplicate prevention (perceptual image hashing)
- [x] Rate limiting (3 scans per IP per 24 hours)
- [x] Database schema with payout tracking

**15 Competitor Brands Tracked:**
- Irish: Jameson, Tullamore Dew, Bushmills, Redbreast, Writers' Tears, Teeling
- Scotch: Johnnie Walker
- American: Bulleit, Woodford Reserve, Maker's Mark, Angel's Envy, High West, Michter's, Knob Creek, Four Roses

### 📋 Remaining Tasks (2-3 days)

**Manual Setup (You):**
- [ ] PayPal Business account creation + API credentials
- [ ] PayPal sandbox testing
- [ ] Legal pages (Privacy Policy, Terms of Service, Official Rules)
- [ ] Production deployment to Vercel

**Code Fixes (Claude Code can help):**
- [ ] Fix bottle animation sizing/positioning (currently too small)
- [ ] Improve burn effect visibility

**See [PROGRESS.md](PROGRESS.md) for detailed task breakdown**

---

## 🚀 How It Works (User Journey)

1. **Discover** - Consumer sees QR code or finds via mobile ads
2. **Age Gate** - Must verify 21+ to continue
3. **Scan** - Point phone camera at competitor whiskey bottle (Jameson, Bulleit, etc.)
4. **Detect** - Google Vision API identifies bottle brand in real-time
5. **Animate** - AR "burn" effect plays over detected bottle
6. **Upload** - Submit receipt photo showing Keeper's Heart purchase
7. **Review** - Admin approves/rejects receipt in dashboard
8. **Get Paid** - Receive $5-10 rebate via PayPal (1-2 days)

**Key Innovation:** No POS integration needed. No bar/distributor involvement. Direct consumer payment.

---

## 💰 Business Model & Cost Analysis

**Per Transaction:**
- Rebate: $5.00 - $10.00
- PayPal fee: $0.25 (Standard 1-2 day payout)
- ML API cost: ~$0.003
- **Total cost per conversion:** $5.25 - $10.25

**Campaign Budget Examples:**
- 100 users: $525 - $1,025
- 500 users: $2,625 - $5,125
- 1,000 users: $5,250 - $10,250

**ROI Calculation:**
- Assume $30 bottle, 40% margin = $12 profit
- Minus $5.25-10.25 acquisition cost
- **Net profit:** $1.75 - $6.75 per conversion
- **Lifetime value:** Higher with repeat purchases

**See [OVERVIEW.md](OVERVIEW.md) for detailed business model analysis**

---

## 🔧 Development Commands

```bash
npm run dev           # Start Next.js dev server (localhost:3000)
npm run build         # Build production bundle
npm start             # Start production server
npm run lint          # Run ESLint
```

**No test suite configured yet** (manual testing currently)

---

## 🛡️ Fraud Prevention & Security

**6-Layer Fraud Prevention System:**

1. ✅ **Bottle Image Hashing** - Prevents same bottle photo from being scanned twice
2. ✅ **IP Rate Limiting** - 3 bottle scans per IP per 24 hours
3. ✅ **Session Validation** - 1 receipt per session, 24-hour expiry
4. ✅ **Receipt Image Hashing** - Prevents same receipt photo from being submitted multiple times (configurable)
5. ✅ **PayPal Email Rate Limiting** - 1 payout per email per 30 days (configurable)
6. ✅ **Manual Admin Review** - Human verification of all receipts before payout

**All configurable via environment variables for testing flexibility.**

**Key Features:**
- Age gating (21+ verification required)
- Image validation (format, size, quality checks)
- Device fingerprinting (user agent tracking)
- SHA-256 image hashing for duplicate detection
- Configurable rate limits via ENV variables

**See:** [docs/FRAUD_PREVENTION.md](docs/FRAUD_PREVENTION.md) for complete guide

**Production Enhancements (Future):**
- ML content validation (verify actual bottle/receipt in images)
- OCR verification (extract "Keeper's Heart" from receipts)
- Geofencing (limit to specific states/regions)
- Pattern detection (flag suspicious activity)

---

## 🔒 Legal & Compliance

**Required for Production:**
- [ ] Privacy Policy
- [ ] Terms of Service
- [ ] Official Rules (sweepstakes laws)
- [ ] AMOE provision (some states require)
- [ ] Legal review by attorney

**Compliance Considerations:**
- Age gating (21+ verification required)
- Comparative advertising laws
- Tied-house laws (alcohol industry)
- State-specific alcohol marketing regulations
- Responsible drinking messaging

---

## 🐛 Debugging & Common Issues

**Session Lost Between Pages:**
- Check `sessionStorage.getItem('kh_current_session')` in browser DevTools
- Verify session ID in URL params (format: `kh-{timestamp}-{uuid}`)

**Google Vision API Errors:**
- Verify `GOOGLE_VISION_API_KEY` in `.env.local`
- Check API quota in Google Cloud Console
- Test: `curl -X POST http://localhost:3000/api/detect-bottle -F "image=@test.jpg"`

**Supabase Connection Issues:**
- Client-side variables must be prefixed with `NEXT_PUBLIC_`
- Check RLS policies in Supabase dashboard

**Bottle Animation Issues:**
- Bounding box too small: API returns normalized coordinates (0-1), convert to pixels
- Animation not visible: Check `expandedBoundingBox` calculation in API response

**See [CLAUDE.md](CLAUDE.md) for complete debugging guide**

---

## 📞 Support & Resources

**Project Docs:** See [Essential Documentation](#-essential-documentation) section above

**External Resources:**
- [Supabase Docs](https://supabase.com/docs)
- [Google Vision API Docs](https://cloud.google.com/vision/docs)
- [PayPal Payouts API Docs](https://developer.paypal.com/docs/api/payments.payouts-batch/v1/)
- [Next.js 15 Docs](https://nextjs.org/docs)

---

**Keeper's Heart Whiskey** - Drink Responsibly. Must be 21+.
