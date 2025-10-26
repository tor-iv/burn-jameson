# Production Deployment Checklist - "Burn That Ad"

## 🎯 Pre-Deployment Checklist

### 1. **PayPal Payouts Setup**
- [ ] Created LIVE PayPal app at https://developer.paypal.com/dashboard/
- [ ] Copied LIVE Client ID (from "Live" tab, NOT "Sandbox")
- [ ] Copied LIVE Client Secret (from "Live" tab)
- [ ] Verified Payouts feature is enabled for the app
- [ ] PayPal account is verified and can send payouts

### 2. **Environment Variables - Vercel**
Go to Vercel project → Settings → Environment Variables

**Required Variables:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- [ ] `GOOGLE_VISION_API_KEY` - Google Cloud Vision API key
- [ ] `PAYPAL_CLIENT_ID` - **LIVE** PayPal Client ID
- [ ] `PAYPAL_CLIENT_SECRET` - **LIVE** PayPal Secret
- [ ] `PAYPAL_ENVIRONMENT=live` - Use live PayPal API
- [ ] `ADMIN_PASSWORD` - Strong random password (use `openssl rand -base64 32`)

**Fraud Prevention (MUST be enabled):**
- [ ] `ENABLE_PAYPAL_EMAIL_RATE_LIMIT=true`
- [ ] `PAYPAL_EMAIL_RATE_LIMIT_DAYS=30`
- [ ] `NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=true`

**Production Settings:**
- [ ] `NEXT_PUBLIC_DISABLE_TEST_MODE=true` - Disable test features
- [ ] `TEST_PAYOUT_AMOUNT` is **NOT** set (omit for full $5.00 payouts)

### 3. **Supabase Database**
- [ ] All migrations applied (001, 002, 003)
- [ ] RLS policies configured correctly
- [ ] Storage buckets created (`bottle-images`, `receipt-images`)
- [ ] Storage buckets set to public access
- [ ] Database backups enabled

### 4. **Code Review**
- [ ] All changes committed to git
- [ ] No console.log statements in production code
- [ ] No hardcoded secrets or API keys
- [ ] Test mode features disabled in production
- [ ] Admin authentication uses server-side password check

### 5. **Legal & Compliance**
- [ ] Privacy Policy page created
- [ ] Terms of Service page created
- [ ] Age gate meets legal requirements (21+ for alcohol)
- [ ] PayPal payout terms clearly stated

---

## 🚀 Deployment Steps

### Step 1: Commit All Changes
```bash
git add .
git commit -m "Production readiness: security headers, admin auth, test mode disable"
git push origin main
```

### Step 2: Deploy to Vercel Preview (Staging)
```bash
# Vercel will auto-deploy on push
# Or manually trigger preview deployment:
vercel --prod=false
```

### Step 3: Test Preview Deployment
**Test URL:** Check Vercel dashboard for preview URL

**Test Checklist:**
- [ ] Age gate loads correctly
- [ ] Intro page displays properly
- [ ] Camera access works on mobile (iOS Safari, Android Chrome)
- [ ] Bottle detection API returns results
- [ ] Receipt upload works
- [ ] Admin dashboard loads (uses server-side auth)
- [ ] Test mode features are disabled (`NEXT_PUBLIC_DISABLE_TEST_MODE=true`)
- [ ] No errors in browser console
- [ ] No errors in Vercel function logs

### Step 4: Test PayPal with Penny Payouts
**BEFORE testing with full $5 payouts:**

1. Set `TEST_PAYOUT_AMOUNT=0.01` in Vercel ENV (for preview/staging)
2. Go through complete user flow
3. Upload a real receipt
4. Approve in admin dashboard
5. Verify $0.01 arrives in PayPal account (1-2 days)
6. **Cost:** ~$0.02 per test (payout + fee)

**Run 2-3 tests** to verify everything works.

### Step 5: Switch to Production $5 Payouts
1. Remove `TEST_PAYOUT_AMOUNT` from Vercel ENV
2. Redeploy
3. Test ONE more time with full $5.00 payout (use your own email)
4. Verify $5.00 arrives in your PayPal account

### Step 6: Deploy to Production
```bash
# Deploy to production domain
vercel --prod

# Or use Vercel dashboard: "Promote to Production"
```

### Step 7: Post-Deployment Verification
- [ ] Production URL loads correctly
- [ ] SSL certificate valid (https)
- [ ] Security headers present (check: https://securityheaders.com/)
- [ ] Test complete user flow on production
- [ ] Admin dashboard accessible with new password
- [ ] Test mode features disabled
- [ ] PayPal payouts work ($5.00, not $0.01)

### Step 8: Monitor First 24 Hours
- [ ] Check Vercel function logs for errors
- [ ] Monitor Supabase database for submissions
- [ ] Check PayPal dashboard for payout statuses
- [ ] Monitor admin dashboard for pending receipts
- [ ] Watch for rate limiting issues (IP-based, email-based)

---

## 🔐 Security Verification

### Check Security Headers
Visit: https://securityheaders.com/?q=your-production-url.vercel.app

**Expected Headers:**
- ✅ X-Frame-Options: DENY
- ✅ X-Content-Type-Options: nosniff
- ✅ Strict-Transport-Security
- ✅ Referrer-Policy
- ✅ Permissions-Policy

### Verify Admin Password Security
1. Open browser DevTools → Console
2. Type: `process.env`
3. Verify `ADMIN_PASSWORD` is **NOT** visible (should only see `NEXT_PUBLIC_*` vars)
4. If you see `NEXT_PUBLIC_ADMIN_PASSWORD`, **REMOVE IT** from Vercel ENV immediately

### Test Fraud Prevention
1. **Duplicate Bottle:** Upload same bottle photo twice → Should reject 2nd attempt
2. **IP Rate Limiting:** Scan 3 bottles → 4th scan should be blocked (24-hour limit)
3. **Duplicate Receipt:** Upload same receipt twice → Should reject 2nd attempt
4. **Email Rate Limiting:** Try payout to same email twice → 2nd should be blocked (30-day limit)

---

## 🐛 Troubleshooting Guide

### Issue: "Failed to fetch" errors
**Cause:** API routes timing out or failing
**Fix:**
- Check Vercel function logs
- Verify all ENV variables are set
- Check Google Vision API quota
- Check PayPal API status

### Issue: Admin dashboard shows "Invalid password"
**Cause:** `ADMIN_PASSWORD` not set in Vercel
**Fix:**
- Add `ADMIN_PASSWORD` to Vercel environment variables
- Redeploy project

### Issue: PayPal payouts fail
**Cause:** Wrong credentials or environment mismatch
**Fix:**
- Verify using LIVE credentials (not sandbox)
- Check `PAYPAL_ENVIRONMENT=live`
- Verify PayPal account can send payouts
- Check PayPal dashboard for error messages

### Issue: Bottle detection not working
**Cause:** Google Vision API key invalid or quota exceeded
**Fix:**
- Verify `GOOGLE_VISION_API_KEY` is correct
- Check Google Cloud Console for API quota
- Enable Vision API if not already enabled

### Issue: Test mode still active in production
**Cause:** `NEXT_PUBLIC_DISABLE_TEST_MODE` not set or set to false
**Fix:**
- Set `NEXT_PUBLIC_DISABLE_TEST_MODE=true` in Vercel
- Redeploy project
- Clear browser cache

### Issue: Images not loading (Supabase storage)
**Cause:** Image domains not configured in next.config.js
**Fix:** Already configured! If issues persist:
- Check Supabase storage bucket is public
- Verify RLS policies allow public read access
- Check Vercel function logs for image optimization errors

---

## 📊 Monitoring & Analytics

### Vercel Analytics
- Enable Vercel Analytics in project settings (free tier available)
- Monitor page views, performance, errors

### Supabase Monitoring
- Check database usage in Supabase dashboard
- Monitor storage usage (bottle images, receipt images)
- Review query performance

### PayPal Dashboard
- Monitor payout statuses: https://www.paypal.com/payouts
- Track successful vs. failed payouts
- Check for fraud patterns

### Key Metrics to Track
- **Conversion Rate:** Bottle scans → Receipt uploads
- **Approval Rate:** Receipts submitted → Receipts approved
- **Payout Success:** Approved receipts → Successful payouts
- **Average Time to Payout:** Receipt upload → Money sent
- **Rate Limit Hits:** How many users hit IP/email rate limits
- **Fraud Attempts:** Duplicate bottle/receipt submissions blocked

---

## 🔄 Rollback Plan

If critical issues arise in production:

### Quick Rollback (Vercel)
1. Go to Vercel project → Deployments
2. Find previous stable deployment
3. Click "..." → "Promote to Production"
4. Production rolls back instantly

### Disable Payouts (Emergency)
1. Go to Vercel ENV variables
2. Change `PAYPAL_ENVIRONMENT=sandbox`
3. Redeploy
4. Payouts will fail gracefully until fixed

### Disable New Submissions
1. Add `NEXT_PUBLIC_MAINTENANCE_MODE=true` to Vercel ENV
2. Redeploy
3. Show maintenance page to users
4. Admin dashboard still accessible for existing receipts

---

## 📝 Post-Launch Tasks

### Week 1
- [ ] Monitor errors daily
- [ ] Check PayPal payout success rate
- [ ] Review fraud prevention effectiveness
- [ ] Gather user feedback

### Month 1
- [ ] Analyze conversion metrics
- [ ] Review database storage usage
- [ ] Optimize API costs (Google Vision, PayPal)
- [ ] Consider adding Sentry error tracking

### Ongoing
- [ ] Monthly security audit
- [ ] Update dependencies (`npm audit`, `npm update`)
- [ ] Review and adjust fraud prevention rules
- [ ] Monitor PayPal fees and optimize

---

## 🆘 Emergency Contacts

**Vercel Support:** https://vercel.com/support
**Supabase Support:** https://supabase.com/dashboard/support
**PayPal Developer Support:** https://developer.paypal.com/support/
**Google Cloud Support:** https://console.cloud.google.com/support

---

## ✅ Production Launch Checklist Summary

Copy this checklist to track your deployment:

```
PRE-DEPLOYMENT:
□ PayPal LIVE credentials configured
□ All Vercel ENV variables set
□ Fraud prevention enabled
□ Test mode disabled
□ Admin password is strong & secure
□ Database migrations applied
□ Legal pages created (Privacy, ToS)

TESTING:
□ Preview deployment tested
□ Penny payouts tested ($0.01)
□ Full payout tested ($5.00)
□ Mobile camera tested (iOS + Android)
□ Fraud prevention tested
□ Security headers verified

PRODUCTION:
□ Deployed to production
□ Production URL accessible
□ PayPal payouts work
□ Admin dashboard accessible
□ No test mode features visible
□ Security headers present
□ Monitoring enabled

POST-LAUNCH:
□ Monitor logs for 24 hours
□ Track conversion metrics
□ Check PayPal dashboard daily
□ Review fraud attempts
□ Gather user feedback
```

---

**🎉 You're ready for launch! Good luck!**

For questions or issues, review:
- [CLAUDE.md](CLAUDE.md) - Complete project documentation
- [PAYPAL_QUICK_START.md](PAYPAL_QUICK_START.md) - PayPal setup guide
- [FRAUD_PREVENTION_SUMMARY.md](FRAUD_PREVENTION_SUMMARY.md) - Fraud prevention reference
