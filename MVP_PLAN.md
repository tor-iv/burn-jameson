# MVP Development Plan - "Burn That Ad"

**Goal:** Ship a working prototype in 2-4 weeks that proves the core concept.

---

## What's In MVP

### User Flow
1. ✅ **Age Gate** (already built in [age-gate.tsx](age-gate.tsx))
2. **Campaign Intro** - "How It Works" screen
3. **AR Camera View** - Video stream scanning competitor whiskey bottles
4. **Bottle Validation** - AR/CV model validates it's a competitor bottle (Jameson, etc.)
5. **Live Burn Effect** - Animation overlays on the bottle in real-time video
6. **Keeper's Heart Purchase** - User buys Keeper's Heart whiskey
7. **Receipt Upload** - Photo upload of Keeper's Heart receipt + Venmo username
8. **Matching & Validation** - System links bottle photo + receipt to same user session
9. **Automated Venmo Payout** - Venmo API sends rebate directly to user

### What We're NOT Building Yet
- ❌ Advanced ML models (use simple image recognition API for MVP)
- ❌ Automated OCR receipt processing (manual review for pilot)
- ❌ Complex anti-fraud systems (basic duplicate prevention only)
- ❌ Analytics dashboards
- ❌ Social sharing features
- ❌ Contest/sweepstakes mechanics
- ❌ Multiple competitor brand detection (start with Jameson only)

---

## Tech Stack (Confirmed)

```
Frontend:      Next.js 14+ (App Router)
Styling:       Tailwind CSS + shadcn/ui components
Camera/Video:  MediaDevices API (native browser video stream)
AR/CV:         Google Vision API or Roboflow (bottle detection)
Animation:     Framer Motion + CSS filters (fire/burn overlay)
Backend:       Supabase (PostgreSQL + Auth + Storage + Edge Functions)
Payments:      Venmo API (automated payouts in MVP)
Hosting:       Vercel
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

### Table: `bottle_scans`
```sql
id              uuid PRIMARY KEY DEFAULT uuid_generate_v4()
user_id         uuid REFERENCES users(id)
session_id      text UNIQUE (unique session to link bottle + receipt)
bottle_image    text (Supabase Storage URL of competitor bottle photo)
detected_brand  text (e.g., "Jameson Irish Whiskey")
confidence      decimal (ML model confidence score 0-1)
scanned_at      timestamp DEFAULT now()
status          text (pending_receipt, completed, rejected)
```

### Table: `receipts`
```sql
id              uuid PRIMARY KEY DEFAULT uuid_generate_v4()
bottle_scan_id  uuid REFERENCES bottle_scans(id)
user_id         uuid REFERENCES users(id)
session_id      text (matches bottle_scans.session_id)
image_url       text (Supabase Storage URL)
venmo_username  text NOT NULL
uploaded_at     timestamp DEFAULT now()
status          text (pending, approved, rejected, paid)
rebate_amount   decimal DEFAULT 5.00
venmo_payment_id text (Venmo API transaction ID)
paid_at         timestamp
admin_notes     text
```

---

## File Structure

```
/app
  /page.tsx                   # Main entry (shows age gate or redirects to /intro)
  /intro/page.tsx             # Campaign intro / How It Works
  /scan/page.tsx              # Video camera view for bottle scanning
  /scanning/[sessionId]/page.tsx  # AR burn animation overlay (real-time video)
  /success/[sessionId]/page.tsx   # Bottle validated, prompt to buy Keeper's Heart
  /upload/[sessionId]/page.tsx    # Receipt upload + Venmo username
  /confirmation/[sessionId]/page.tsx  # Payment sent confirmation
  /admin/page.tsx             # Manual review dashboard

/components
  /ui/                        # shadcn/ui components (button, card, etc)
  /age-gate.tsx               # ✅ Already exists
  /video-stream.tsx           # Live video feed component
  /bottle-detector.tsx        # ML model integration for bottle recognition
  /burn-overlay.tsx           # Fire/burn animation overlay on video
  /receipt-uploader.tsx       # Image upload + Venmo form
  /venmo-input.tsx            # Venmo username input with validation

/lib
  /supabase.ts                # Supabase client setup
  /session-manager.ts         # Generate/track session IDs (link bottle + receipt)
  /bottle-vision.ts           # Google Vision API or Roboflow integration
  /venmo-api.ts               # Venmo API payout integration

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

### Week 2: Camera & Bottle Detection
**Tasks:**
- [ ] Build video stream component (MediaDevices API)
- [ ] Integrate Google Vision API or Roboflow for bottle recognition
- [ ] Capture frame from video → send to ML model → detect "Jameson"
- [ ] Create session ID on successful detection
- [ ] Store bottle scan in Supabase `bottle_scans` table
- [ ] Build AR burn overlay animation (Framer Motion + CSS filters)
- [ ] Trigger burn animation when bottle validated

**Deliverable:** Working bottle scan → AR burn effect → success screen

---

### Week 3: Receipt Upload & Venmo Integration
**Tasks:**
- [ ] Build receipt upload component (camera or file picker)
- [ ] Add Venmo username input with validation (@username format)
- [ ] Link receipt to bottle scan via session_id
- [ ] Integrate Supabase Storage for receipt images
- [ ] Set up Venmo API credentials (sandbox for testing)
- [ ] Build Venmo payout function in Supabase Edge Function
- [ ] Create admin dashboard to approve/reject submissions
- [ ] Trigger automated Venmo payment on admin approval

**Deliverable:** Receipt upload → admin review → automated Venmo payout

---

### Week 4: Polish & Testing
**Tasks:**
- [ ] Apply full brand design system (colors, fonts, spacing)
- [ ] Add loading states and error handling
- [ ] Implement duplicate prevention (check session_id, device fingerprint)
- [ ] Add SMS confirmation when Venmo payment sent
- [ ] Test bottle detection with real Jameson bottles (accuracy threshold >80%)
- [ ] Test video stream on iOS Safari and Android Chrome
- [ ] Verify Venmo API integration (sandbox → production)
- [ ] Test end-to-end flow: bottle scan → receipt → payout
- [ ] Deploy to production domain

**Deliverable:** Pilot-ready MVP with automated payouts

---

## Key Technical Decisions

### Bottle Detection Strategy
**MVP:** Use Google Vision API or Roboflow for object detection
- Capture video frame every 1-2 seconds while user points camera
- Send frame to Vision API with label detection enabled
- Look for keywords: "Jameson", "Irish Whiskey", "whiskey bottle", "Jameson bottle"
- If confidence > 75%, trigger burn animation
- Store detected brand + confidence score in database
- **Fallback:** If detection fails after 10 seconds, show manual "I have a Jameson bottle" button

**Implementation:**
```typescript
async function detectBottle(imageBlob: Blob): Promise<BottleDetection> {
  // Send to Google Vision API or Roboflow
  const response = await fetch('/api/detect-bottle', {
    method: 'POST',
    body: imageBlob
  })
  const { brand, confidence } = await response.json()
  return { brand, confidence }
}
```

### Session Management
```typescript
// Link bottle scan + receipt to same user
function generateSessionId(): string {
  return `kh-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
```

### Venmo Integration (Automated for MVP)
**Flow:**
1. User uploads receipt + enters Venmo username (@username format)
2. Admin reviews receipt in dashboard (validate Keeper's Heart purchase)
3. Admin clicks "Approve & Send Payment" button
4. Supabase Edge Function calls Venmo API
5. Venmo API sends $5 rebate to user's account
6. Store `venmo_payment_id` and `paid_at` timestamp
7. Send SMS confirmation to user (optional)

**Venmo API Setup:**
- Register for Venmo Business API access
- Use OAuth 2.0 for authentication
- Endpoint: `POST /payments` with recipient username + amount
- Handle errors: invalid username, insufficient balance, rate limits

### Authentication Strategy
**MVP: Anonymous sessions (Option 1)**
- Age gate sets `localStorage.setItem('kh_age_verified', Date.now())`
- Generate anonymous session ID on bottle scan
- No login, no email, no password
- Venmo username = payout identity
- Track by session_id + device fingerprint for fraud detection

**Why this approach:**
- Fastest user flow (6 steps, ~60 seconds total)
- Zero friction - no account creation
- Users only care about $5, not creating accounts
- Can add auth later if fraud becomes issue

---

## UX Optimization Checklist

### Critical Path Optimizations
- [ ] **Preload camera permissions** during intro screen (in background)
- [ ] **Session persistence** via sessionStorage (survives page refresh)
- [ ] **Pre-fill Venmo username** from localStorage on repeat visits
- [ ] **Background uploads** - start uploading receipt while user types Venmo
- [ ] **Prefetch routes** - load next screen during animations
- [ ] **Image compression** - reduce receipt images to 1200px before upload
- [ ] **Haptic feedback** - vibrate on successful bottle detection

### Mobile-First Design
- [ ] All primary buttons: 56px height (thumb-friendly)
- [ ] Bottom sheet UI for forms (easier reach)
- [ ] Large detection area: 70% of screen with visual guide
- [ ] Auto-focus inputs, show @ prefix for Venmo
- [ ] Disable pull-to-refresh on camera screen

### Error Recovery
- [ ] Camera denied → Show "Upload photo" immediately
- [ ] ML fails after 10s → Show manual "I have Jameson" button
- [ ] Offline mode → Queue uploads, show "Will sync when online"
- [ ] Session expired → Clear message + "Start over" button
- [ ] Translate all errors to human language

### Speed Tricks
```typescript
// Process frames at 2fps (not every frame)
setInterval(() => captureFrame(), 500)

// Skip intro on return visits
if (localStorage.getItem('kh_seen_intro')) redirect('/scan')

// Parallel operations
Promise.all([uploadReceipt(), validateVenmo()])
```

### Psychological Optimizations
- [ ] Show progress bar: ① Scan → ② Buy → ③ Upload → ④ Get $5
- [ ] Display "$5 pending..." during review (feels like money coming)
- [ ] Confetti animation on payout confirmation
- [ ] Real-time confidence meter: "Scanning... 78%..."
- [ ] Send SMS: "Your $5 is on the way!" (even before processed)

### Admin Efficiency
- [ ] Keyboard shortcuts: A=approve, R=reject, →=next
- [ ] Side-by-side bottle/receipt view
- [ ] Auto-flag suspicious patterns (duplicate images)
- [ ] Bulk approve for obvious valid receipts

**See [UX_FLOW.md](UX_FLOW.md) for complete screen-by-screen specifications**

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
   npm install framer-motion
   npm install @google-cloud/vision  # or use Roboflow SDK
   npm install axios  # for Venmo API calls
   npm install uuid  # for session ID generation
   ```

4. **Create Supabase tables**
   - Run SQL migrations for users, bottle_scans, receipts
   - Set up Row Level Security policies
   - Configure Storage buckets: `bottle-images` and `receipt-images`
   - Create Edge Function for Venmo API integration

5. **Build intro screen**
   - Copy design specs from [UX_FLOW.md](UX_FLOW.md) Screen #3
   - Use Playfair Display font from Google Fonts
   - Implement amber color palette
   - Add "Skip intro" checkbox for repeat visits

---

## Success Metrics for MVP

**Must Have:**
- [ ] Bottle detection accuracy > 75% with real Jameson bottles
- [ ] AR burn animation plays smoothly (30fps, 2.5s duration)
- [ ] Receipt uploads work on iOS Safari and Android Chrome
- [ ] Venmo payouts process successfully (test in sandbox)
- [ ] Session IDs correctly link bottle scan + receipt
- [ ] Mobile-responsive on screens 375px-430px wide
- [ ] Complete flow in < 60 seconds (age gate to confirmation)
- [ ] Fallback options for every potential failure point

**Nice to Have:**
- [ ] Haptic feedback on bottle detection
- [ ] Real-time confidence meter during scanning
- [ ] Page load time under 2 seconds
- [ ] Offline mode with queued uploads
- [ ] Zero crashes during pilot testing

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Bottle detection fails / low accuracy | Use multiple ML models (Google + Roboflow), add manual override button |
| Users don't upload receipts | Make process dead simple, show clear incentive ($5 rebate) |
| Fraud (fake bottles/receipts) | Admin manual review for pilot, check session_id matching |
| Venmo API limits / failures | Use sandbox testing, handle errors gracefully, show retry option |
| Venmo usernames invalid | Validate @username format, test payment before marking complete |
| Camera permissions denied | Show clear instructions, provide fallback to upload photo instead |
| Video stream crashes on mobile | Test on real devices, implement error boundaries, fallback UI |

---

## Post-MVP Roadmap

**Phase 2 (Weeks 5-8):**
- Add support for more competitor brands (Tullamore Dew, Bushmills, etc.)
- Integrate Tesseract.js for automated receipt OCR (validate Keeper's Heart purchase)
- Automated duplicate detection (image hashing for bottles + receipts)

**Phase 3 (Weeks 9-12):**
- Advanced fraud prevention (device fingerprinting, rate limiting, geofencing)
- Analytics dashboard (Segment + Amplitude)
- A/B testing different rebate amounts

**Phase 4 (Weeks 13+):**
- Social sharing features (screenshot burn effect)
- Contest/sweepstakes mechanics
- Geofencing for regional campaigns
- Scale to national launch

---

---

## File References

- **[UX_FLOW.md](UX_FLOW.md)** - Complete screen-by-screen specifications with layouts, copy, and interactions
- **[CLAUDE.md](CLAUDE.md)** - Project overview and design system
- **[REQUIREMENTS.md](REQUIREMENTS.md)** - Original detailed requirements

---

**Next Action:** Set up Supabase project, create database schema, and build camera component (highest risk item).
