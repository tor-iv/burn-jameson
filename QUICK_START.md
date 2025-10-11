# Quick Start Guide - Backend Setup

## ⚡ Get Your Backend Running in 15 Minutes

This guide assumes you've already deployed the frontend to Vercel.

---

## Step 1: Create Supabase Account (2 min)

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub

---

## Step 2: Create Project (3 min)

1. Click "New Project"
2. Fill in:
   - **Name:** burn-jameson
   - **Password:** (save this somewhere safe!)
   - **Region:** Choose nearest to you
3. Click "Create" and wait ~2 min

---

## Step 3: Run Database Migrations (2 min)

1. Click **"SQL Editor"** in left sidebar
2. Click **"New query"**
3. Copy contents from [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql)
4. Paste and click **"Run"**
5. Repeat for [`supabase/migrations/002_bottle_scan_schema.sql`](supabase/migrations/002_bottle_scan_schema.sql)

---

## Step 4: Create Storage Buckets (2 min)

1. Click **"Storage"** in left sidebar
2. Click **"Create bucket"**
3. Create bucket named `bottle-images` (make it public ✅)
4. Click **"Create bucket"** again
5. Create bucket named `receipt-images` (make it public ✅)

---

## Step 5: Get Credentials (1 min)

1. Click **"Settings"** (gear icon) → **"API"**
2. Copy these values:
   - **Project URL** (e.g., `https://xxx.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

---

## Step 6: Add to Vercel (3 min)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project
3. Click **"Settings"** → **"Environment Variables"**
4. Add these (click "Add" for each):

| Variable | Value | All Environments |
|----------|-------|------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Project URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your anon key | ✅ |
| `NEXT_PUBLIC_ADMIN_PASSWORD` | Choose password | ✅ |

5. Click **"Deployments"** → Click "..." on latest → **"Redeploy"**

---

## Step 7: Test It! (2 min)

1. Visit: `https://your-site.vercel.app/api/test-supabase`
2. Should see:
   ```json
   {
     "connected": true,
     "message": "Successfully connected to Supabase"
   }
   ```

3. Try admin: `https://your-site.vercel.app/admin`
   - Enter your admin password
   - Should see dashboard (empty at first)

---

## ✅ You're Done!

Your backend is fully set up. Now:

1. **Test the flow:**
   - Scan a bottle
   - Upload receipt
   - Review in admin dashboard

2. **Add yourself as admin (optional):**
   - Go to Supabase → Table Editor → admin_users
   - Insert row with your email

3. **Launch your campaign! 🚀**

---

## Need More Details?

See [`SETUP_INSTRUCTIONS.md`](SETUP_INSTRUCTIONS.md) for comprehensive guide.

## What's Implemented?

See [`BACKEND_IMPLEMENTATION.md`](BACKEND_IMPLEMENTATION.md) for full technical details.

---

## Troubleshooting

### "Supabase connection failed"
- Double-check environment variables in Vercel
- Make sure you redeployed after adding them

### "No admin_users table"
- Run both migration files in order
- Check SQL Editor for any errors

### "Can't upload images"
- Verify storage buckets are created
- Make sure they're set to public

---

**Questions?** Check the full setup guide or Supabase docs.
