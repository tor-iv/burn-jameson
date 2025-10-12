# Burn That Ad - Project Overview

**Campaign by:** Keeper's Heart Whiskey
**Objective:** Drive trial and conversion from competitor whiskey brands
**Status:** 75% Complete - Production Integration Phase
**Last Updated:** 2025-10-11

---

## 🎯 Campaign Concept

A mobile-first web application that gamifies whiskey brand switching through AR bottle scanning and instant rebates.

### The User Journey

1. **Discover** - Consumer sees QR code (table tents, coasters, ads) or finds via mobile ads
2. **Scan** - Point phone camera at competitor whiskey bottle → AR "burn" effect
3. **Purchase** - Buy Keeper's Heart whiskey at bar/store
4. **Upload** - Submit receipt photo
5. **Get Paid** - Receive $5-10 rebate via PayPal Payouts (1-2 days)

**Key Differentiator:** Bar/distributor-agnostic. Consumer gets paid directly. Zero friction for venues.

---

## 🥃 Competitor Brands (Bottle Detection)

The app detects and validates the following competitor whiskey brands:

### Irish Whiskey
- **Jameson** ⭐ Primary competitor
- **Tullamore Dew**
- **Bushmills**
- **Redbreast**
- **Writers' Tears**
- **Teeling**

### Scotch Whisky
- **Johnnie Walker**

### American Whiskey (Bourbon/Rye)
- **Bulleit**
- **Woodford Reserve**
- **Maker's Mark**
- **Angel's Envy**
- **High West**
- **Michter's**
- **Knob Creek**
- **Four Roses**

**Total:** 15 competitor brands tracked

### Detection Logic
- **Current (MVP):** Mock detection accepts any bottle
- **Production:** Google Vision API identifies brand from label
- **Future:** Custom Roboflow model trained on these 15 brands (highest accuracy)

---

## 🏗️ Technical Architecture

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Camera:** WebRTC/getUserMedia

### Backend
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (bottle images, receipt images)
- **Authentication:** Session-based (no user login required)
- **APIs:** Next.js API routes

### AI/ML Services
- **Bottle Detection:** Google Vision API (label detection)
- **Receipt OCR:** Google Vision API (document text detection)
- **Alternative:** Roboflow custom model (higher accuracy)

### Payment Integration
- **Selected:** PayPal Payouts API ⭐
  - **Cost:** $0.25 per payout (Standard 1-2 days)
  - **SDK:** @paypal/payouts-sdk (official Node.js)
  - **Sandbox:** Full testing environment available
  - **User Experience:** Payout sent to PayPal email address
  - **Admin Dashboard:** One-click payout processing
  - **Alternatives considered:** Tremendous API (prepaid cards), PayPal Business Payouts (rejected), legacy manual peer-to-peer payouts (deprecated)

### Hosting & Deployment
- **Frontend:** Vercel
- **Database:** Supabase Cloud
- **CDN:** Vercel Edge Network
- **Domain:** TBD

---

## 📱 Core Features

### Consumer-Facing

#### 1. Age Gate ✅
- Modal overlay requiring 21+ verification
- Required before accessing any content
- Timestamp stored for compliance

#### 2. Campaign Intro ✅
- "How It Works" 3-step explanation
- Brand storytelling for Keeper's Heart
- Clear call-to-action

#### 3. Bottle Scanner ✅
- Live camera feed
- Real-time detection indicator
- Confidence meter
- Support for 14 competitor brands
- Manual upload fallback

#### 4. Receipt Upload ✅
- Camera capture or file upload
- Image validation (format, size, quality)
- PayPal email collection
- Auto-save email for convenience

#### 5. Confirmation
- Success message
- Expected payout timeline
- Social sharing prompts

### Admin-Facing

#### 6. Review Dashboard ✅
- Queue of pending receipts
- Side-by-side view (bottle + receipt)
- Keyboard shortcuts (A=approve, R=reject)
- Session details (PayPal email, timestamp, confidence)
- One-click PayPal payout processing
- Approve/reject workflow

---

## 🗄️ Database Schema

### Tables

#### `users`
Optional user tracking (email, phone)
```sql
- id (uuid, primary key)
- email (text, nullable)
- phone (text, nullable)
- age_verified_at (timestamp)
- created_at (timestamp)
```

#### `bottle_scans`
Every bottle scan (successful detection)
```sql
- id (uuid, primary key)
- session_id (text, unique)
- user_id (uuid, foreign key, nullable)
- bottle_image (text) - Supabase Storage URL
- detected_brand (text) - e.g. "Jameson Irish Whiskey"
- confidence (float) - ML confidence score
- scanned_at (timestamp)
- status (enum) - 'pending_receipt', 'completed', 'rejected'
- ip_address (text)
- user_agent (text)
- image_hash (text) - for duplicate detection
```

#### `receipts`
Receipt uploads linked to bottle scans
```sql
- id (uuid, primary key)
- session_id (text, foreign key to bottle_scans)
- user_id (uuid, foreign key, nullable)
- image_url (text) - Supabase Storage URL
- paypal_email (text) - user@example.com
- uploaded_at (timestamp)
- status (enum) - 'pending', 'approved', 'rejected', 'paid'
- rebate_amount (decimal) - default 5.00
- paypal_payout_id (text, nullable)
- paid_at (timestamp, nullable)
- admin_notes (text, nullable)
```

### Storage Buckets
- `bottle-images` - Scanned bottle photos
- `receipt-images` - Receipt photos

---

## 🛡️ Fraud Prevention & Compliance

### Implemented ✅
- **Age Gating:** 21+ verification required
- **Session Validation:** 24-hour expiry, one receipt per scan
- **Image Validation:** Format, size, quality checks
- **Duplicate Detection:** Image hashing prevents same photo reuse
- **Rate Limiting:** IP-based (3 scans per 24 hours)
- **Device Fingerprinting:** User agent tracking

### Production Enhancements 📋
- **ML Content Validation:** Verify actual bottle/receipt in images
- **OCR Verification:** Extract "Keeper's Heart" from receipts
- **Geofencing:** Limit to specific states/regions
- **Payment Limits:** Max 1 payout per user per 30 days
- **Manual Review:** Admin approval for all payouts
- **Pattern Detection:** Flag suspicious activity

### Legal Compliance
- Privacy Policy (required)
- Terms of Service (required)
- Official Rules (sweepstakes laws)
- AMOE provision (some states require)
- Alcohol marketing regulations (21+, responsible drinking)

---

## 📊 Current Status (See PROGRESS.md for details)

### ✅ Complete (75% overall)
- Frontend UI (all pages)
- Database schema & setup
- Image upload/download
- Admin dashboard
- Session management
- Image validation
- Rate limiting
- Duplicate prevention

### 🔄 In Progress (Next 2-3 days)
- Google Vision API integration
- Payment API integration

### 📋 Upcoming (1-2 weeks)
- Legal pages (Privacy, Terms)
- Enhanced ML model
- Analytics tracking
- Production deployment
- Full QA testing

### ⏸️ Future Enhancements
- Email/SMS notifications
- Social sharing
- Referral tracking
- Advanced fraud detection
- Multi-market expansion
- A/B testing

---

## 💰 Business Model

### Campaign Costs (Estimated)

**Per User:**
- Rebate: $5-10
- PayPal transaction fee: $0.25
- ML API costs: $0.003
- **Total per conversion:** ~$5.25-10.25

**Campaign Budget Examples:**
- 100 users: $525-1,025
- 500 users: $2,625-5,125
- 1,000 users: $5,250-10,250

**ROI Calculation:**
- Assume $30 bottle, 40% margin = $12 profit
- Minus $5.25-10.25 acquisition cost
- **Net profit:** $1.75-6.75 per conversion
- **Lifetime value:** Higher with repeat purchases

### Cost Optimization
- Set daily/weekly caps
- Geographic targeting
- Time-limited campaigns
- Adjust rebate amount dynamically

---

## 🎨 Brand Design System

### Colors
- **Primary:** Whiskey Amber (#B8860B, #CD853F)
- **Secondary:** Cream (#FFF8DC)
- **Accent:** Emerald (#2C5F2D), Copper (#B87333)
- **Neutral:** Charcoal (#2C2C2C), Oak (#F5F5DC)

### Typography
- **Headlines:** Playfair Display (serif, elegant)
- **Body:** Inter (sans-serif, clean)
- **Line Height:** 1.6-1.8

### Components
- **Buttons:** 12px border-radius, amber primary
- **Cards:** 16px border-radius, soft shadow
- **Min Touch Target:** 44px (mobile accessibility)
- **Animations:** 300ms transitions, smooth

---

## 📈 Success Metrics (Analytics to Track)

### Engagement Funnel
1. **QR Scans / Site Visits** - Top of funnel
2. **Age Gate Completions** - Barrier 1
3. **Bottle Scans (Attempted)** - Interest
4. **Bottle Scans (Successful)** - Detection quality
5. **Receipt Uploads** - Purchase intent
6. **Admin Approvals** - Conversion
7. **Payouts Completed** - Success

### Key KPIs
- **Scan-to-Upload Rate:** Target 60%+
- **Upload-to-Approval Rate:** Target 80%+
- **Detection Accuracy:** Target 85%+
- **Fraud Rate:** Target <5%
- **Average Time to Payout:** Target <24 hours
- **Customer Acquisition Cost (CAC):** Target <$10
- **Return on Ad Spend (ROAS):** Target 2:1+

### A/B Test Ideas
- Rebate amount ($5 vs $7 vs $10)
- Detection threshold (75% vs 85% confidence)
- Admin approval speed (same-day vs 24hr)
- Social sharing prompts
- UI/UX variations

---

## 🚀 Go-To-Market Strategy

### Phase 1: Soft Launch (Weeks 1-2)
- **Target:** 50-100 users
- **Location:** 2-3 local bars
- **Budget:** $500-1,000
- **Focus:** QA testing, bug fixes, fraud detection

### Phase 2: Market Test (Weeks 3-4)
- **Target:** 200-500 users
- **Location:** Single city/metro area
- **Budget:** $2,000-5,000
- **Focus:** Conversion optimization, CAC analysis

### Phase 3: Regional Expansion (Month 2-3)
- **Target:** 1,000-2,000 users
- **Location:** Multi-city launch
- **Budget:** $10,000-20,000
- **Focus:** Scaling, partnerships, brand awareness

### Distribution Channels
1. **QR Codes:** Table tents, coasters, posters (bars/restaurants)
2. **Digital Ads:** Instagram, TikTok, Facebook (geo-targeted)
3. **Influencers:** Local food/drink influencers
4. **Events:** Whiskey tastings, bar crawls
5. **Partnerships:** Bar/restaurant partnerships

---

## 📱 Technical Requirements

### Device Support
- **iOS:** 14+ (Safari)
- **Android:** 10+ (Chrome)
- **Desktop:** Modern browsers (testing only)

### Browser Requirements
- Camera API support (WebRTC)
- LocalStorage enabled
- JavaScript enabled
- Cookies enabled

### Performance Targets
- **Page Load:** <2 seconds
- **Image Upload:** <5 seconds
- **ML Detection:** <3 seconds
- **Uptime:** 99.5%+

---

## 🔗 Quick Links

### Documentation
- **[PROGRESS.md](PROGRESS.md)** - Detailed project tracker
- **[NEXT_STEPS.md](NEXT_STEPS.md)** - Implementation roadmap
- **[README.md](README.md)** - Setup instructions
- **[docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)** - Full specifications
- **[docs/IMAGE_VALIDATION.md](docs/IMAGE_VALIDATION.md)** - Validation guide
- **[docs/GOOGLE_VISION_SETUP.md](docs/GOOGLE_VISION_SETUP.md)** - ML setup

### Development
- **Local:** http://localhost:3000
- **GitHub:** (your repo URL)
- **Production:** (TBD)

### Services
- **Supabase:** https://app.supabase.com/project/cticccvqxpltsimmiicx
- **Google Cloud:** https://console.cloud.google.com/
- **Vercel:** (TBD)

---

## 👥 Team & Roles

- **Product Owner:** (Your name)
- **Developer:** Claude Code + You
- **Designer:** (TBD or using templates)
- **Marketing:** (TBD)
- **Legal:** (External review required)

---

## 🎯 Current Priority

**Next 48 Hours:**
1. ✅ Set up Google Cloud Vision API (15 min manual)
2. 🤖 Implement bottle detection (Claude Code - 1 hour)
3. 🤖 Implement receipt validation (Claude Code - 1 hour)
4. ✅ Payment provider selected: PayPal Payouts
5. 🤖 Integrate PayPal Payouts API (Claude Code - 2 hours)

**This Week:**
- Complete ML integration
- Complete payment integration
- Full end-to-end testing
- Create legal pages

**Next Week:**
- Deploy to production
- Soft launch with 10-20 users
- Gather feedback
- Iterate

---

## 📞 Support & Resources

- **Questions?** Check [PROGRESS.md](PROGRESS.md) or [NEXT_STEPS.md](NEXT_STEPS.md)
- **Bugs?** Document in testing
- **Ideas?** Add to future enhancements backlog

---

**Remember:** Drink responsibly. Must be 21+. This is a marketing campaign for Keeper's Heart Whiskey promoting brand awareness and trial.
