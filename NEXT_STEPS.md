# Next Steps - Burn That Ad Implementation

This document outlines the immediate next steps to complete your MVP and launch the Burn That Ad campaign.

## ✅ Completed

- [x] Project setup with Next.js, TypeScript, Tailwind CSS
- [x] Age gate screen with 21+ verification
- [x] Campaign intro "How It Works" screen
- [x] Supabase client configuration with environment variables
- [x] Database schema (users, scans, receipts)
- [x] Scan page with bottle detection UI
- [x] Receipt upload page with PayPal email capture
- [x] Admin dashboard for receipt review
- [x] Supabase Storage integration for images
- [x] Session management and validation
- [x] Rate limiting and duplicate detection
- [x] Responsive mobile-first design
- [x] **Image validation (format, size, quality checks)**
- [x] **Error handling with clear user messages**

## 🎯 Priority 1: Database & Storage Setup (Required for MVP)

### 1. Configure Supabase Storage Buckets

Your app expects two storage buckets in Supabase:

**In Supabase Dashboard:**
1. Go to Storage in your Supabase project
2. Create bucket `bottle-images` (for scanned bottle photos)
   - Set to **Public** (images need to be viewable by admins)
   - Max file size: 5MB recommended
3. Create bucket `receipt-images` (for receipt uploads)
   - Set to **Public** (admins need to review)
   - Max file size: 10MB recommended

**Storage Policies:**
```sql
-- Allow authenticated uploads to bottle-images
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'bottle-images');

-- Allow public reads for bottle-images
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'bottle-images');

-- Same for receipt-images
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipt-images');

CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipt-images');
```

### 2. Run Database Migration

Apply the schema from `supabase/migrations/002_bottle_scan_schema.sql`:

1. Open Supabase Dashboard → SQL Editor
2. Run the migration file
3. Verify tables exist: `bottle_scans`, `receipts`, `users`

### 3. Set Admin Password

In your `.env.local` file, change the admin password:
```bash
NEXT_PUBLIC_ADMIN_PASSWORD=YourSecurePassword123!
```

## 🎯 Priority 2: Image Validation & ML Detection

### Current State: Basic Validation ✅
Your app now validates all images for:
- ✅ **File format** (JPG, PNG, WebP only)
- ✅ **File size** (100KB - 10MB range)
- ✅ **Quality checks** (prevents blank/corrupted files)
- ✅ **Clear error messages** for users

See [docs/IMAGE_VALIDATION.md](docs/IMAGE_VALIDATION.md) for details.

### Next: Add Content Validation (Recommended)

Currently using mock detection. Choose one option:

### Option A: Google Vision API (Recommended for MVP)
Adds content validation to verify images actually contain bottles/receipts.

**Setup:**
1. Create Google Cloud project
2. Enable Vision API
3. Download service account JSON key
4. Add to `.env.local`:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   ```
5. See [docs/IMAGE_VALIDATION.md](docs/IMAGE_VALIDATION.md) for implementation code

**Benefits:**
- Validates actual bottle/receipt content
- 90% fraud reduction
- Automated approval for clear receipts

### Option B: Roboflow (Custom Model)
- See [docs/ROBOFLOW_GUIDE.md](docs/ROBOFLOW_GUIDE.md) for setup
- Requires training custom model on whiskey bottles
- More accurate but takes 1-2 days to set up

### Option C: Keep Mock (Fast MVP Launch)
- Current mock detection works for demo
- Basic validation already prevents bad files
- Replace with real ML later

## 🎯 Priority 3: Testing & Validation

### Test Core User Flow

1. **Age Gate** → `http://localhost:3000`
   - Verify 21+ modal appears
   - Test "I'm 21+" button

2. **Scan Bottle** → `/scan`
   - Point camera at Jameson bottle (or any bottle in mock mode)
   - Verify detection animation works
   - Check session ID is created

3. **Upload Receipt** → `/upload/[sessionId]`
   - Upload a test receipt image
   - Enter PayPal email address
   - Verify upload succeeds

4. **Admin Dashboard** → `/admin`
   - Enter admin password
   - Verify receipt appears with bottle scan
   - Test approve/reject buttons
   - Verify PayPal payout request succeeds (check Supabase record for `paypal_payout_id`)

### Test Error Cases

- Expired session (24+ hours old)
- Duplicate receipt upload
- Invalid session ID
- Missing PayPal email
- Large file uploads (>10MB)

### Test Supabase Connection

```bash
curl http://localhost:3000/api/test-supabase
```

Should return: `{"connected":true}`

## 🎯 Priority 4: Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "MVP ready for deployment"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variables in Vercel dashboard:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_ADMIN_PASSWORD=your-secure-password
   ```
4. Deploy!

### 3. Configure Custom Domain (Optional)

- Add custom domain in Vercel dashboard
- Update DNS records
- Example: `burnthatad.keepersheart.com`

## 🎯 Priority 5: Polish & Launch Prep

### UI Enhancements

- [ ] Add loading states for image uploads
- [ ] Add success/error toast notifications
- [ ] Improve camera permission error handling
- [ ] Add "Are you sure?" confirmation before rejection in admin
- [ ] Add image preview zoom in admin dashboard

### Analytics Setup (Recommended)

Add tracking to measure campaign success:

1. Install analytics library (e.g., Vercel Analytics, Google Analytics)
2. Track key events:
   - Age gate completions
   - Bottle scans (successful detections)
   - Receipt uploads
   - Admin approvals/rejections
   - PayPal payout requests

### Legal Pages

Create required pages:
- [ ] `/privacy` - Privacy Policy
- [ ] `/terms` - Terms of Service
- [ ] `/rules` - Official Rules (for sweepstakes compliance)

### Email Notifications (Nice to Have)

Set up email confirmations using Supabase Edge Functions:
- Receipt upload confirmation → User
- Receipt approved → User
- New receipt pending → Admin

## 🔄 Post-Launch: Phase 2 Features

Once MVP is live and working:

### Automated Payouts
- Expand PayPal Payouts automation (batching, instant payouts)
- Evaluate Tremendous API as a future optional reward channel
- See [docs/BACKEND_ROADMAP.md](docs/BACKEND_ROADMAP.md)

### Advanced ML Detection
- Train custom Roboflow model
- Add confidence threshold tuning
- Multi-brand detection (expand beyond Jameson)

### Enhanced Admin Dashboard
- Bulk approve/reject
- Search and filters
- Analytics dashboard
- Export to CSV

### Rate Limiting & Fraud Prevention
- IP-based rate limiting (currently basic)
- Device fingerprinting
- Geofencing for specific markets
- Enhanced duplicate detection

## 📚 Helpful Resources

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Vercel Deployment](https://nextjs.org/docs/app/building-your-application/deploying)
- [Google Vision API](https://cloud.google.com/vision/docs)

## 🆘 Troubleshooting

### Supabase Connection Fails
- Verify environment variables in `.env.local`
- Check Supabase project is active
- Test with `/api/test-supabase` endpoint

### Image Upload Fails
- Verify storage buckets exist in Supabase
- Check bucket policies allow uploads
- Ensure file size < 10MB

### Camera Not Working
- Must use HTTPS (localhost works)
- Check browser camera permissions
- Test on actual mobile device (not just responsive mode)

### Admin Dashboard Empty
- Verify receipts exist with `status='pending'`
- Check Supabase table directly
- Ensure session_id matches between tables

## 🎉 Ready to Launch Checklist

Before going live:

- [ ] Supabase storage buckets created
- [ ] Database migration applied
- [ ] Admin password changed from default
- [ ] App tested end-to-end on mobile device
- [ ] Deployed to Vercel with environment variables
- [ ] Custom domain configured (if applicable)
- [ ] Privacy policy and terms pages added
- [ ] Analytics tracking implemented
- [ ] Team trained on admin dashboard

---

**Questions or issues?** Check the [docs/](docs/) directory or refer to the code comments in key files:
- [lib/supabase-helpers.ts](lib/supabase-helpers.ts) - Database operations
- [app/api/detect-bottle/route.ts](app/api/detect-bottle/route.ts) - ML detection
- [app/admin/page.tsx](app/admin/page.tsx) - Admin dashboard
