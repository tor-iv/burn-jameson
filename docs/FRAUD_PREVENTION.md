# Fraud Prevention Guide

**Last Updated:** 2025-10-16

This document details all fraud prevention measures implemented in the Burn That Ad campaign.

---

## 🛡️ Overview

The app implements **3 layers of fraud prevention** to prevent abuse while maintaining a smooth user experience:

1. **Receipt Image Hashing** - Prevents same receipt photo reuse
2. **PayPal Email Rate Limiting** - Limits payouts per email address
3. **Manual Admin Review** - Human verification of all submissions

All fraud prevention features are **configurable via environment variables** for testing flexibility.

---

## Layer 1: Receipt Image Duplicate Detection

### What It Does
- Generates SHA-256 hash of every receipt photo
- Checks database for duplicate hashes before accepting upload
- Prevents users from submitting the same receipt photo multiple times

### Implementation
**File:** [lib/supabase-helpers.ts](../lib/supabase-helpers.ts:128-148)

```typescript
// Generate image hash
const receiptHash = await hashImage(receiptImage);

// Check for duplicate receipt (configurable via ENV)
const enableHashCheck = process.env.NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK !== 'false';

if (enableHashCheck) {
  const { data: duplicateReceipts } = await supabase
    .from('receipts')
    .select('id')
    .eq('image_hash', receiptHash)
    .limit(1);

  if (duplicateReceipts && duplicateReceipts.length > 0) {
    return {
      success: false,
      error: 'This receipt has already been submitted. Each receipt can only be used once.'
    };
  }
}
```

### Database Schema
**Table:** `receipts`
**Field:** `image_hash` (TEXT)
**Index:** `idx_receipts_image_hash`

See: [supabase/migrations/003_receipt_fraud_prevention.sql](../supabase/migrations/003_receipt_fraud_prevention.sql)

### Configuration

**Environment Variable:** `NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK`

```bash
# Enable receipt hash checking (default - recommended for production)
NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=true

# Disable for testing (allows same receipt to be uploaded multiple times)
NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=false
```

**When to Disable:**
- Local development testing
- QA/staging environments
- Demo environments

**When to Enable:**
- Production (always)
- Soft launch testing

### User Experience
**If duplicate detected:**
- Error message: "This receipt has already been submitted. Each receipt can only be used once."
- User must take a new photo of a different receipt
- Clear, non-technical error message

---

## Layer 2: PayPal Email Rate Limiting

### What It Does
- Limits number of payouts to the same PayPal email address
- Default: 1 payout per email per 30 days
- Prevents users from creating multiple submissions with the same payout account

### Implementation
**File:** [app/api/paypal-payout/route.ts](../app/api/paypal-payout/route.ts:48-83)

```typescript
// Check PayPal email rate limiting (configurable via ENV)
const enableRateLimit = process.env.ENABLE_PAYPAL_EMAIL_RATE_LIMIT !== 'false';
const rateLimitDays = parseInt(process.env.PAYPAL_EMAIL_RATE_LIMIT_DAYS || '30', 10);

if (enableRateLimit) {
  const rateLimitDate = new Date();
  rateLimitDate.setDate(rateLimitDate.getDate() - rateLimitDays);

  const { data: recentPayouts } = await supabase
    .from('receipts')
    .select('id, paid_at')
    .eq('paypal_email', paypalEmail)
    .eq('status', 'paid')
    .gte('paid_at', rateLimitDate.toISOString())
    .limit(1);

  if (recentPayouts && recentPayouts.length > 0) {
    return NextResponse.json(
      {
        error: `This PayPal email has already received a payout in the last ${rateLimitDays} days`,
        details: `Please wait ${daysRemaining} more day(s) before submitting another receipt.`,
      },
      { status: 429 } // Too Many Requests
    );
  }
}
```

### Database Schema
**Table:** `receipts`
**Fields Used:** `paypal_email`, `status`, `paid_at`
**Index:** `idx_receipts_paypal_email_paid`

### Configuration

**Environment Variables:**

```bash
# Enable PayPal email rate limiting (default - recommended)
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=true

# Disable for testing (allows unlimited payouts to same email)
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=false

# Rate limit period in days (default: 30)
PAYPAL_EMAIL_RATE_LIMIT_DAYS=30
```

**Configuration Examples:**

```bash
# Production: 1 payout per email per 30 days (recommended)
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=true
PAYPAL_EMAIL_RATE_LIMIT_DAYS=30

# More restrictive: 1 payout per email per campaign (90 days)
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=true
PAYPAL_EMAIL_RATE_LIMIT_DAYS=90

# Less restrictive: Weekly limit (for high-volume campaigns)
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=true
PAYPAL_EMAIL_RATE_LIMIT_DAYS=7

# Testing: Disabled
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=false
```

### User Experience
**If rate limit exceeded:**
- HTTP Status: 429 (Too Many Requests)
- Error message: "This PayPal email has already received a payout in the last 30 days"
- Details: "Please wait X more day(s) before submitting another receipt with this email."
- Admin sees the error when attempting to approve payout

---

## Layer 3: Manual Admin Review

### What It Does
- Every receipt requires manual admin approval before payout
- Admin can view bottle scan + receipt side-by-side
- Admin can approve, reject, or add notes
- Keyboard shortcuts for efficiency (A=approve, R=reject)

### Implementation
**File:** [app/admin/page.tsx](../app/admin/page.tsx)

**Admin Dashboard Features:**
- Side-by-side view of bottle scan + receipt
- Session details (PayPal email, timestamp, confidence)
- Approve/reject workflow
- One-click payout processing
- Notes field for tracking issues

### When to Reject
- Receipt doesn't show "Keeper's Heart" purchase
- Receipt is blurry/unreadable
- Receipt appears fake or photoshopped
- Receipt date doesn't match campaign dates
- Same receipt appears in multiple submissions (visual recognition)
- Suspicious patterns (e.g., all from same location)

---

## Additional Fraud Prevention Layers (Already Implemented)

### 4. Bottle Image Duplicate Detection
**File:** [lib/supabase-helpers.ts](../lib/supabase-helpers.ts:14-29)

- SHA-256 hash of every bottle photo
- Prevents same bottle photo from being scanned twice
- Always enabled (no ENV toggle needed)

**Error:** "This bottle has already been scanned"

### 5. IP-Based Rate Limiting
**File:** [lib/supabase-helpers.ts](../lib/supabase-helpers.ts:216-255)

- 3 bottle scans per IP address per 24 hours
- Prevents spam scanning from single device/location
- Always enabled

**Error:** "Rate limit exceeded. Try again in X hours."

### 6. Session-Based Linking
**File:** [lib/session-manager.ts](../lib/session-manager.ts)

- Each bottle scan creates unique session ID
- Only 1 receipt allowed per session
- Session expires after 24 hours
- Prevents multiple receipts for single bottle scan

**Error:** "Receipt already submitted for this session"

### 7. Image Validation
**File:** [app/api/validate-image/route.ts](../app/api/validate-image/route.ts)

- Format validation (JPG, PNG, WebP only)
- Size validation (100KB - 10MB)
- Quality checks (prevents blank/corrupted files)

**Errors:**
- "Invalid image format. Please upload JPG, PNG, or WebP."
- "Image too large. Maximum size is 10MB."
- "Image too small. Please take a clear photo."

---

## Testing Fraud Prevention

### Test Plan

#### Test 1: Duplicate Receipt Photo
**Setup:** Disable receipt hash check
```bash
NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=false
```

**Steps:**
1. Scan bottle #1
2. Upload receipt photo A
3. Scan bottle #2
4. Try to upload same receipt photo A again

**Expected with ENV=false:** Upload succeeds
**Expected with ENV=true:** Error - "This receipt has already been submitted"

---

#### Test 2: Same PayPal Email Multiple Times
**Setup:** Disable email rate limit
```bash
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=false
```

**Steps:**
1. Scan bottle #1, upload receipt #1, approve & pay to email@example.com
2. Scan bottle #2, upload receipt #2, approve & pay to same email@example.com

**Expected with ENV=false:** Both payouts succeed
**Expected with ENV=true:** Second payout fails - "PayPal email already received payout in last 30 days"

---

#### Test 3: IP Rate Limiting
**Steps:**
1. Scan bottle #1 (success)
2. Scan bottle #2 (success)
3. Scan bottle #3 (success)
4. Scan bottle #4 (should fail)

**Expected:** 4th scan fails with "Rate limit exceeded"

---

#### Test 4: Session Validation
**Steps:**
1. Scan bottle #1 → session ID created
2. Upload receipt #1 for session ID
3. Try to upload receipt #2 for same session ID

**Expected:** Second upload fails - "Receipt already submitted for this session"

---

## Production Recommendations

### Environment Configuration

```bash
# Production settings (.env.local or Vercel environment variables)

# Fraud Prevention - ALWAYS ENABLED
NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=true
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=true
PAYPAL_EMAIL_RATE_LIMIT_DAYS=30
```

### Monitoring

**Daily Admin Tasks:**
1. Review all pending receipts
2. Look for suspicious patterns:
   - Multiple submissions from same IP
   - Similar receipt photos (visual inspection)
   - Receipts from unusual locations
   - Receipts with timestamps outside campaign dates
3. Check PayPal dashboard for failed payouts
4. Reconcile database payouts with PayPal transactions

**Weekly Tasks:**
1. Review rejected submissions for patterns
2. Adjust rate limits if needed
3. Update admin notes with fraud trends

**Monthly Tasks:**
1. Analyze total fraud rate: `(rejected receipts / total receipts) × 100`
2. Target fraud rate: <5%
3. If fraud rate >10%, consider additional measures

### Advanced Fraud Detection (Future)

**Potential Enhancements:**
1. **OCR Validation:** Extract "Keeper's Heart" text from receipts automatically
2. **Purchase Date Validation:** Verify receipt date is within campaign dates
3. **Geofencing:** Limit campaign to specific states/regions
4. **Device Fingerprinting:** Track device IDs in addition to IP
5. **ML Pattern Detection:** Flag suspicious submission patterns automatically
6. **Receipt Date Matching:** Require bottle scan and receipt upload same day
7. **Payment Thresholds:** Flag high-value submissions for extra review

---

## FAQ

### Q: What happens if a legitimate user's first submission fails and they retry?
**A:** Session-based validation allows retries. If their first receipt upload fails (bad photo, technical error), they can upload a different receipt with the same session ID. The PayPal email rate limit only applies to **paid** receipts, so rejected submissions don't count against the limit.

### Q: Can a user scan multiple bottles and get multiple payouts?
**A:** Yes, within rate limits:
- 3 bottle scans per IP per 24 hours
- Each scan requires a unique bottle photo
- Each scan requires a unique receipt photo
- Same PayPal email limited to 1 payout per 30 days

So a user can scan 3 bottles in one day, but only receive 1 payout (assuming they use the same PayPal email).

### Q: Why not enforce stricter limits (e.g., 1 submission per person ever)?
**A:** Balance between fraud prevention and user experience:
- Legitimate users may visit multiple bars/stores over time
- Campaign may run for months
- Too restrictive = lost conversions
- Current limits (30 days) balance fraud prevention with repeat purchases

### Q: What if someone uses multiple PayPal accounts?
**A:** This is harder to prevent without additional verification (phone, ID). Current measures:
- IP rate limiting (3 per day)
- Manual admin review (can spot patterns)
- Future enhancement: Device fingerprinting

### Q: Should I disable fraud prevention for testing?
**A:** Yes, for local development and staging:
```bash
# Development/Staging
NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=false
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=false
```

**Never disable in production.**

---

## Support

**Issues with fraud prevention?**
- Check environment variables are set correctly
- Review Vercel logs for error details
- Test with ENV variables disabled first
- Check database indexes are created (run migration 003)

**Suspected fraud?**
- Document pattern in admin notes
- Reject submission
- Consider adjusting rate limits
- Report sophisticated fraud attempts for investigation

---

**Last Updated:** 2025-10-16
**Migration:** 003_receipt_fraud_prevention.sql
**Related Files:**
- [lib/supabase-helpers.ts](../lib/supabase-helpers.ts)
- [app/api/paypal-payout/route.ts](../app/api/paypal-payout/route.ts)
- [.env.example](../.env.example)
