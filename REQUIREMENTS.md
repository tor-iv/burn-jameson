# Burn That Ad - Project Requirements

**Priority Source:** [patrick-planning.md](outline-docs/patrick-planning.md)
**Campaign:** Keeper's Heart Whiskey AR Marketing Campaign

---

## Executive Summary

Build a bar/distributor-agnostic PWA microsite that uses WebAR and computer vision to let consumers "burn" competitor whiskey ads (Jameson/Paddy's), unlock Keeper's Heart discounts, upload receipts, and receive direct cash rebates—with zero friction for bars or distributors.

---

## Core User Flow

1. **Entry Point**
   - Consumer scans QR code (table tents, coasters, digital ads) OR accesses microsite directly via geofenced mobile ads (Instagram, TikTok, Google Maps)

2. **Age Gate**
   - Modal overlay: "Are you 21+?" with YES/NO buttons
   - Must pass age verification before accessing app

3. **AR Recognition**
   - Phone camera uses AR/OCR to detect "Jameson" or "Paddy's" on menu items (no QR code needed on the target)
   - Alternative: Direct QR trigger if simpler

4. **AR Burn Effect**
   - Competitor menu item "burns" with AR overlay animation
   - Keeper's Heart offer/discount code appears on screen

5. **Purchase & Receipt Upload**
   - Consumer buys Keeper's Heart whiskey at bar
   - Uploads receipt photo via app (OCR processes it)

6. **Direct Payout**
   - Consumer receives rebate via Venmo, PayPal, Zelle, prepaid Visa, or gift card
   - **No bar or distributor involvement in promo redemption**

---

## Technical Architecture

### Frontend Stack
- **Framework:** React (PWA/microsite)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Camera Access:** WebRTC/getUserMedia API

### AR & Computer Vision
- **WebAR Options:**
  - 8thWall (commercial, robust)
  - MindAR (open-source)
  - AR.js (lightweight, open-source)
  - three.js for 3D burn effects

- **OCR Options:**
  - **Web-based:** Tesseract.js (in-browser OCR)
  - **Native:** ML Kit Text Recognition (if building native modules)
  - **Cloud:** Google Document AI, Tabscanner, Veryfi

### Backend Stack
- **API:** Node.js + Express (or Next.js API routes)
- **Database:** PostgreSQL (via Supabase or Railway)
- **Session Management:** JWT or session tokens (Supabase Auth if using Supabase)
- **File Storage:** Supabase Storage, Railway volumes, or Cloudflare R2 (for receipt images)

### Receipt Processing
- **Vendors:** Tabscanner, Veryfi, Google Document AI
- **Validation Logic:**
  - Verify "Keeper's Heart" purchase
  - Validate date/time (within campaign window)
  - Check location (geofencing if required)
  - Amount verification (minimum purchase)

### Payment Rails
- **Options:**
  - Tremendous API (prepaid Visa cards, gift cards)
  - PayPal Payouts API
  - Venmo (manual or API if available)
  - Zelle (manual coordination)

### Analytics & Fraud Prevention
- **Analytics:** Segment, Amplitude, Mixpanel
- **Tracking Metrics:**
  - AR scans/activations
  - Receipt uploads
  - Successful redemptions
  - Viral sharing (social posts)
  - Cost per acquisition (CPA)
  - Fraud rate

### Anti-Abuse Measures
- **Age Gating:** 21+ verification required
- **Device Verification:** Fingerprinting (IP, device ID, browser signature)
- **Rate Limiting:** One redemption per user per X days (7-30 days)
- **Geofencing:** Limit to specific regions/states if needed
- **Duplicate Prevention:** Check phone number, email, receipt hash
- **Manual Review:** Flag suspicious patterns (same receipt, rapid submissions)

---

## Screen Specifications

### 1. Age Gate Screen
- **Design:**
  - Full-screen modal overlay (dark charcoal #2C2C2C background)
  - Centered Keeper's Heart logo (150px wide)
  - Headline: "Burn That Ad" in Playfair Display, 48px
  - Subheadline: "Turn competitor ads into Keeper's Heart rewards"
  - Two large rounded buttons: "YES, I'M 21+" (amber #B8860B), "NO, EXIT" (outlined)
  - Small legal text at bottom
  - Amber gradient glow behind headline

### 2. Campaign Intro / How It Works
- **Design:**
  - Sticky header: Logo left, hamburger menu right
  - Hero section with headline: "Discover Hidden Whiskey" (Playfair, 40px)
  - Decorative amber underline (4px)
  - Three-step process with icons:
    - 📸 Scan Any Jameson Ad
    - 🔥 Watch It Transform
    - 🎁 Get Your Reward
  - Each step: Icon (copper/emerald, 64px), title (24px bold), description (16px)
  - Large CTA button: "START SCANNING" (amber, rounded, 20px padding)
  - Subtle wood grain texture overlay (5% opacity)
  - 80px margins between sections

### 3. AR Camera View
- **Design:**
  - Full-screen camera viewport
  - Minimal UI overlays:
    - Top-left: Exit button (× white, 40px)
    - Center: Scanning indicator (pulsing amber circle, 100px)
    - Scanning text: "Point camera at any Jameson advertisement"
    - Bottom bar: Translucent charcoal (#2C2C2C80)
      - "Ads Burned: 3 🔥" counter
      - "View My Coupons" button
  - Dark gradient vignette on edges

### 4. Coupon Reveal Screen
- **Design:**
  - Cream background (#FFF8DC)
  - Top: Celebration header "🎉 Success! 🎉" (32px)
  - Product image: Keeper's Heart bottle (300px height, centered, amber gradient background)
  - Headline: "You've Unlocked" (Playfair, 28px)
  - Offer: "$5 OFF" (bold, 48px, amber color)
  - Subtext: "Any Keeper's Heart Whiskey"
  - Coupon card (white, rounded, shadow):
    - Label: "YOUR COUPON CODE:"
    - Code: "KH-A7D9F2E1" (monospace, 24px, bold)
    - Copy button (amber, 16px padding)
  - Expiration date (14px, gray)
  - Two CTAs:
    - Primary: "FIND RETAILERS" (amber, full-width)
    - Secondary: "SCAN AGAIN" (outlined, full-width)
  - Social share section: "Share Your Win 📱" with icon buttons

### 5. Receipt Upload Screen (NEW)
- **Design:**
  - Header: "Upload Your Receipt"
  - Instructions: "Show us your Keeper's Heart purchase"
  - Large upload area (drag & drop or camera capture)
  - Preview of uploaded image
  - "Submit for Rebate" button
  - Progress indicator during OCR processing
  - Error states for invalid receipts

### 6. Rebate Confirmation Screen (NEW)
- **Design:**
  - Success message: "Rebate Approved!"
  - Amount confirmed: "$5.00"
  - Payment method selector (Venmo, PayPal, prepaid card)
  - Input for payment details (email/phone)
  - "Claim Rebate" button
  - Expected delivery time

---

## Brand Design System

### Colors
- **Primary:** Deep whiskey amber (#B8860B, #CD853F)
- **Secondary:** Creamy white (#FFF8DC)
- **Accent:** Emerald green (#2C5F2D), Copper (#B87333)
- **Dark:** Charcoal (#2C2C2C), Black (#000000)
- **Background:** Soft charred oak tone (#F5F5DC with subtle wood texture)

### Typography
- **Headlines:** Playfair Display (serif, elegant, bold)
- **Body:** Inter or Open Sans (sans-serif, clean)
- **Line Spacing:** 1.6-1.8
- **Sizes:**
  - Large headlines: 32-48px mobile, 48-72px desktop
  - Section titles: 24-32px
  - Body text: 16px
  - Small text: 14px

### Component Patterns

**Buttons:**
- Rounded corners (12px border-radius)
- Generous padding (16px vertical, 32px horizontal)
- Hover: Slight color shift + subtle shadow
- Primary: Amber (#B8860B) with white text
- Secondary: Outlined (2px amber border) with amber text
- Minimum tap target: 44px

**Cards:**
- White background
- Subtle shadow (0 4px 12px rgba(0,0,0,0.1))
- Rounded corners (16px)
- 24px padding

**Animations:**
- Fade-in transitions for modals (300ms ease)
- Pulsing animation for scanning indicator
- Confetti burst on coupon reveal (2s duration)
- Smooth page transitions (200-300ms)

**Responsive Design:**
- Mobile-first approach
- Breakpoints: 640px (mobile), 768px (tablet), 1024px (desktop)
- Stack columns on mobile
- Touch-friendly tap targets (44px minimum)

---

## Campaign Creative Concepts

### Primary: "Burn to Earn"
- AR burn effect on competitor menu item
- Instant Keeper's Heart reward reveal
- Direct cash rebate for purchase

### Alternative Hooks:
- **"Light It Up":** Fire-themed AR transformation
- **"Flip the Script":** Shake phone to flip competitor to Keeper's Heart
- **"Trade Up":** AR replacement of competitor drink
- **"Heart Beats Fire":** Competitor melts, Keeper's Heart rises

### UGC/Social Components:
- Share burn effect on Instagram/TikTok
- Contest entry for sharing
- Leaderboards (most burns, most referrals)
- Gamified sweepstakes

---

## Legal & Compliance

### Required Guardrails:
- **Comparative Advertising:** Must be truthful, not misleading
- **Tied-House Laws:** No unlawful inducements to bars (why we go direct-to-consumer)
- **AMOE (Sweepstakes):** Alternative Method of Entry for states requiring it
- **Privacy:** GDPR/CCPA-compliant data handling
- **Terms & Conditions:** Clear rules, eligibility, limitations
- **Official Rules:** For any contest/sweepstakes components

### Age Verification:
- 21+ gate required at entry
- Store verification timestamp
- Potentially integrate 3rd-party age verification (ID.me, Yoti)

### Geographic Restrictions:
- May need to exclude certain states (alcohol laws vary)
- Geofencing to verify user location

---

## Development Phases

### Phase 1: POC/MVP (Weeks 1-4)
- Build PWA microsite with React + Tailwind
- Implement age gate and intro screens
- Basic camera access with manual QR trigger
- Simple coupon reveal (static code)
- **No backend, no OCR, no payments yet**

### Phase 2: AR Integration (Weeks 5-8)
- Integrate WebAR (MindAR or 8thWall)
- Text detection for "Jameson" / "Paddy's" on menus
- AR burn animation (three.js effects)
- Session tracking (who scanned what, when)

### Phase 3: Backend & Receipt Processing (Weeks 9-12)
- Node.js/Express API setup
- PostgreSQL database for users, sessions, receipts, payouts
- Receipt upload functionality
- OCR integration (Tesseract.js or cloud API)
- Validation logic (purchase amount, date, product)

### Phase 4: Payment Integration (Weeks 13-16)
- Integrate Tremendous API or PayPal Payouts
- User payment method selection
- Payout processing and tracking
- Email/SMS confirmations

### Phase 5: Fraud Prevention & Analytics (Weeks 17-20)
- Device fingerprinting
- Rate limiting and duplicate detection
- Geofencing enforcement
- Analytics dashboard (Segment/Amplitude)
- Admin panel for manual review/flagging

### Phase 6: Pilot Launch (Weeks 21-24)
- Test with 10-20 bars in target market
- Street teams and digital ad campaigns
- Monitor redemption rates, fraud, user feedback
- Iterate based on data

### Phase 7: National Scale (Weeks 25+)
- Expand to all markets where Keeper's Heart is sold
- Influencer partnerships
- UGC/social media campaigns
- Ongoing optimization and A/B testing

---

## Success Metrics

### Primary KPIs:
- **Redemption Rate:** % of AR scans → receipts uploaded → rebates claimed
- **Cost Per Acquisition (CPA):** Total campaign cost / successful conversions
- **Viral Coefficient:** Average shares per user
- **Fraud Rate:** % of flagged/rejected redemptions

### Secondary KPIs:
- AR engagement time
- Social media mentions/hashtag usage
- Brand awareness lift (surveys)
- Repeat scan rate (gamification effectiveness)

---

## Budget Estimates (per patrick-planning.md)

- **Cost per redemption:** $2–$7 (tech + payout platform fees)
- **Rebate amount:** $5 per consumer (example)
- **Tech stack costs:**
  - 8thWall: ~$99-$499/mo (or use open-source MindAR)
  - Cloud OCR: $0.15-$1.50 per 1000 requests
  - Payment processing: 2-5% fees (Tremendous, PayPal)
  - Hosting: Vercel/Railway/Supabase free tier → ~$20-$50/mo at scale
  - Database: Supabase free tier (500MB) → ~$25/mo Pro, Railway $5/mo → ~$20/mo at scale

---

## Vendor Stack Recommendations

| Component | Recommended Option | Alternative |
|-----------|-------------------|-------------|
| **WebAR** | MindAR (open-source) | 8thWall (commercial) |
| **OCR (Web)** | Tesseract.js | Google Document AI |
| **OCR (Cloud)** | Tabscanner API | Veryfi API |
| **Payments** | Tremendous API | PayPal Payouts |
| **Analytics** | Segment + Amplitude | Mixpanel |
| **Hosting** | Vercel (frontend + API) | Railway (fullstack) or Supabase (BaaS) |
| **Database** | Supabase (PostgreSQL + Auth + Storage) | Railway PostgreSQL or Neon |

---

## Next Steps

1. **Map exact vendor stack** (OCR/AR/payment/verification providers)
2. **Develop open-source POC** (React PWA with camera + mock burn effect)
3. **Draft creative assets** (logo animations, AR effects, social templates)
4. **Legal documentation** (terms, privacy policy, official rules, AMOE)
5. **Pilot partner selection** (identify 10-20 bars for initial launch)
6. **Marketing plan** (digital ads, street teams, influencer outreach)

---

## MVP Decisions (Phase 1)

### ✅ Confirmed Decisions:
- **Camera:** Real camera access with WebRTC/getUserMedia
- **AR Approach:** Start with QR code trigger, but architect for future text detection
- **Payment:** Venmo integration first (PayPal/Tremendous later)
- **Age Gate:** Simple "Yes/No" with localStorage (already implemented in [age-gate.tsx](age-gate.tsx))
- **Exit Action:** Redirect to responsibility.org (educational content)
- **Brand Assets:** Keeper's Heart logo available in [images/logo.png](images/logo.png)
- **Framework:** Next.js (based on existing age-gate.tsx)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)

### 🔄 Still To Decide:
- [ ] Coupon codes: Real/unique generation or static for MVP?
- [ ] Receipt upload: Required for rebate or optional?
- [ ] OCR provider: Tesseract.js (free, in-browser) vs. cloud API?
- [ ] Geofencing: National or regional pilot?
- [ ] Contest/sweepstakes component in MVP?

---

**Document Version:** 1.0
**Last Updated:** 2025-10-07
**Primary Source:** [patrick-planning.md](outline-docs/patrick-planning.md)
**Supporting Sources:** [outline.md](outline-docs/outline.md), [ui-elements.md](outline-docs/ui-elements.md)
