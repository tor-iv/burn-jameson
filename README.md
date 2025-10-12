# Burn That Ad - Keeper's Heart Whiskey Campaign

A mobile-first web application for an AR whiskey marketing campaign. Scan competitor whiskey bottles (Jameson, Bulleit, Woodford Reserve, and 11+ more brands), watch an AR "burn" effect, and receive instant cash rebates for Keeper's Heart whiskey.

**📖 READ FIRST: [OVERVIEW.md](OVERVIEW.md)** - Complete project details, competitor brands list, business model, and current status.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (for production)

### Installation

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Set up environment variables:**
```bash
cp .env.example .env.local
```

Then edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. **Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## 📁 Project Structure

```
/app
  /page.tsx                  # Main entry (age gate)
  /intro/page.tsx            # Campaign intro / How It Works ✅
  /scan/page.tsx             # AR Camera view (TODO)
  /reveal/[scanId]/page.tsx  # Coupon reveal screen (TODO)
  /upload/[scanId]/page.tsx  # Receipt upload screen (TODO)
  /admin/page.tsx            # Manual review dashboard (TODO)

/components
  /ui/                       # shadcn/ui components
  /age-gate.tsx              # 21+ verification modal ✅
  /camera-scanner.tsx        # QR scanner component (TODO)
  /burn-animation.tsx        # AR burn effect overlay (TODO)
  /coupon-card.tsx           # Coupon display component (TODO)
  /receipt-uploader.tsx      # Image upload component (TODO)

/lib
  /supabase.ts               # Supabase client setup ✅
  /generate-coupon.ts        # Unique code generation ✅

/supabase/migrations
  /001_initial_schema.sql    # Database schema ✅
```

## 🗄️ Database Setup

### Local Development with Supabase CLI

1. **Install Supabase CLI:**
```bash
npm install -g supabase
```

2. **Initialize Supabase:**
```bash
supabase init
supabase start
```

3. **Run migrations:**
```bash
supabase db reset
```

This will create:
- `users` table - Store user info and age verification
- `scans` table - Track QR scans and coupon codes
- `receipts` table - Store receipt uploads and payout status
- `receipts` storage bucket - For receipt images

### Production Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API
3. Copy your `URL` and `anon` key to `.env.local`
4. Run the migration SQL from `supabase/migrations/001_initial_schema.sql` in the SQL Editor

## 🎨 Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS with custom Keeper's Heart brand theme
- **Animations:** Framer Motion
- **AR/Camera:** html5-qrcode
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Hosting:** Vercel (recommended)

## 🎯 MVP Features (Week 1 - Foundation) ✅

- [x] Next.js project setup with TypeScript and Tailwind
- [x] Age gate screen with 21+ verification
- [x] Campaign intro "How It Works" screen
- [x] Supabase client configuration
- [x] Database schema (users, scans, receipts)
- [x] Responsive mobile-first layout

## 🎯 Week 2 - Camera & AR ✅

- [x] Build QR scanner component using html5-qrcode
- [x] Create burn animation with Framer Motion
- [x] Generate unique coupon codes on scan
- [x] Store scans in localStorage (Supabase integration ready)
- [x] Build coupon reveal screen
- [x] Add copy-to-clipboard functionality
- [x] Receipt upload UI (ready for Supabase Storage)

## 📋 Next Steps (Week 3 - Receipt Processing)

- [ ] Integrate Supabase Storage for receipt uploads
- [ ] Build admin dashboard for receipt review
- [ ] Add basic duplicate prevention
- [ ] Email/SMS confirmation on receipt upload
- [ ] Manual payout tracking

## 🎨 Brand Design System

### Colors
- Primary: Whiskey Amber (`#B8860B`, `#CD853F`)
- Secondary: Cream (`#FFF8DC`)
- Accent: Emerald (`#2C5F2D`), Copper (`#B87333`)
- Neutral: Charcoal (`#2C2C2C`), Oak (`#F5F5DC`)

### Typography
- Headlines: Playfair Display (serif, elegant, bold)
- Body: Inter (sans-serif, clean)

### Components
- Border radius: `12px`
- Button padding: `16px` vertical, `32px` horizontal
- Minimum tap target: `44px`

## 📱 Testing

The app is mobile-first and should be tested on:
- iOS Safari (375px - 430px wide)
- Android Chrome
- Desktop browsers (responsive breakpoints: 640px, 768px, 1024px)

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project to [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Environment Variables for Production
```
NEXT_PUBLIC_SUPABASE_URL=your-production-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-key
```

## 📄 Documentation

**Main Docs:**
- **[OVERVIEW.md](OVERVIEW.md)** ⭐ - Complete project overview, competitor brands, business model
- **[PROGRESS.md](PROGRESS.md)** - Detailed progress tracker with task breakdown
- **[NEXT_STEPS.md](NEXT_STEPS.md)** - Implementation roadmap and priorities

**Technical Docs:**
- [Requirements](docs/REQUIREMENTS.md) - Full feature specifications
- [Supabase Setup](docs/SUPABASE_SETUP.md) - Database configuration guide
- [Google Vision Setup](docs/GOOGLE_VISION_SETUP.md) - ML API setup guide
- [Image Validation](docs/IMAGE_VALIDATION.md) - Validation implementation
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment steps
- [ML Detection Analysis](docs/ML_DETECTION_ANALYSIS.md) - Computer vision options
- [Backend Roadmap](docs/BACKEND_ROADMAP.md) - API and backend features
- [UX Flow](docs/UX_FLOW.md) - User experience documentation
- [Claude Instructions](CLAUDE.md) - AI development guidelines

## 🔒 Legal & Compliance

- Age gating: 21+ verification required
- Must comply with comparative advertising laws
- Tied-house law compliance for alcohol industry
- Privacy policy and terms of service required for production

## 📞 Support

For issues or questions, please refer to the project documentation or create an issue in the repository.

---

**Keeper's Heart Whiskey** - Drink Responsibly. Must be 21+.
