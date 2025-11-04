# Deployment Guide - "Burn That Ad" MVP

## Quick Start (Vercel)

### Prerequisites
- Vercel account (sign up at [vercel.com](https://vercel.com))
- GitHub repository connected
- Supabase project (optional for MVP, required for production)

### 1. Deploy to Vercel

**Option A: One-Click Deploy**
```bash
# Push to GitHub
git add .
git commit -m "Initial MVP implementation"
git push origin master

# Go to vercel.com/new
# Import your GitHub repository
# Click "Deploy"
```

**Option B: Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: burn-jameson
# - Directory: ./
# - Override settings? No
```

### 2. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```env
# Required for production (can skip for MVP testing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ML Detection (add when ready)
GOOGLE_APPLICATION_CREDENTIALS=base64_encoded_service_account_json
GOOGLE_CLOUD_PROJECT_ID=your_project_id

# PayPal Payouts (add when ready)
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_ENVIRONMENT=sandbox
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=true
PAYPAL_EMAIL_RATE_LIMIT_DAYS=30
```

### 3. Domain Setup

**Default:** `burn-jameson.vercel.app`

**Custom Domain:**
1. Go to Vercel Dashboard → Settings → Domains
2. Add: `burnthatad.com`
3. Follow DNS configuration instructions

---

## Local Development

### Setup
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Edit .env.local with your values

# Start development server
npm run dev

# Open http://localhost:3000
```

### Testing the Flow

1. **Landing Page** → `http://localhost:3000`
   - Click "I'm 21+ Let's Go"
   - Age gate modal appears

2. **Intro** → `/intro`
   - Shows 3-step process
   - Click "Start Scanning"

3. **Camera Scan** → `/scan`
   - Grants camera permissions
   - Points at any object (mock detection)
   - After 10s: Shows "Having trouble?" button
   - Click to skip to burn animation

4. **Burn Animation** → `/scanning/[sessionId]`
   - Auto-plays 2.5s animation
   - Auto-navigates to success screen

5. **Success** → `/success/[sessionId]`
   - Prompts to buy Keeper's Heart
   - Click "Upload receipt"

6. **Upload** → `/upload/[sessionId]`
   - Take photo or upload file
   - Enter PayPal email address
   - Click "Submit & Get $5"

7. **Confirmation** → `/confirmation/[sessionId]`
   - Confetti animation
   - Shows "$5 Pending"

---

## Build & Deploy Commands

```bash
# Development
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint
npm run lint
```

---

## Performance Optimization

### Image Optimization
- Uses Next.js `<Image>` component
- Automatic WebP conversion
- Lazy loading

### Code Splitting
- Automatic route-based splitting
- Dynamic imports for heavy components

### Caching
- Static pages cached at edge
- API routes: 0 seconds (dynamic)
- Images: 1 year

---

## Vercel Configuration

### `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase_url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase_anon_key"
  }
}
```

### Build Settings
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`
- **Development Command:** `npm run dev`

---

## Post-Deployment Checklist

### Testing
- [ ] Age gate works
- [ ] Camera permissions prompt
- [ ] Mock bottle detection triggers after 2s
- [ ] Burn animation plays smoothly
- [ ] Session ID persists across routes
- [ ] PayPal email saves to localStorage
- [ ] Receipt upload accepts images
- [ ] Confetti animation plays on confirmation
- [ ] Mobile responsive (test on real device)

### Performance
- [ ] Lighthouse score > 90
- [ ] Time to Interactive < 3s
- [ ] Largest Contentful Paint < 2.5s

### SEO
- [ ] Meta tags set (title, description)
- [ ] Open Graph images
- [ ] Sitemap generated
- [ ] robots.txt configured

---

## Integrations (Phase 2)

### Google Vision API
1. Create Google Cloud project
2. Enable Vision API
3. Create service account
4. Download JSON key
5. Base64 encode: `cat key.json | base64`
6. Add to Vercel env: `GOOGLE_APPLICATION_CREDENTIALS`

### Supabase
1. Create project at supabase.com
2. Run migrations from `/supabase/migrations`
3. Get project URL and anon key
4. Add to Vercel environment variables
5. Update `lib/supabase.ts` with credentials

### PayPal Payouts API
1. Upgrade to a PayPal Business account and verify identity
2. Request access to the Payouts product (Sandbox + Live)
3. Create REST app credentials (`PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`)
4. Store credentials in Vercel environment variables
5. Implement payout handler in `/app/api/paypal-payout/route.ts`
6. Configure webhook endpoint for automatic status tracking
7. Set fraud prevention env vars (`ENABLE_PAYPAL_EMAIL_RATE_LIMIT`, `PAYPAL_EMAIL_RATE_LIMIT_DAYS`)

---

## Monitoring

### Vercel Analytics
- Automatically enabled
- Real-time visitor tracking
- Web Vitals monitoring

### Error Tracking (Optional)
```bash
npm install @vercel/analytics

# Add to app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

---

## Troubleshooting

### Build Fails
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### Camera Not Working
- Must be HTTPS (Vercel auto-provisions)
- Check browser permissions
- Test on real mobile device

### Images Not Loading
- Check `/public/images/` directory
- Verify image paths in components
- Use Next.js `<Image>` component

---

## Cost Estimate

### Vercel (Free Tier)
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Serverless functions
- ✅ SSL certificates

### Upgrade needed if:
- Traffic > 100 GB/month
- Team collaboration required
- Custom domains > 1

### External Services
- **Supabase:** Free tier (50k rows, 500 MB storage)
- **Google Vision:** $1.50 per 1000 requests
- **PayPal Payouts:** $0.25 per standard payout (1-2 days) or 1% for instant (max $10)

---

## Next Steps

1. ✅ Deploy to Vercel
2. ⏳ Test on mobile devices
3. ⏳ Set up Supabase database
4. ⏳ Integrate Google Vision API
5. ⏳ Connect PayPal Payouts API
6. ⏳ Add analytics
7. ⏳ Purchase custom domain
8. ⏳ Launch pilot campaign!

---

**Need help?** Check [UX_FLOW.md](UX_FLOW.md) and [MVP_PLAN.md](MVP_PLAN.md) for detailed specs.
