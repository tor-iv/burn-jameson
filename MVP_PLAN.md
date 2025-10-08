# MVP Development Plan - "Burn That Ad"

**Goal:** Ship a working prototype in 2-4 weeks that proves the core concept.

---

## What's In MVP

### User Flow
1. ✅ **Age Gate** (already built in [age-gate.tsx](age-gate.tsx))
2. **Campaign Intro** - "How It Works" screen
3. **AR Camera View** - QR code scanner with burn animation
4. **Coupon Reveal** - Show discount code after scan
5. **Receipt Upload** - Simple photo upload (no OCR yet)
6. **Manual Review** - Admin approves rebates (no auto-payouts yet)

### What We're NOT Building Yet
- ❌ Text detection AR (point at "Jameson" text)
- ❌ Automated OCR receipt processing
- ❌ Automated Venmo payouts (manual for pilot)
- ❌ Anti-fraud systems (basic duplicate prevention only)
- ❌ Analytics dashboards
- ❌ Social sharing features
- ❌ Contest/sweepstakes mechanics

---

## Tech Stack (Confirmed)

```
Frontend:  Next.js 14+ (App Router)
Styling:   Tailwind CSS + shadcn/ui components
AR/Camera: react-qr-reader or html5-qrcode
Animation: Framer Motion + three.js (simple burn effect)
Backend:   Supabase (PostgreSQL + Auth + Storage + Edge Functions)
Payments:  Manual Venmo for pilot (automated later)
Hosting:   Vercel
```

---

## Database Schema (Supabase)

### Table: `users`
```sql
id              uuid PRIMARY KEY DEFAULT uuid_generate_v4()
email           text UNIQUE
phone           text
age_verified_at timestamp
created_at      timestamp DEFAULT now()
```

### Table: `scans`
```sql
id              uuid PRIMARY KEY DEFAULT uuid_generate_v4()
user_id         uuid REFERENCES users(id)
qr_code         text (the QR code scanned)
scanned_at      timestamp DEFAULT now()
coupon_code     text (generated unique code)
```

### Table: `receipts`
```sql
id              uuid PRIMARY KEY DEFAULT uuid_generate_v4()
scan_id         uuid REFERENCES scans(id)
user_id         uuid REFERENCES users(id)
image_url       text (Supabase Storage URL)
uploaded_at     timestamp DEFAULT now()
status          text (pending, approved, rejected)
rebate_amount   decimal
venmo_username  text
paid_at         timestamp
```

---

## File Structure

```
/app
  /page.tsx                  # Main entry (shows age gate or redirects to /intro)
  /intro/page.tsx            # Campaign intro / How It Works
  /scan/page.tsx             # AR Camera view
  /reveal/[scanId]/page.tsx  # Coupon reveal screen
  /upload/[scanId]/page.tsx  # Receipt upload screen
  /admin/page.tsx            # Manual review dashboard

/components
  /ui/                       # shadcn/ui components (button, card, etc)
  /age-gate.tsx              # ✅ Already exists
  /camera-scanner.tsx        # QR scanner component
  /burn-animation.tsx        # AR burn effect overlay
  /coupon-card.tsx           # Coupon display component
  /receipt-uploader.tsx      # Image upload component

/lib
  /supabase.ts               # Supabase client setup
  /generate-coupon.ts        # Unique code generation logic
  /venmo.ts                  # Venmo payment helper (manual for now)

/public
  /images
    /logo.png                # ✅ Already exists
    /keepers-heart-logo.png  # For age gate
    /bottle.png              # Product image for reveal screen
```

---

## Development Phases

### Week 1: Foundation
**Tasks:**
- [x] Set up Next.js project (already started based on age-gate.tsx)
- [ ] Configure Supabase project
- [ ] Create database schema (users, scans, receipts)
- [ ] Set up Supabase Auth (magic link or phone auth)
- [ ] Build Campaign Intro screen with brand styling
- [ ] Implement responsive layout (mobile-first)

**Deliverable:** Age gate + intro screen deployed to Vercel

---

### Week 2: Camera & AR
**Tasks:**
- [ ] Build QR scanner component (react-qr-reader)
- [ ] Create simple burn animation with Framer Motion
- [ ] Detect QR code → trigger burn → show "Scanning..." state
- [ ] Generate unique coupon code on successful scan
- [ ] Store scan in Supabase `scans` table
- [ ] Build coupon reveal screen with copy-to-clipboard

**Deliverable:** Working QR scan → burn animation → coupon code flow

---

### Week 3: Receipt Upload
**Tasks:**
- [ ] Build receipt upload component (camera or file picker)
- [ ] Integrate Supabase Storage for image hosting
- [ ] Create receipt upload screen (linked from coupon reveal)
- [ ] Store receipt metadata in `receipts` table
- [ ] Build simple admin dashboard to view receipts
- [ ] Add basic form validation (file size, type)

**Deliverable:** Users can upload receipts, admins can view them

---

### Week 4: Polish & Testing
**Tasks:**
- [ ] Apply full brand design system (colors, fonts, spacing)
- [ ] Add loading states and error handling
- [ ] Implement basic duplicate prevention (check if user already scanned)
- [ ] Add email/SMS confirmation on receipt upload
- [ ] Create simple admin tools to mark receipts as paid
- [ ] Test on real iOS/Android devices
- [ ] Deploy to production domain

**Deliverable:** Pilot-ready MVP

---

## Key Technical Decisions

### QR Code Strategy
**MVP:** Use standard QR codes that contain campaign-specific URLs
- Example QR content: `https://burnthatad.com/scan?campaign=pilot-oct-2025`
- QR scanner detects code → triggers burn animation → generates coupon
- Later: Add computer vision to detect "Jameson" text instead of QR

### Coupon Code Generation
```typescript
// Simple alphanumeric code: KH-A7D9F2E1
function generateCouponCode(): string {
  const prefix = 'KH-'
  const random = Math.random().toString(36).substring(2, 10).toUpperCase()
  return prefix + random
}
```

### Venmo Integration (Manual for MVP)
- User enters Venmo username in receipt upload form
- Admin reviews receipt in dashboard
- Admin manually sends Venmo payment
- Admin marks receipt as "paid" in Supabase
- Later: Integrate Venmo API for automated payouts

### Authentication Strategy
**Option 1 (Simpler):** Anonymous users with localStorage
- Age gate sets `localStorage.setItem('keepersHeartAgeVerified', 'true')`
- Track scans by device fingerprint (IP + User-Agent)
- No login required

**Option 2 (Better):** Supabase phone auth
- User enters phone number for receipt upload
- Send SMS verification code
- Links scans to verified phone number
- Better fraud prevention

**Recommendation:** Start with Option 1, add Option 2 when receipt upload is built

---

## Immediate Next Steps

1. **Set up Supabase project**
   ```bash
   npx supabase init
   npx supabase start
   ```

2. **Initialize Next.js if needed**
   ```bash
   npx create-next-app@latest burn-jameson --typescript --tailwind --app
   ```

3. **Install dependencies**
   ```bash
   npm install @supabase/supabase-js
   npm install react-qr-reader
   npm install framer-motion
   npm install three @react-three/fiber @react-three/drei
   ```

4. **Create Supabase tables**
   - Run SQL migrations for users, scans, receipts
   - Set up Row Level Security policies
   - Configure Storage bucket for receipts

5. **Build intro screen**
   - Copy design specs from [REQUIREMENTS.md](REQUIREMENTS.md) Screen #2
   - Use Playfair Display font from Google Fonts
   - Implement amber color palette

---

## Success Metrics for MVP

**Must Have:**
- [ ] 100% of QR scans trigger burn animation
- [ ] Coupon codes are unique and copyable
- [ ] Receipt uploads work on iOS Safari and Android Chrome
- [ ] Admin can view all receipts and mark as paid
- [ ] Mobile-responsive on screens 375px-430px wide

**Nice to Have:**
- [ ] Burn animation feels premium (2-3 second duration)
- [ ] Page load time under 2 seconds
- [ ] Zero crashes during pilot testing
- [ ] Users share screenshots on social media organically

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| QR codes don't scan reliably | Test multiple QR libraries, add manual code entry fallback |
| Users don't upload receipts | Make process dead simple, show clear incentive ($5 rebate) |
| Fraud (fake receipts) | Manual review for pilot, add automated checks later |
| Venmo usernames invalid | Validate format, confirm before sending payment |
| Camera permissions denied | Show clear instructions, provide file upload alternative |

---

## Post-MVP Roadmap

**Phase 2 (Weeks 5-8):**
- Add computer vision text detection (point at "Jameson" → triggers burn)
- Integrate Tesseract.js for basic OCR on receipts
- Automated duplicate receipt detection (image hashing)

**Phase 3 (Weeks 9-12):**
- Venmo API integration for automated payouts
- Advanced fraud prevention (device fingerprinting, rate limiting)
- Analytics dashboard (Segment + Amplitude)

**Phase 4 (Weeks 13+):**
- Social sharing features (screenshot burn effect)
- Contest/sweepstakes mechanics
- Geofencing for regional campaigns
- Scale to national launch

---

**Next Action:** Set up Supabase project and create database schema.
