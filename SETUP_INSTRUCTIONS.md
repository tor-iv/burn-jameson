# Burn That Ad - Backend Setup Instructions

This guide will help you complete the backend setup after deploying the frontend to Vercel.

## Prerequisites

- Vercel deployment completed
- Supabase account (free tier works)
- Google Cloud account for Vision API (optional for ML detection)

---

## Step 1: Create Supabase Project

### 1.1 Sign up for Supabase
1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub (recommended)

### 1.2 Create New Project
1. Click "New Project"
2. Fill in details:
   - **Name:** burn-jameson-prod
   - **Database Password:** Create a strong password (save it!)
   - **Region:** Choose closest to your users (e.g., US East)
3. Click "Create new project"
4. Wait 2-3 minutes for setup

---

## Step 2: Set Up Database Schema

### 2.1 Access SQL Editor
1. In Supabase dashboard, click "SQL Editor" in left sidebar
2. Click "New query"

### 2.2 Run Migration Files

Copy and run each migration file in order:

**First, run:** `supabase/migrations/001_initial_schema.sql`
```sql
-- Copy the entire contents of this file and run it
```

**Then, run:** `supabase/migrations/002_bottle_scan_schema.sql`
```sql
-- Copy the entire contents of this file and run it
```

### 2.3 Verify Tables Created
1. Click "Table Editor" in left sidebar
2. You should see these tables:
   - users
   - bottle_scans
   - receipts
   - admin_users

---

## Step 3: Configure Storage

### 3.1 Create Storage Buckets
1. Click "Storage" in left sidebar
2. Click "Create a new bucket"

**Create two buckets:**

**Bucket 1: bottle-images**
- Name: `bottle-images`
- Public: ✓ (checked)
- Click "Create bucket"

**Bucket 2: receipt-images**
- Name: `receipt-images`
- Public: ✓ (checked)
- Click "Create bucket"

### 3.2 Set Up Storage Policies
The migration files already created the policies. Verify by:
1. Click on each bucket
2. Click "Policies"
3. You should see policies for INSERT and SELECT

---

## Step 4: Get Supabase Credentials

### 4.1 Get Project URL
1. Click "Settings" (gear icon) in left sidebar
2. Click "API"
3. Copy "Project URL" (looks like: `https://xxx.supabase.co`)

### 4.2 Get Anonymous Key
1. Same page, scroll to "Project API keys"
2. Copy "anon public" key
3. **Note:** This is safe to use in frontend (read-only)

---

## Step 5: Update Vercel Environment Variables

### 5.1 Go to Vercel Dashboard
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project "burn-jameson"
3. Click "Settings"
4. Click "Environment Variables"

### 5.2 Add Supabase Variables

Add these variables (click "Add" for each):

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | Production, Preview, Development |

### 5.3 Add Admin Password

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Choose a secure password | Production only |

**Important:** This password is for accessing the admin dashboard at `/admin`

### 5.4 Redeploy
1. Go to "Deployments" tab
2. Click "..." on latest deployment
3. Click "Redeploy"
4. Wait for deployment to complete

---

## Step 6: Test Supabase Connection

### 6.1 Test API Endpoint
1. Open your deployed site
2. Go to: `https://your-site.vercel.app/api/test-supabase`
3. You should see:
```json
{
  "connected": true,
  "message": "Successfully connected to Supabase",
  "timestamp": "..."
}
```

### 6.2 Test in Browser Console
1. Open your site in browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Run this:
```javascript
(async () => {
  const response = await fetch('/api/test-supabase');
  const data = await response.json();
  console.log('Supabase connected:', data.connected);
})()
```

You should see: `Supabase connected: true`

---

## Step 7: Set Up Admin User

### 7.1 Add Your Email to Admin Users
1. Go to Supabase dashboard
2. Click "Table Editor"
3. Select "admin_users" table
4. Click "Insert" → "Insert row"
5. Fill in:
   - **email:** your@email.com (the email you'll use to login)
   - Leave other fields (id and created_at will auto-fill)
6. Click "Save"

### 7.2 Test Admin Access
1. Go to: `https://your-site.vercel.app/admin`
2. Enter admin password (from step 5.3)
3. You should see admin dashboard (empty if no receipts yet)

---

## Step 8: Test Full Flow (Optional but Recommended)

### 8.1 Test Bottle Scan
1. Go to your site
2. Click through age gate and intro
3. On scan page:
   - Point camera at any bottle (or click "Having trouble? Upload photo")
   - Wait for detection or manual override
4. Check Supabase:
   - Go to Table Editor → bottle_scans
   - You should see a new row with your session

### 8.2 Test Receipt Upload
1. Continue the flow to upload receipt
2. Take/upload a photo
3. Enter Venmo username (e.g., @yourname)
4. Submit
5. Check Supabase:
   - Go to Table Editor → receipts
   - You should see your receipt with status "pending"

### 8.3 Test Admin Dashboard
1. Go to `/admin`
2. Enter password
3. You should see the receipt you just uploaded
4. Try keyboard shortcuts:
   - A = Approve
   - R = Reject
   - ← → = Navigate

---

## Step 9: Optional - Google Vision API Setup

### 9.1 Create Google Cloud Project
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click "New Project"
3. Name: "burn-jameson-ml"
4. Click "Create"

### 9.2 Enable Vision API
1. Search for "Vision API" in search bar
2. Click "Cloud Vision API"
3. Click "Enable"

### 9.3 Create Service Account
1. Go to "IAM & Admin" → "Service Accounts"
2. Click "Create Service Account"
3. Name: "burn-jameson-vision"
4. Click "Create and Continue"
5. Role: "Cloud Vision API User"
6. Click "Done"

### 9.4 Create Key
1. Click on the service account you just created
2. Click "Keys" tab
3. Click "Add Key" → "Create new key"
4. Choose "JSON"
5. Click "Create"
6. Save the downloaded JSON file securely

### 9.5 Add to Vercel
1. Open the JSON file
2. Copy entire contents
3. Convert to base64:
   ```bash
   cat service-account.json | base64
   ```
4. In Vercel:
   - Go to Environment Variables
   - Add `GOOGLE_APPLICATION_CREDENTIALS` with base64 value
   - Add `GOOGLE_CLOUD_PROJECT_ID` with your project ID

### 9.6 Install Package
The package is already in package.json, but if needed:
```bash
npm install @google-cloud/vision
```

---

## Troubleshooting

### Issue: "Supabase connection failed"
**Solution:**
- Check if NEXT_PUBLIC_SUPABASE_URL is correct
- Check if NEXT_PUBLIC_SUPABASE_ANON_KEY is correct
- Verify Vercel redeployed after adding env vars

### Issue: "Failed to upload image"
**Solution:**
- Check if storage buckets exist (bottle-images, receipt-images)
- Verify storage policies are set up correctly
- Check browser console for errors

### Issue: "Session invalid" when uploading receipt
**Solution:**
- Bottle scan must happen first
- Session expires after 24 hours
- Check if bottle_scans table has the session_id

### Issue: "Admin dashboard shows no receipts"
**Solution:**
- Upload a test receipt first
- Check receipts table has status = 'pending'
- Verify admin_users table has your email

### Issue: "Rate limit errors"
**Solution:**
- Rate limit is 3 scans per 24 hours per IP
- Wait 24 hours or clear bottle_scans table for testing
- Admin can manually clear old scans in Supabase

---

## Security Notes

### For Production:
1. **Admin Password:** Change from default in .env.local
2. **Row Level Security:** Already enabled on all tables
3. **Storage:** Already configured with proper policies
4. **Rate Limiting:** Already implemented (3 scans/24h)
5. **Duplicate Detection:** Already implemented via image hashing

### Recommended Next Steps:
1. Set up Supabase auth for admin (instead of password)
2. Add email notifications for new receipts
3. Set up automated Venmo payouts via PayPal API
4. Add analytics (Vercel Analytics, Plausible, etc.)
5. Set up error tracking (Sentry)

---

## Cost Estimates

### Supabase (Free Tier)
- ✅ 500MB database
- ✅ 1GB file storage
- ✅ 2GB bandwidth
- **Cost:** $0/month (upgrade at $25/month if needed)

### Vercel (Hobby Plan)
- ✅ 100GB bandwidth
- ✅ Unlimited deployments
- **Cost:** $0/month (Pro at $20/month if needed)

### Google Vision API (Optional)
- 1000 free requests/month
- Then $1.50 per 1000 requests
- **Cost:** ~$0-5/month depending on usage

### Total Monthly Infrastructure:
**$0** for MVP testing, ~$25-50/month at scale

---

## Next Steps After Setup

1. ✅ Test full user flow
2. ✅ Test admin dashboard
3. ✅ Upload test bottle images
4. 📊 Set up analytics
5. 📧 Add email notifications
6. 💰 Integrate automated payouts
7. 🚀 Launch pilot campaign!

---

## Support

- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)

Need help? Check the logs:
- **Vercel:** Deployments → View Function Logs
- **Supabase:** Logs & Reports in dashboard
- **Browser:** Developer Tools → Console

---

**You're all set! 🎉**

Your backend is now fully configured and ready for testing.
