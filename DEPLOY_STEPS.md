# Deploy to Vercel - Step by Step

## ✅ Vercel CLI Installed
Version: 48.2.9

---

## Deployment Steps

### 1. Login to Vercel
```bash
vercel login
```
This will:
- Open browser for authentication
- You can sign up with GitHub, GitLab, or email
- One-time setup

### 2. Deploy the Project
```bash
vercel
```

You'll be asked:
- **Set up and deploy?** → Yes
- **Which scope?** → Your account/team
- **Link to existing project?** → No (first time)
- **Project name?** → burn-jameson (or custom name)
- **Directory?** → ./ (press Enter)
- **Override settings?** → No (press Enter)

### 3. Wait for Deployment
Vercel will:
- ✅ Upload your code
- ✅ Install dependencies
- ✅ Build Next.js app
- ✅ Deploy to global CDN
- ✅ Give you a live URL

Expected time: **2-3 minutes**

### 4. Get Your Live URL
```
🎉 Deployed to production!
https://burn-jameson.vercel.app
```

---

## After First Deployment

### Future Deployments (Super Easy)
```bash
# Just run:
vercel

# Or for production:
vercel --prod
```

### Automatic Deployments (Even Easier)
Once deployed, Vercel will watch your GitHub repo:
- Every `git push` → New preview deployment
- Push to `main/master` → Production deployment

---

## Common Questions

### Q: Do I need to build first?
**A:** No! Vercel builds for you automatically.

### Q: What if I get errors?
**A:** Common fixes:
- Make sure `npm run build` works locally first
- Check environment variables in Vercel dashboard
- View build logs in Vercel dashboard

### Q: How do I add environment variables?
**A:**
1. Go to vercel.com/dashboard
2. Select project → Settings → Environment Variables
3. Add variables (e.g., `NEXT_PUBLIC_SUPABASE_URL`)

### Q: Can I use a custom domain?
**A:**
1. Go to project Settings → Domains
2. Add your domain (e.g., burnthatad.com)
3. Follow DNS instructions

---

## Next Steps After Deployment

### 1. Test the Live Site
- Visit your Vercel URL
- Test age gate
- Test camera permissions (requires HTTPS ✅)
- Test on real mobile devices

### 2. Share with Client
- Send them the live URL
- Get feedback
- Iterate

### 3. Add Backend (Later)
- Supabase environment variables
- Google Vision API credentials
- Venmo API keys

---

## Troubleshooting

### Build Fails?
```bash
# Test build locally first
npm run build

# If it works locally but fails on Vercel:
# - Check Node.js version (should be 18+)
# - Check for environment-specific code
# - View detailed logs in Vercel dashboard
```

### Want to Redeploy?
```bash
vercel --force
```

### Want to Delete Deployment?
```bash
# Go to vercel.com/dashboard
# Project → Settings → Delete Project
```

---

## Ready to Deploy!

**Run this command:**
```bash
vercel login
```

Then follow the prompts!
