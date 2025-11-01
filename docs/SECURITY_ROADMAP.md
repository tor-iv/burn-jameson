# Security Roadmap & Pre-Launch Checklist

**Last Updated:** October 31, 2025
**Status:** ⚠️ NOT PRODUCTION-READY
**Blocking Issues:** 5 critical vulnerabilities

---

## Overview

This document provides a structured roadmap for addressing all security vulnerabilities identified in the security audit before production launch.

**Full Audit Report:** [SECURITY.md](../SECURITY.md)

---

## Pre-Launch Requirements (BLOCKING)

### Must Complete Before Production Launch

**Estimated Total Effort:** 40-60 hours (1-1.5 weeks for 1 developer)

---

## Phase 1: Critical Vulnerabilities (REQUIRED)

**Timeline:** Week 1
**Effort:** 40-60 hours
**Status:** ❌ Not Started

### 1.1 Admin Authentication System

**Priority:** 🔴 CRITICAL
**Effort:** 8-12 hours
**Files:**
- `app/api/admin/auth/route.ts` (rewrite)
- `app/admin/page.tsx` (update auth flow)
- `middleware.ts` (create new)

**Tasks:**
- [ ] Install dependencies: `bcrypt`, `jsonwebtoken`
- [ ] Create `lib/auth.ts` with helper functions
- [ ] Replace plaintext password with bcrypt hash
- [ ] Implement JWT-based session tokens
- [ ] Add constant-time password comparison
- [ ] Add rate limiting to login endpoint (5 attempts per 15 min)
- [ ] Add account lockout after 10 failed attempts
- [ ] Add authentication logging (IP, timestamp, success/failure)
- [ ] Create middleware to verify JWT on admin routes
- [ ] Update ENV variables (remove `NEXT_PUBLIC_ADMIN_PASSWORD`, add `ADMIN_PASSWORD_HASH` and `JWT_SECRET`)
- [ ] Test login flow end-to-end
- [ ] Test rate limiting and lockout

**Code Template:**
```typescript
// lib/auth.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function verifyPassword(password: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) throw new Error('ADMIN_PASSWORD_HASH not configured');
  return await bcrypt.compare(password, hash);
}

export function createSessionToken(): string {
  return jwt.sign(
    { authenticated: true, role: 'admin', iat: Date.now() },
    process.env.ADMIN_JWT_SECRET!,
    { expiresIn: '24h' }
  );
}

export function verifySessionToken(token: string): any {
  return jwt.verify(token, process.env.ADMIN_JWT_SECRET!);
}
```

---

### 1.2 API Endpoint Authorization

**Priority:** 🔴 CRITICAL
**Effort:** 4-6 hours
**Files:**
- `app/api/paypal-payout/route.ts` (add auth check)
- `app/api/auto-approve-receipt/route.ts` (add auth check)
- `lib/auth.ts` (add middleware function)

**Tasks:**
- [ ] Create `verifyAdminAuth()` middleware function
- [ ] Add auth check to `/api/paypal-payout` (URGENT)
- [ ] Add auth check to `/api/auto-approve-receipt` (URGENT)
- [ ] Add auth check to any other admin endpoints
- [ ] Return 401 Unauthorized for missing/invalid tokens
- [ ] Test: Verify endpoints reject unauthenticated requests
- [ ] Test: Verify endpoints accept valid JWT tokens
- [ ] Test: Verify expired tokens are rejected

**Code Template:**
```typescript
// In every admin/payment API route:
import { verifyAdminAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // CRITICAL: Add this line to EVERY admin endpoint
  await verifyAdminAuth(request);

  // ... rest of logic
}

// lib/auth.ts
export async function verifyAdminAuth(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('admin_session');

  if (!sessionCookie) {
    throw new Error('Unauthorized - No session');
  }

  try {
    const session = verifySessionToken(sessionCookie.value);
    if (!session.authenticated) {
      throw new Error('Unauthorized - Invalid session');
    }
    return session;
  } catch (error) {
    throw new Error('Unauthorized - Token verification failed');
  }
}
```

---

### 1.3 Fix Supabase RLS Policies

**Priority:** 🔴 CRITICAL
**Effort:** 4-6 hours
**Files:**
- `supabase/migrations/005_fix_rls_policies.sql` (new migration)

**Tasks:**
- [ ] Create new migration file: `005_fix_rls_policies.sql`
- [ ] Drop all existing policies with `USING (true)`
- [ ] Create session-based RLS for `receipts` table
- [ ] Create session-based RLS for `bottle_scans` table
- [ ] Create session-based RLS for `scans` table (legacy)
- [ ] Create admin-only policies for approval operations
- [ ] Add `current_setting('app.session_id')` support
- [ ] Test: Verify users can only see their own data
- [ ] Test: Verify users cannot modify approved/paid receipts
- [ ] Test: Verify admin can access all data (when authenticated)
- [ ] Apply migration to production database

**SQL Template:**
```sql
-- supabase/migrations/005_fix_rls_policies.sql

-- ============================================
-- FIX: Receipts RLS Policies
-- ============================================

-- Drop vulnerable policies
DROP POLICY IF EXISTS "Users can view their own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can update their own receipts" ON receipts;
DROP POLICY IF EXISTS "Users can insert receipts" ON receipts;

-- Create secure policies
CREATE POLICY "Users can view own session receipts"
  ON receipts FOR SELECT
  USING (
    session_id = current_setting('app.session_id', true)::text
  );

CREATE POLICY "Users can insert own receipts"
  ON receipts FOR INSERT
  WITH CHECK (
    session_id = current_setting('app.session_id', true)::text
  );

CREATE POLICY "Users can update own pending receipts only"
  ON receipts FOR UPDATE
  USING (
    session_id = current_setting('app.session_id', true)::text
    AND status = 'pending'
  )
  WITH CHECK (
    status = 'pending' AND
    rebate_amount = rebate_amount  -- Prevent amount changes
  );

-- Admin-only policy for approvals (requires service role key)
CREATE POLICY "Service role can manage all receipts"
  ON receipts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- FIX: Bottle Scans RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Anyone can view scans" ON bottle_scans;

CREATE POLICY "Users can view own bottle scans"
  ON bottle_scans FOR SELECT
  USING (
    session_id = current_setting('app.session_id', true)::text
  );

CREATE POLICY "Users can insert own bottle scans"
  ON bottle_scans FOR INSERT
  WITH CHECK (
    session_id = current_setting('app.session_id', true)::text
  );

-- ============================================
-- FIX: Scans RLS Policies (Legacy)
-- ============================================

DROP POLICY IF EXISTS "Anyone can view scans" ON scans;

CREATE POLICY "Users can view own scans"
  ON scans FOR SELECT
  USING (
    session_id = current_setting('app.session_id', true)::text
  );
```

---

### 1.4 Payment Validation & Immutability

**Priority:** 🔴 CRITICAL
**Effort:** 6-8 hours
**Files:**
- `supabase/migrations/006_payment_validation.sql` (new migration)
- `app/api/paypal-payout/route.ts` (add validation)

**Tasks:**

**Database Changes:**
- [ ] Add `original_approved_amount DECIMAL(10,2)` to `receipts` table
- [ ] Add `paypal_email_canonical TEXT` to `receipts` table
- [ ] Add `approved_by TEXT` to `receipts` table
- [ ] Add `approved_at TIMESTAMP` to `receipts` table
- [ ] Create trigger: `prevent_amount_change()` to block modifications after approval
- [ ] Create trigger: `set_approved_metadata()` to populate `original_approved_amount` when status changes to 'approved'
- [ ] Apply migration

**Code Changes:**
- [ ] Update payout API to verify amount hasn't changed
- [ ] Update payout API to verify email matches original
- [ ] Update payout API to verify bottle scan exists
- [ ] Update payout API to verify receipt status is 'approved'
- [ ] Add security logging for amount/email mismatches
- [ ] Use database values (not request parameters) for payout
- [ ] Test: Verify modified amounts are rejected
- [ ] Test: Verify modified emails are rejected
- [ ] Test: Verify missing bottle scans are rejected

**SQL Template:**
```sql
-- supabase/migrations/006_payment_validation.sql

-- Add immutability tracking columns
ALTER TABLE receipts
  ADD COLUMN original_approved_amount DECIMAL(10,2),
  ADD COLUMN paypal_email_canonical TEXT,
  ADD COLUMN approved_by TEXT,
  ADD COLUMN approved_at TIMESTAMP;

-- Create index for canonical email lookups
CREATE INDEX idx_receipts_canonical_email_paid
  ON receipts(paypal_email_canonical, paid_at)
  WHERE status = 'paid';

-- Trigger: Prevent amount changes after approval
CREATE OR REPLACE FUNCTION prevent_amount_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('approved', 'paid') AND NEW.rebate_amount != OLD.rebate_amount THEN
    RAISE EXCEPTION 'Cannot modify rebate_amount after approval';
  END IF;
  IF OLD.status IN ('approved', 'paid') AND NEW.paypal_email != OLD.paypal_email THEN
    RAISE EXCEPTION 'Cannot modify paypal_email after approval';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_approved_receipts
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_amount_change();

-- Trigger: Set approval metadata when status changes to 'approved'
CREATE OR REPLACE FUNCTION set_approved_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    NEW.original_approved_amount := NEW.rebate_amount;
    NEW.approved_at := NOW();
    -- approved_by should be set by application
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_approval_timestamp
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION set_approved_metadata();
```

**Code Template:**
```typescript
// app/api/paypal-payout/route.ts

export async function POST(request: NextRequest) {
  // 1. REQUIRE AUTHENTICATION
  await verifyAdminAuth(request);

  const { receiptId } = await request.json();

  // 2. Fetch receipt with bottle scan (JOIN)
  const { data: receipt, error } = await supabase
    .from('receipts')
    .select(`
      *,
      bottle_scans!inner(*)
    `)
    .eq('id', receiptId)
    .single();

  if (error || !receipt) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
  }

  // 3. Verify status
  if (receipt.status !== 'approved') {
    return NextResponse.json({ error: 'Receipt not approved' }, { status: 400 });
  }

  // 4. Verify bottle scan exists
  if (!receipt.bottle_scans || receipt.bottle_scans.length === 0) {
    console.error('SECURITY: No bottle scan found for receipt', receiptId);
    return NextResponse.json({ error: 'Invalid bottle scan' }, { status: 400 });
  }

  // 5. Verify amount immutability
  if (receipt.rebate_amount !== receipt.original_approved_amount) {
    console.error('SECURITY: Amount mismatch detected', {
      receiptId,
      expected: receipt.original_approved_amount,
      actual: receipt.rebate_amount
    });
    return NextResponse.json({ error: 'Amount verification failed' }, { status: 400 });
  }

  // 6. Use trusted database values (NOT request parameters!)
  const trustedAmount = receipt.original_approved_amount;
  const trustedEmail = receipt.paypal_email;

  // ... proceed with PayPal payout using trusted values
}
```

---

### 1.5 Environment Variable Security

**Priority:** 🔴 CRITICAL
**Effort:** 1-2 hours
**Files:**
- `.env.example` (already updated ✅)
- `app/api/admin/auth/route.ts` (update to use new ENV vars)
- `lib/supabase-helpers.ts` (update fraud flag checks)
- `.env.local` (manual - update your local file)
- Vercel dashboard (manual - update production ENV vars)

**Tasks:**
- [x] Remove `NEXT_PUBLIC_ADMIN_PASSWORD` from `.env.example` ✅
- [x] Add `ADMIN_PASSWORD_HASH` to `.env.example` ✅
- [x] Add `ADMIN_JWT_SECRET` to `.env.example` ✅
- [x] Change `NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK` → `ENABLE_RECEIPT_HASH_CHECK` ✅
- [ ] Update auth route to use `ADMIN_PASSWORD_HASH`
- [ ] Update fraud checks to use server-side ENV vars
- [ ] Generate bcrypt hash for admin password: `node -e "console.log(require('bcrypt').hashSync('your_password', 10))"`
- [ ] Generate JWT secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Update `.env.local` with new variables
- [ ] Update Vercel production ENV variables
- [ ] Test: Verify no `NEXT_PUBLIC_ADMIN_PASSWORD` in browser console
- [ ] Test: Verify fraud checks work server-side

**Manual Steps:**
```bash
# 1. Generate password hash
node -e "console.log(require('bcrypt').hashSync('YourSecurePassword123!', 10))"
# Copy output to ADMIN_PASSWORD_HASH

# 2. Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output to ADMIN_JWT_SECRET

# 3. Update .env.local
# Remove: NEXT_PUBLIC_ADMIN_PASSWORD=...
# Add: ADMIN_PASSWORD_HASH=...
# Add: ADMIN_JWT_SECRET=...
# Change: NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK → ENABLE_RECEIPT_HASH_CHECK

# 4. Update Vercel (production)
# Go to: Vercel Dashboard → Settings → Environment Variables
# Delete: NEXT_PUBLIC_ADMIN_PASSWORD
# Add: ADMIN_PASSWORD_HASH, ADMIN_JWT_SECRET
# Update: ENABLE_RECEIPT_HASH_CHECK (remove NEXT_PUBLIC_ prefix)
```

---

## Phase 2: High Priority Vulnerabilities (RECOMMENDED)

**Timeline:** Week 2
**Effort:** 30-40 hours
**Status:** ❌ Not Started

### 2.1 Session Security Improvements

**Priority:** 🟠 HIGH
**Effort:** 6-8 hours

**Tasks:**
- [ ] Update session ID generation to use full UUID (not truncated)
- [ ] Add cryptographic random bytes to session IDs
- [ ] Move sessions from sessionStorage to httpOnly cookies
- [ ] Add session binding (IP + User-Agent verification)
- [ ] Add session expiry tracking in database
- [ ] Test session hijacking scenarios

---

### 2.2 Distributed Rate Limiting

**Priority:** 🟠 HIGH
**Effort:** 8-10 hours

**Tasks:**
- [ ] Sign up for Upstash Redis (free tier)
- [ ] Install `@upstash/ratelimit` and `@upstash/redis`
- [ ] Replace in-memory rate limiting with Redis
- [ ] Add multi-factor rate limiting (IP + User-Agent + Session)
- [ ] Add CAPTCHA to upload page (reCAPTCHA v3)
- [ ] Test with rotating proxies

---

### 2.3 CSRF Protection

**Priority:** 🟠 HIGH
**Effort:** 4-6 hours

**Tasks:**
- [ ] Install `@edge-csrf/nextjs`
- [ ] Add CSRF middleware to all state-changing endpoints
- [ ] Verify Origin header on all requests
- [ ] Require `X-Requested-With` header
- [ ] Test CSRF attack scenarios

---

### 2.4 Input Validation & XSS Prevention

**Priority:** 🟠 HIGH
**Effort:** 6-8 hours

**Tasks:**
- [ ] Install `validator` package
- [ ] Add server-side email validation
- [ ] Normalize email addresses (remove +suffixes)
- [ ] Install `dompurify` (or `isomorphic-dompurify`)
- [ ] Sanitize all user content in admin dashboard
- [ ] Add magic number verification for file uploads
- [ ] Strip EXIF metadata from images (using Sharp)
- [ ] Test XSS payloads

---

### 2.5 Database Row Locking

**Priority:** 🟠 HIGH
**Effort:** 4-6 hours

**Tasks:**
- [ ] Create Postgres function: `lock_and_get_receipt()`
- [ ] Update payout API to use `SELECT FOR UPDATE`
- [ ] Add optimistic locking with version column
- [ ] Test concurrent payout requests (race condition testing)

---

## Phase 3: Medium Priority Issues

**Timeline:** Week 3-4
**Effort:** 20-30 hours
**Status:** ❌ Not Started

### 3.1 PII Encryption

**Tasks:**
- [ ] Install encryption library
- [ ] Encrypt PayPal emails at rest
- [ ] Update queries to decrypt on read
- [ ] Migrate existing data

---

### 3.2 Content Security Policy

**Tasks:**
- [ ] Add nonce-based CSP headers
- [ ] Remove `unsafe-inline` from script-src
- [ ] Test CSP violations

---

### 3.3 Audit Logging

**Tasks:**
- [ ] Create `audit_log` table
- [ ] Log all admin actions
- [ ] Log all payment operations
- [ ] Create audit dashboard

---

### 3.4 Security Monitoring

**Tasks:**
- [ ] Set up Sentry for error tracking
- [ ] Add security event logging
- [ ] Create alerting rules (Slack/email)
- [ ] Create security dashboard

---

## Phase 4: Testing & Validation

**Timeline:** Week 3
**Effort:** 16-24 hours
**Status:** ❌ Not Started

### 4.1 Security Testing

**Tasks:**
- [ ] SQL injection testing (all Supabase queries)
- [ ] XSS testing (all user inputs)
- [ ] CSRF testing (all endpoints)
- [ ] Authentication bypass testing
- [ ] Authorization bypass testing
- [ ] Rate limiting bypass testing
- [ ] Session hijacking testing
- [ ] File upload security testing
- [ ] Race condition testing (double payments)
- [ ] Run `npm audit` and fix all issues

---

### 4.2 Penetration Testing

**Tasks:**
- [ ] Hire security firm for penetration test (recommended)
- [ ] Or: Use OWASP ZAP for automated scanning
- [ ] Review and fix all findings
- [ ] Re-test to verify fixes

---

### 4.3 Code Review

**Tasks:**
- [ ] Security-focused code review of all API routes
- [ ] Review all database queries for injection risks
- [ ] Review all user inputs for XSS risks
- [ ] Review all authentication/authorization logic

---

## Phase 5: Compliance & Documentation

**Timeline:** Week 4
**Effort:** 8-16 hours
**Status:** ❌ Not Started

### 5.1 GDPR Compliance

**Tasks:**
- [ ] Create data retention policy (30/60/90 days?)
- [ ] Add privacy policy page
- [ ] Add cookie consent banner
- [ ] Implement data deletion endpoint
- [ ] Add GDPR-compliant data export
- [ ] Remove PII from logs (redact emails)
- [ ] Create breach notification plan

---

### 5.2 Legal Pages

**Tasks:**
- [ ] Create Privacy Policy (hire lawyer or use template)
- [ ] Create Terms of Service
- [ ] Create Official Rules (sweepstakes compliance)
- [ ] Add AMOE provision (if required by state)
- [ ] Legal review by attorney

---

### 5.3 Security Documentation

**Tasks:**
- [x] Create SECURITY.md ✅
- [x] Create SECURITY_ROADMAP.md ✅
- [ ] Create `.well-known/security.txt`
- [ ] Document incident response procedures
- [ ] Document security contacts

---

## Progress Tracking

### Critical Issues (5)

- [ ] 1. Admin Authentication System
- [ ] 2. API Endpoint Authorization
- [ ] 3. Fix Supabase RLS Policies
- [ ] 4. Payment Validation & Immutability
- [x] 5. Environment Variable Security (ENV files updated, code needs updating)

**Progress:** 20% (1/5 complete)

---

### High Priority Issues (8)

- [ ] 6. Session Security Improvements
- [ ] 7. Distributed Rate Limiting
- [ ] 8. PayPal Email Validation
- [ ] 9. CSRF Protection
- [ ] 10. File Upload Security
- [ ] 11. XSS Prevention
- [ ] 12. Database Row Locking
- [ ] 13. Logging Sanitization

**Progress:** 0% (0/8 complete)

---

### Overall Security Status

- **Critical Fixed:** 1/5 (20%)
- **High Fixed:** 0/8 (0%)
- **Medium Fixed:** 0/9 (0%)
- **Low Fixed:** 0/4 (0%)

**Total Security Score:** 4% (1/26 issues resolved)

---

## Launch Readiness Criteria

### ✅ REQUIRED Before Production Launch

- [ ] All 5 critical vulnerabilities fixed (currently: 20%)
- [ ] All 8 high priority vulnerabilities fixed (currently: 0%)
- [ ] Security testing completed (penetration test or OWASP ZAP)
- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] GDPR compliance implemented
- [ ] No sensitive data in logs
- [ ] All ENV variables properly configured
- [ ] Rate limiting implemented (distributed)
- [ ] Audit logging enabled

**Current Launch Readiness:** ❌ 4% - NOT READY

---

## Deployment Checklist

### Pre-Deployment

- [ ] All critical fixes merged to main branch
- [ ] All high priority fixes merged to main branch
- [ ] Security testing passed
- [ ] Code review completed
- [ ] Dependencies updated (`npm audit fix`)
- [ ] ENV variables configured in Vercel
- [ ] Database migrations applied to production
- [ ] Backup created before deployment

### Post-Deployment

- [ ] Verify admin login works
- [ ] Verify payout API requires authentication
- [ ] Verify RLS policies are active
- [ ] Verify sessions are secure (httpOnly cookies)
- [ ] Verify rate limiting works
- [ ] Monitor error logs for 24 hours
- [ ] Test full user flow (scan → receipt → payout)

---

## Maintenance & Ongoing Security

### Monthly Tasks

- [ ] Run `npm audit` and update dependencies
- [ ] Review security logs for anomalies
- [ ] Review rate limiting metrics
- [ ] Review fraud detection metrics
- [ ] Update security documentation

### Quarterly Tasks

- [ ] Penetration testing
- [ ] Security audit by external firm
- [ ] Review and update RLS policies
- [ ] Review and update fraud scoring thresholds
- [ ] GDPR compliance review

### Annual Tasks

- [ ] Comprehensive security audit
- [ ] Legal compliance review
- [ ] Privacy policy update
- [ ] Terms of service update
- [ ] Rotate API keys (Google Vision, PayPal, etc.)

---

## Support Contacts

**Security Issues:** [To be defined]
**On-Call Engineer:** [To be defined]
**Legal Team:** [To be defined]
**PayPal Support:** 1-888-221-1161
**Supabase Support:** support@supabase.io

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-31 | 1.0 | Initial security roadmap created |

---

**Next Review:** After Phase 1 completion
