# Fraud Prevention - Quick Reference

## ✅ What Was Just Implemented

### 3 New Fraud Prevention Layers

**1. Receipt Image Duplicate Detection**
- SHA-256 hash of every receipt photo
- Prevents same receipt from being submitted multiple times
- **ENV Toggle:** `NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=true` (default)

**2. PayPal Email Rate Limiting**
- Limits payouts per email address
- Default: 1 payout per email per 30 days
- **ENV Toggle:** `ENABLE_PAYPAL_EMAIL_RATE_LIMIT=true` (default)
- **Configurable Period:** `PAYPAL_EMAIL_RATE_LIMIT_DAYS=30`

**3. Enhanced TypeScript Types**
- Added `image_hash` field to Receipt interface
- Updated field names from Venmo to PayPal

---

## 🗂️ Files Modified

### Database Schema
- ✅ **[supabase/migrations/003_receipt_fraud_prevention.sql](supabase/migrations/003_receipt_fraud_prevention.sql)** - NEW
  - Adds `image_hash` column to `receipts` table
  - Creates indexes for fast duplicate lookups
  - Adds PayPal email + paid_at index for rate limiting

### Code Changes
- ✅ **[lib/supabase-helpers.ts](lib/supabase-helpers.ts:128-210)**
  - Receipt image hashing with ENV toggle
  - Duplicate receipt detection
  - Saves `image_hash` to database

- ✅ **[app/api/paypal-payout/route.ts](app/api/paypal-payout/route.ts:48-83)**
  - PayPal email rate limiting with ENV toggle
  - Configurable rate limit period
  - Clear error messages with days remaining

- ✅ **[lib/supabase.ts](lib/supabase.ts:37-50)**
  - Updated Receipt interface with `image_hash`
  - Updated field names: `paypal_email`, `paypal_payout_id`

### Configuration
- ✅ **[.env.example](.env.example:21-35)**
  - Added fraud prevention section
  - 3 new environment variables with documentation

### Documentation
- ✅ **[docs/FRAUD_PREVENTION.md](docs/FRAUD_PREVENTION.md)** - NEW
  - Complete fraud prevention guide
  - Configuration examples
  - Test plans
  - Production recommendations
  - FAQ

---

## 🚀 How to Use

### For Production (Default - Recommended)
```bash
# All fraud prevention enabled
NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=true
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=true
PAYPAL_EMAIL_RATE_LIMIT_DAYS=30
```

**Result:**
- ✅ Same receipt photo cannot be reused
- ✅ Same PayPal email can only receive 1 payout per 30 days
- ✅ All submissions require manual admin approval

---

### For Testing (Disable Fraud Prevention)
```bash
# Disable receipt hash checking
NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=false

# Disable PayPal email rate limiting
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=false
```

**Result:**
- ❌ Same receipt photo CAN be reused (for testing)
- ❌ Same PayPal email CAN receive multiple payouts (for testing)
- ✅ Admin approval still required

---

## 📊 Complete Fraud Prevention Stack

### Layer 1: Bottle Image Hashing ✅ (Always Enabled)
- Prevents same bottle photo from being scanned twice
- **File:** [lib/supabase-helpers.ts:14-29](lib/supabase-helpers.ts)

### Layer 2: IP Rate Limiting ✅ (Always Enabled)
- 3 bottle scans per IP per 24 hours
- **File:** [lib/supabase-helpers.ts:216-255](lib/supabase-helpers.ts)

### Layer 3: Session Validation ✅ (Always Enabled)
- 1 receipt per session
- Sessions expire after 24 hours
- **File:** [lib/supabase-helpers.ts:260-312](lib/supabase-helpers.ts)

### Layer 4: Receipt Image Hashing ✅ NEW (Configurable)
- Prevents same receipt photo from being submitted multiple times
- **File:** [lib/supabase-helpers.ts:128-148](lib/supabase-helpers.ts)
- **Toggle:** `NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK`

### Layer 5: PayPal Email Rate Limiting ✅ NEW (Configurable)
- 1 payout per email per 30 days (default)
- **File:** [app/api/paypal-payout/route.ts:48-83](app/api/paypal-payout/route.ts)
- **Toggle:** `ENABLE_PAYPAL_EMAIL_RATE_LIMIT`

### Layer 6: Manual Admin Review ✅ (Always Enabled)
- Human verification of all receipts
- Side-by-side bottle + receipt view
- **File:** [app/admin/page.tsx](app/admin/page.tsx)

---

## 🧪 Testing Checklist

### Before Running Migration
- [ ] Backup database (optional - migration is additive only)
- [ ] Review migration SQL: [003_receipt_fraud_prevention.sql](supabase/migrations/003_receipt_fraud_prevention.sql)

### After Running Migration
- [ ] Verify `image_hash` column exists in `receipts` table
- [ ] Verify indexes created: `idx_receipts_image_hash`, `idx_receipts_paypal_email_paid`

### Testing Fraud Prevention
- [ ] Test duplicate receipt upload (with ENV=false, then ENV=true)
- [ ] Test PayPal email rate limiting (with ENV=false, then ENV=true)
- [ ] Test session validation (1 receipt per session)
- [ ] Test IP rate limiting (3 scans per 24 hours)
- [ ] Test bottle duplicate detection (same photo twice)

### Production Deployment
- [ ] Set ENV variables in Vercel/production environment
- [ ] Run migration 003 in production Supabase
- [ ] Test end-to-end flow in production (use $1 test payout)
- [ ] Monitor first 10-20 submissions for issues

---

## 🎯 Next Steps

### Immediate (Before Launch)
1. **Run Database Migration:**
   ```sql
   -- In Supabase SQL Editor, run:
   -- supabase/migrations/003_receipt_fraud_prevention.sql
   ```

2. **Update Environment Variables:**
   ```bash
   # Add to .env.local (development)
   NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=true
   ENABLE_PAYPAL_EMAIL_RATE_LIMIT=true
   PAYPAL_EMAIL_RATE_LIMIT_DAYS=30
   ```

3. **Test Fraud Prevention:**
   - Try uploading same receipt twice (should fail)
   - Try multiple payouts to same email (should fail after 1)

### Production (Launch Day)
1. **Deploy to Vercel** with fraud prevention ENV vars
2. **Run migration** in production Supabase
3. **Monitor admin dashboard** for first submissions
4. **Adjust rate limits** if needed based on real usage

### Post-Launch (Week 1)
1. **Track fraud rate:** `(rejected / total) × 100` - target <5%
2. **Review patterns:** Look for sophisticated fraud attempts
3. **Optimize limits:** Adjust `PAYPAL_EMAIL_RATE_LIMIT_DAYS` if needed

---

## 📞 Questions?

**See Full Documentation:** [docs/FRAUD_PREVENTION.md](docs/FRAUD_PREVENTION.md)

**Common Issues:**
- Receipt hash not saving? → Check migration 003 ran successfully
- Rate limit not working? → Verify ENV variables set correctly
- TypeScript errors? → Updated Receipt interface in [lib/supabase.ts](lib/supabase.ts)

---

**Implementation Date:** 2025-10-16
**Status:** ✅ Complete - Ready for Testing
