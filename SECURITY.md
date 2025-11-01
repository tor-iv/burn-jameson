# Security Audit Report

**Application:** Burn That Ad - Keeper's Heart Whiskey Campaign
**Audit Date:** October 31, 2025
**Status:** ⚠️ **NOT PRODUCTION-READY** - Critical vulnerabilities identified
**Overall Risk Level:** 🔴 **HIGH**

---

## Executive Summary

The "Burn That Ad" application has **5 critical security vulnerabilities** that must be addressed before production deployment. While some security measures are implemented (fraud detection, rate limiting, session management), there are significant gaps in authentication, authorization, payment security, and data protection that could lead to **financial loss, data breaches, and fraud**.

**Vulnerabilities Identified:**
- 🔴 **Critical:** 5 issues (MUST fix before launch)
- 🟠 **High:** 8 issues (Fix within first month)
- 🟡 **Medium:** 9 issues (Address in first quarter)
- ⚪ **Low:** 4 issues (Nice to have)

**Estimated Remediation Effort:** 100-145 hours (~3-4 weeks)

---

## 🔴 CRITICAL VULNERABILITIES (Block Production Launch)

### 1. Admin Authentication - Weak Password Storage & Timing Attack

**Severity:** CRITICAL
**File:** `app/api/admin/auth/route.ts`
**CVSS Score:** 9.8/10

**Issue:**
- Admin password stored as plain environment variable with weak default: `process.env.ADMIN_PASSWORD || 'admin123'`
- Password comparison uses non-constant-time string comparison (`password !== ADMIN_PASSWORD`)
- Session token is only base64-encoded (not signed/encrypted)
- No account lockout after failed attempts
- No logging of authentication attempts
- No rate limiting on login endpoint

**Attack Vector:**
```javascript
// Attacker can brute force admin password
for (let password of commonPasswords) {
  await fetch('/api/admin/auth', {
    method: 'POST',
    body: JSON.stringify({ password })
  });
}
// No rate limiting = unlimited attempts
```

**Impact:**
- Complete admin panel compromise
- Unauthorized approval of fraudulent receipts
- Manual triggering of PayPal payouts to attacker's account
- Access to all receipt/user data (PII breach)

**Remediation:**
```javascript
// 1. Use bcrypt for password hashing
import bcrypt from 'bcrypt';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // Store hash in ENV

// 2. Add rate limiting to auth endpoint
import { Ratelimit } from '@upstash/ratelimit';
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '15m'), // 5 attempts per 15 min
});

// 3. Use constant-time comparison
const validPassword = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

// 4. Sign session tokens with HMAC/JWT
import jwt from 'jsonwebtoken';
const sessionToken = jwt.sign(
  { authenticated: true, timestamp: Date.now() },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// 5. Add failed attempt tracking & logging
// 6. Implement account lockout (10 failed attempts = 1 hour lockout)
```

---

### 2. Admin API Endpoints - No Authorization Check

**Severity:** CRITICAL
**Files:** `app/api/paypal-payout/route.ts`, `app/api/auto-approve-receipt/route.ts`
**CVSS Score:** 10.0/10

**Issue:**
- PayPal payout endpoint has **ZERO authentication checks**
- Auto-approval endpoint has **ZERO authentication checks**
- **Anyone** can call these endpoints directly with any receipt ID

**Attack Vector:**
```bash
# Attacker can trigger unlimited payouts to their own PayPal
curl -X POST https://burnthatad.com/api/paypal-payout \
  -H "Content-Type: application/json" \
  -d '{
    "receiptId": "any-approved-receipt-id",
    "paypalEmail": "attacker@evil.com",
    "amount": 10000
  }'

# Or auto-approve any pending receipt
curl -X POST https://burnthatad.com/api/auto-approve-receipt \
  -H "Content-Type: application/json" \
  -d '{"receiptId": "pending-id", "validationData": {...}}'
```

**Impact:**
- **Unlimited fraudulent payouts** (complete financial loss)
- Complete bypass of manual review process
- Instant approval of fake receipts
- Company bankruptcy risk

**Remediation:**
```javascript
// Add to EVERY admin/payment endpoint:

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

async function verifyAdminAuth(request: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('admin_session');

  if (!sessionCookie) {
    throw new Error('Unauthorized - No session cookie');
  }

  try {
    const session = jwt.verify(sessionCookie.value, process.env.JWT_SECRET);
    if (!session || !session.authenticated) {
      throw new Error('Unauthorized - Invalid session');
    }
    return session;
  } catch (error) {
    throw new Error('Unauthorized - Token verification failed');
  }
}

// In EVERY sensitive route handler:
export async function POST(request: NextRequest) {
  // THIS LINE IS REQUIRED FOR ALL ADMIN/PAYMENT ENDPOINTS
  await verifyAdminAuth(request);

  // ... rest of logic
}
```

**Files Requiring Auth Check:**
- `app/api/paypal-payout/route.ts` - URGENT
- `app/api/auto-approve-receipt/route.ts` - URGENT
- Any future admin endpoints

---

### 3. SQL Injection via Supabase RLS Policies

**Severity:** CRITICAL
**Files:** `supabase/migrations/001_initial_schema.sql`, all Supabase queries
**CVSS Score:** 9.1/10

**Issue:**
- Supabase Row Level Security (RLS) policies are overly permissive
- Multiple tables have `USING (true)` policies (allows ALL access)
- Client-side code uses public anon key with full database access
- No server-side query parameter validation

**Vulnerable RLS Policies:**
```sql
-- From supabase/migrations/001_initial_schema.sql

-- Line 54-56: Anyone can view ALL scans
CREATE POLICY "Anyone can view scans"
  ON scans FOR SELECT
  USING (true);  -- ❌ NO RESTRICTIONS!

-- Line 63-65: Anyone can view ALL receipts
CREATE POLICY "Users can view their own receipts"
  ON receipts FOR SELECT
  USING (true);  -- ❌ CLAIMS "own receipts" BUT ALLOWS ALL!

-- Line 71-73: Anyone can update ANY receipt
CREATE POLICY "Users can update their own receipts"
  ON receipts FOR UPDATE
  USING (true);  -- ❌ ALLOWS MODIFYING ANY RECEIPT!
```

**Attack Vector:**
```javascript
// Attacker can read ALL receipts (including PayPal emails)
const { data } = await supabase
  .from('receipts')
  .select('*')  // Gets EVERY receipt in database

// Attacker can modify ANY receipt (change status, amount, email)
await supabase
  .from('receipts')
  .update({
    status: 'approved',
    rebate_amount: 10000,
    paypal_email: 'attacker@evil.com'
  })
  .eq('id', anyReceiptId);  // Works on ANY receipt!

// Attacker can view all PayPal emails
const { data: emails } = await supabase
  .from('receipts')
  .select('paypal_email, rebate_amount');
// PII BREACH!
```

**Impact:**
- Complete data breach (all receipts, PayPal emails, purchase history)
- Attacker can modify receipt statuses to 'approved' or 'paid'
- Attacker can change payout amounts before processing
- GDPR violation (unauthorized PII access)
- Financial manipulation

**Remediation:**
```sql
-- Fix RLS policies to actually restrict access

-- 1. Receipts: Restrict to session owner only
DROP POLICY "Users can view their own receipts" ON receipts;
DROP POLICY "Users can update their own receipts" ON receipts;

CREATE POLICY "Users can view own session receipts"
  ON receipts FOR SELECT
  USING (
    session_id = current_setting('app.session_id', true)::text
  );

CREATE POLICY "Users can update own pending receipts only"
  ON receipts FOR UPDATE
  USING (
    session_id = current_setting('app.session_id', true)::text
    AND status = 'pending'  -- Can't modify approved/paid receipts
  )
  WITH CHECK (
    -- Prevent changing critical fields
    status = 'pending' AND
    rebate_amount = rebate_amount  -- Can't change amount
  );

-- 2. Admin-only policy for approvals
CREATE POLICY "Only admins can approve receipts"
  ON receipts FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    status IN ('approved', 'rejected', 'paid')
  );

-- 3. Scans: Restrict to session owner
DROP POLICY "Anyone can view scans" ON scans;

CREATE POLICY "Users can view own scans"
  ON scans FOR SELECT
  USING (
    session_id = current_setting('app.session_id', true)::text
  );

-- 4. Bottle scans: Similar restrictions
CREATE POLICY "Users can view own bottle scans"
  ON bottle_scans FOR SELECT
  USING (
    session_id = current_setting('app.session_id', true)::text
  );
```

---

### 4. Payment Manipulation - No Receipt Validation Before Payout

**Severity:** CRITICAL
**File:** `app/api/paypal-payout/route.ts`
**CVSS Score:** 9.8/10

**Issue:**
- Payout endpoint only checks `status = 'approved'`, not WHO approved it
- No verification that receipt has valid associated bottle scan
- Rebate amount can be modified in database before payout (due to weak RLS)
- Email rate limiting can be bypassed by disabling ENV variable
- No immutability checks for critical fields

**Attack Vector:**
```javascript
// Attacker workflow:
// 1. Submit legitimate receipt with $5 amount
// 2. Wait for admin approval (or auto-approve)
// 3. Directly update database (possible due to RLS bug):
await supabase
  .from('receipts')
  .update({
    rebate_amount: 10000,  // Change $5 → $10,000
    paypal_email: 'attacker@evil.com'  // Change email
  })
  .eq('id', receiptId);

// 4. Call payout API (no auth check, so attacker can call directly)
await fetch('/api/paypal-payout', {
  method: 'POST',
  body: JSON.stringify({ receiptId, paypalEmail: 'attacker@evil.com', amount: 10000 })
});

// 5. Receive $10,000 instead of $5
```

**Impact:**
- Unlimited fraudulent payouts
- Complete financial loss to company
- Bankruptcy risk

**Remediation:**
```javascript
// In /app/api/paypal-payout/route.ts

export async function POST(request: NextRequest) {
  // 1. REQUIRE AUTHENTICATION (see Vulnerability #2)
  await verifyAdminAuth(request);

  const { receiptId, paypalEmail, amount } = await request.json();

  // 2. Fetch receipt with all fields
  const { data: receipt, error } = await supabase
    .from('receipts')
    .select('*, bottle_scans!inner(*)')  // Join with bottle scan
    .eq('id', receiptId)
    .single();

  if (error || !receipt) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
  }

  // 3. Verify receipt is approved
  if (receipt.status !== 'approved') {
    return NextResponse.json({ error: 'Receipt not approved' }, { status: 400 });
  }

  // 4. Verify bottle scan exists and is valid
  if (!receipt.bottle_scans || receipt.bottle_scans.status !== 'completed') {
    return NextResponse.json({ error: 'Invalid bottle scan' }, { status: 400 });
  }

  // 5. Verify amount hasn't been tampered with
  // Store original approved amount in new column: original_approved_amount
  if (receipt.rebate_amount !== receipt.original_approved_amount) {
    // LOG SECURITY INCIDENT
    console.error('SECURITY: Amount mismatch detected', {
      receiptId,
      expected: receipt.original_approved_amount,
      actual: receipt.rebate_amount
    });
    return NextResponse.json({ error: 'Amount mismatch detected' }, { status: 400 });
  }

  // 6. Verify email matches original submission
  if (receipt.paypal_email !== paypalEmail) {
    // LOG SECURITY INCIDENT
    console.error('SECURITY: Email mismatch detected', {
      receiptId,
      expected: receipt.paypal_email,
      provided: paypalEmail
    });
    return NextResponse.json({ error: 'Email mismatch' }, { status: 400 });
  }

  // 7. Use database value, not request parameter (don't trust client)
  const trustedAmount = receipt.original_approved_amount;
  const trustedEmail = receipt.paypal_email;

  // ... proceed with payout using trusted values
}
```

**Database Schema Change Required:**
```sql
-- Add immutable approved amount tracking
ALTER TABLE receipts
  ADD COLUMN original_approved_amount DECIMAL(10,2),
  ADD COLUMN approved_by TEXT,  -- Track who approved
  ADD COLUMN approved_at TIMESTAMP;

-- Add trigger to prevent modification after approval
CREATE OR REPLACE FUNCTION prevent_amount_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('approved', 'paid') AND NEW.rebate_amount != OLD.rebate_amount THEN
    RAISE EXCEPTION 'Cannot modify amount after approval';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_approved_amounts
  BEFORE UPDATE ON receipts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_amount_change();
```

---

### 5. Environment Variable Exposure

**Severity:** CRITICAL
**Files:** `.env.example`, multiple client-side files
**CVSS Score:** 8.2/10

**Issue:**
- `NEXT_PUBLIC_` prefix exposes sensitive configuration to browser
- `.env.example` contains `NEXT_PUBLIC_ADMIN_PASSWORD` (NEVER use NEXT_PUBLIC for passwords!)
- Fraud detection flags exposed to client (`NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK`)
- Attackers can view all `NEXT_PUBLIC_*` variables in browser source code

**Exposed Variables:**
```bash
# From .env.example - DANGEROUS!
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password  # ❌ EXPOSED TO BROWSER!
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  # ⚠️ Acceptable only with strong RLS
NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=true  # ❌ Reveals fraud detection status
NEXT_PUBLIC_DISABLE_TEST_MODE=false  # ⚠️ Reveals test mode availability
```

**Attack Vector:**
```javascript
// View page source in browser:
// All NEXT_PUBLIC_ variables are visible in JavaScript bundles

// Example: Attacker sees
window.__ENV__ = {
  NEXT_PUBLIC_ADMIN_PASSWORD: "admin123",  // EXPOSED!
  NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK: "false"  // Fraud detection disabled!
}

// Attacker now knows:
// - Admin password (can login immediately)
// - Receipt hash checking is disabled (can submit duplicates)
// - Test mode is available (can bypass bottle detection)
```

**Impact:**
- Admin password leak if misconfigured
- Knowledge of fraud prevention settings allows targeted attacks
- Supabase anon key exposure (mitigated by RLS, but RLS is weak - see Vulnerability #3)
- Configuration disclosure aids attackers

**Remediation:**
```bash
# .env.example - CORRECTED

# ❌ NEVER DO THIS:
# NEXT_PUBLIC_ADMIN_PASSWORD=...  # DELETE THIS LINE!

# ✅ Server-side only:
ADMIN_PASSWORD_HASH=...  # Bcrypt hash, not plaintext
ADMIN_JWT_SECRET=...     # Random 256-bit secret

# ✅ Move fraud flags server-side (remove NEXT_PUBLIC_ prefix):
ENABLE_RECEIPT_HASH_CHECK=true  # Server-only
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=true  # Server-only
ENABLE_AUTO_APPROVAL=true  # Server-only

# ✅ Only expose what's necessary:
NEXT_PUBLIC_SUPABASE_URL=...  # OK (public anyway)
NEXT_PUBLIC_SUPABASE_ANON_KEY=...  # OK (protected by RLS - fix RLS first!)

# ⚠️ Remove in production:
# NEXT_PUBLIC_DISABLE_TEST_MODE should not exist in production builds
```

**Code Changes:**
```typescript
// BEFORE (client-side check - INSECURE):
const enableHashCheck = process.env.NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK !== 'false';

// AFTER (server-side only):
// In API route:
const enableHashCheck = process.env.ENABLE_RECEIPT_HASH_CHECK !== 'false';
// Client has no knowledge of this setting
```

---

## 🟠 HIGH PRIORITY VULNERABILITIES (Fix in First Month)

### 6. Session Hijacking - Predictable Session IDs

**Severity:** HIGH
**File:** `lib/session-manager.ts`
**CVSS Score:** 7.5/10

**Issue:**
- Session ID format: `kh-${timestamp}-${uuid().split('-')[0]}`
- Only uses first segment of UUID (8 hex chars = 32 bits = 4.3 billion combinations)
- Timestamp is predictable (millisecond precision)
- Sessions stored in sessionStorage (accessible via XSS)
- Reduced entropy makes brute force feasible

**Attack Vector:**
```javascript
// Session ID example: kh-1730419200000-a1b2c3d4
// Timestamp: 1730419200000 (predictable - just before current time)
// UUID segment: a1b2c3d4 (only 4.3 billion possibilities)

// Enumerate recent sessions:
const now = Date.now();
const uuidChars = '0123456789abcdef';

for (let timeOffset = 0; timeOffset < 60000; timeOffset += 1000) {
  const timestamp = now - timeOffset;

  // Try common UUID patterns (reduced search space)
  for (let i = 0; i < 10000; i++) {
    const uuid = randomUUID();  // Could use sequential patterns
    const sessionId = `kh-${timestamp}-${uuid}`;

    // Test if session exists by calling API
    const exists = await fetch(`/api/check-session/${sessionId}`);
    if (exists) {
      // Hijack session!
    }
  }
}
```

**Impact:**
- Session takeover (access to other users' receipts)
- Submission of fraudulent receipts under legitimate sessions
- Receipt status manipulation
- PayPal email harvesting

**Remediation:**
```typescript
// lib/session-manager.ts

import { randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export function generateSessionId(): string {
  // Use full UUID (128 bits) + cryptographic random bytes (128 bits)
  const uuid = uuidv4();  // Full UUID, not just first segment!
  const random = randomBytes(16).toString('hex');  // Additional 128 bits
  return `kh-${uuid}-${random}`;

  // Example: kh-550e8400-e29b-41d4-a716-446655440000-a1b2c3d4e5f67890a1b2c3d4e5f67890
  // Total entropy: 256 bits (practically impossible to brute force)
}

// Store in httpOnly cookie instead of sessionStorage (XSS protection)
export function setSessionCookie(sessionId: string) {
  document.cookie = `kh_session=${sessionId}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=86400`;
}

// Add session binding to IP/User-Agent (detect session theft)
export function bindSession(sessionId: string, ip: string, userAgent: string) {
  // Store hash of IP+UserAgent with session
  // Verify on each request
}

// Add session expiry in database
ALTER TABLE bottle_scans ADD COLUMN session_expires_at TIMESTAMP;
```

---

### 7. Rate Limiting Bypass

**Severity:** HIGH
**Files:** `app/api/check-rate-limit/route.ts`, `lib/supabase-helpers.ts`
**CVSS Score:** 7.2/10

**Issue:**
- Rate limiting only checks IP address (easily bypassed with VPN/proxies)
- No distributed rate limiting (uses single server memory - doesn't work in serverless)
- No CAPTCHA for automated attacks
- Receipt validation has weak rate limit (5 requests/minute per IP)
- No device fingerprinting

**Attack Vector:**
```bash
# Use rotating proxies to bypass IP rate limiting
while true; do
  proxy=$(shuf -n1 proxy-list.txt)
  curl -x $proxy https://burnthatad.com/api/detect-bottle \
    -F "image=@fake-bottle.jpg"
done

# Result: Unlimited bottle scans, unlimited receipt submissions
```

**Impact:**
- Unlimited bottle scans (exhaust Google Vision API quota)
- Unlimited receipt submissions (fraud at scale)
- DDoS potential (overwhelm server)
- Financial loss (API costs)

**Remediation:**
```typescript
// 1. Use distributed rate limiting (Redis/Upstash)
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '24h'),
  analytics: true,
});

export async function checkRateLimit(identifier: string) {
  const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
  return success;
}

// 2. Multi-factor rate limiting
const rateLimitKey = `${ip}:${userAgent}:${sessionId}`;

// 3. Add CAPTCHA on upload page
import { verifyCaptcha } from '@/lib/captcha';

const captchaValid = await verifyCaptcha(captchaToken);
if (!captchaValid) {
  return NextResponse.json({ error: 'CAPTCHA verification failed' }, { status: 403 });
}

// 4. Add device fingerprinting
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const fp = await FingerprintJS.load();
const result = await fp.get();
const visitorId = result.visitorId;
```

---

### 8. PayPal Email Injection

**Severity:** HIGH
**File:** `app/api/paypal-payout/route.ts`
**CVSS Score:** 6.8/10

**Issue:**
- PayPal email from user input with minimal validation
- Email regex validation only on client-side (easily bypassed)
- No server-side email format validation
- No verification that PayPal email actually exists
- Allows email subaddressing tricks (`user+1@email.com`, `user+2@email.com`)

**Attack Vector:**
```javascript
// Submit with malicious email patterns
{
  "paypalEmail": "attacker+victim@evil.com",  // Email injection
  "receiptId": "...",
  "amount": 5.00
}

// Or use non-existent email to create failed payouts
{
  "paypalEmail": "nonexistent@fake-domain-12345.com",
  "receiptId": "...",
  "amount": 5.00
}

// Or bypass rate limiting with subaddressing
"attacker+1@gmail.com"
"attacker+2@gmail.com"
"attacker+999@gmail.com"
// All go to same inbox, but rate limiting sees different emails
```

**Impact:**
- Failed payouts (funds stuck in limbo)
- Rate limiting bypass via email subaddressing
- Social engineering attacks
- Payment misdirection

**Remediation:**
```typescript
import validator from 'validator';

export async function POST(request: NextRequest) {
  const { paypalEmail } = await request.json();

  // 1. Server-side email validation
  if (!validator.isEmail(paypalEmail)) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  // 2. Normalize email (remove subaddressing)
  function normalizeEmail(email: string): string {
    const [local, domain] = email.split('@');
    const normalizedLocal = local.split('+')[0];  // Remove +suffix
    return `${normalizedLocal}@${domain.toLowerCase()}`;
  }

  const canonicalEmail = normalizeEmail(paypalEmail);

  // 3. Check rate limiting against canonical email
  const { data: recentPayouts } = await supabase
    .from('receipts')
    .select('id')
    .eq('paypal_email_canonical', canonicalEmail)  // New column
    .gte('paid_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .limit(1);

  if (recentPayouts && recentPayouts.length > 0) {
    return NextResponse.json({
      error: 'Email has already received payout in last 30 days'
    }, { status: 429 });
  }

  // 4. Additional checks
  if (paypalEmail.includes('..')) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  // 5. Domain validation (optional)
  const allowedDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'paypal.com'];
  const domain = paypalEmail.split('@')[1];
  // Consider: require domain has MX records

  // 6. Consider: PayPal email verification API
  // Verify email exists in PayPal system before sending payout
}
```

**Database Schema Change:**
```sql
ALTER TABLE receipts
  ADD COLUMN paypal_email_canonical TEXT;

CREATE INDEX idx_receipts_canonical_email_paid
  ON receipts(paypal_email_canonical, paid_at)
  WHERE status = 'paid';
```

---

### 9. CSRF Vulnerability

**Severity:** HIGH
**Files:** All API routes
**CVSS Score:** 7.1/10

**Issue:**
- No CSRF tokens implemented
- Admin actions (approve/reject) have no CSRF protection
- Cookie SameSite is 'Strict' (good) but no secondary protection layer

**Attack Vector:**
```html
<!-- Attacker's malicious website -->
<html>
  <body>
    <h1>You won a prize!</h1>

    <!-- Hidden form auto-submits to victim's app -->
    <form id="attack" action="https://burnthatad.com/api/paypal-payout" method="POST">
      <input type="hidden" name="receiptId" value="attacker-receipt-id">
      <input type="hidden" name="amount" value="10000">
      <input type="hidden" name="paypalEmail" value="attacker@evil.com">
    </form>

    <script>
      // If admin is logged in and visits this page:
      document.getElementById('attack').submit();
      // Payout is triggered using admin's session!
    </script>
  </body>
</html>
```

**Impact:**
- Admin performs unwanted actions (approve fraudulent receipts)
- Fraudulent payouts triggered without admin knowledge
- Receipt status manipulation

**Remediation:**
```typescript
// 1. Add CSRF token middleware
import { createCsrfProtect } from '@edge-csrf/nextjs';

const csrfProtect = createCsrfProtect({
  cookie: {
    name: '__Host-csrf',
    secure: true,
    sameSite: 'strict'
  }
});

// In API route:
export async function POST(request: NextRequest) {
  // Verify CSRF token
  const csrfError = await csrfProtect(request);
  if (csrfError) {
    return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });
  }

  // ... rest of logic
}

// 2. Verify Origin header
const origin = request.headers.get('origin');
const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL];

if (origin && !allowedOrigins.includes(origin)) {
  return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
}

// 3. Require custom header (defense in depth)
const requestedWith = request.headers.get('X-Requested-With');
if (!requestedWith || requestedWith !== 'XMLHttpRequest') {
  return NextResponse.json({ error: 'Missing required header' }, { status: 403 });
}

// 4. SameSite=Strict cookies (already implemented - good!)
// Cookies: { sameSite: 'strict', secure: true, httpOnly: true }
```

---

### 10-13. Additional High Priority Issues

See full audit report for details on:
- **10. File Upload - No Content Verification** (malware, EXIF leaks)
- **11. XSS Vulnerability - Receipt Text Display** (admin session hijacking)
- **12. Double-Payment Race Condition** (database locking required)
- **13. Logging Sensitive Data** (PII exposure, GDPR violation)

---

## 🟡 MEDIUM PRIORITY ISSUES

### 14. Session Storage XSS Vulnerability
Session ID in sessionStorage is accessible via JavaScript. Use httpOnly cookies instead.

### 15. Client-Side Fraud Flags
`NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK` allows client-side bypass. Move server-side.

### 16. Weak Fraud Scoring
Current scoring too permissive. Needs ML-based fraud detection and behavioral analysis.

### 17. No PII Encryption at Rest
PayPal emails stored in plaintext. Implement field-level encryption.

### 18. Missing Content Security Policy
No CSP header defined. Add nonce-based CSP to prevent XSS.

### 19. No Audit Logging
No audit trail for admin actions. Create `audit_log` table.

### 20. Dependency Vulnerability
`tar@7.5.1` has moderate vulnerability. Run `npm audit fix`.

### 21. No API Key Rotation
No mechanism to rotate Google Vision API keys. Implement 90-day rotation.

### 22. Insecure Admin Password Reset
No password reset mechanism. Implement secure reset flow with time-limited tokens.

---

## ⚪ LOW PRIORITY ISSUES

### 23. Information Disclosure - Error Messages
Detailed error messages expose internal structure. Use generic messages in production.

### 24. No Request Size Limits
No max body size limits. Add to prevent memory exhaustion.

### 25. Test Mode in Production
Test mode can be enabled by users. Remove completely for production builds.

### 26. No security.txt
No responsible disclosure mechanism. Add `/.well-known/security.txt`.

---

## ✅ GOOD SECURITY PRACTICES (Already Implemented)

1. **Security Headers** - HSTS, X-Frame-Options, X-Content-Type-Options
2. **Rate Limiting** - IP-based (though bypassable)
3. **Image Hashing** - SHA-256 for duplicate detection
4. **Session Expiry** - 24-hour timeout
5. **HTTPS Enforcement** - HSTS with preload
6. **Input Validation** - Basic file size/type validation
7. **Fraud Scoring** - Automated detection system (7-layer)
8. **Daily Limits** - Safety cap for auto-approvals
9. **PayPal Email Rate Limiting** - Prevents multiple payouts
10. **Storage Permissions** - Proper Supabase bucket config
11. **Environment Separation** - Sandbox vs production
12. **Server Fingerprinting Prevention** - X-Powered-By removed

---

## 🚀 QUICK WINS (High Impact, Low Effort)

Priority fixes that can be done quickly:

| Fix | Effort | Impact | File |
|-----|--------|--------|------|
| Add auth check to payout API | 30 min | Critical | `app/api/paypal-payout/route.ts` |
| Remove NEXT_PUBLIC_ADMIN_PASSWORD | 5 min | Critical | `.env.example` |
| Fix RLS policies | 2 hours | Critical | `supabase/migrations/001_initial_schema.sql` |
| Add CSRF protection | 1 hour | High | All API routes |
| Add server-side email validation | 30 min | High | `app/api/paypal-payout/route.ts` |
| Implement database locking | 1 hour | High | `app/api/paypal-payout/route.ts` |
| Strip EXIF from uploads | 30 min | Medium | `app/api/validate-image/route.ts` |
| Sanitize admin display | 1 hour | High | `app/admin/page.tsx` |
| Update tar dependency | 5 min | Medium | Run `npm audit fix` |
| Move fraud flags server-side | 30 min | Medium | `.env.example` + API routes |

**Total Quick Wins Effort:** ~8 hours
**Risk Reduction:** Eliminates 3/5 critical vulnerabilities

---

## 📋 PRE-LAUNCH SECURITY CHECKLIST

### Required Before Production:

#### Authentication & Authorization
- [ ] Replace plaintext password with bcrypt hash
- [ ] Implement JWT-based admin sessions
- [ ] Add rate limiting to login endpoint (5 attempts/15 min)
- [ ] Add authentication to `/api/paypal-payout`
- [ ] Add authentication to `/api/auto-approve-receipt`
- [ ] Implement account lockout (10 failed attempts)
- [ ] Add admin action audit logging

#### Database Security
- [ ] Fix all RLS policies (remove `USING (true)`)
- [ ] Implement session-based RLS for receipts
- [ ] Add admin-only RLS for approvals/payouts
- [ ] Add database triggers to prevent amount modification
- [ ] Add `original_approved_amount` column
- [ ] Add `paypal_email_canonical` column
- [ ] Create indexes for security queries

#### Payment Security
- [ ] Add receipt validation before payout
- [ ] Implement amount immutability checks
- [ ] Add email normalization (remove +suffixes)
- [ ] Add database row locking (prevent race conditions)
- [ ] Verify bottle scan exists before payout
- [ ] Add payout attempt logging

#### Input Validation
- [ ] Add server-side email validation
- [ ] Implement magic number verification for images
- [ ] Strip EXIF metadata from uploads
- [ ] Add XSS sanitization for all user content
- [ ] Implement CSRF protection on all state-changing endpoints

#### Session Security
- [ ] Use full UUID for session IDs (not truncated)
- [ ] Add cryptographic random bytes to session IDs
- [ ] Move sessions from sessionStorage to httpOnly cookies
- [ ] Add session binding (IP + User-Agent)
- [ ] Implement session expiry in database

#### Environment & Configuration
- [ ] Remove `NEXT_PUBLIC_ADMIN_PASSWORD` from .env.example
- [ ] Move all fraud flags server-side (remove NEXT_PUBLIC_)
- [ ] Add `ADMIN_PASSWORD_HASH` environment variable
- [ ] Add `JWT_SECRET` environment variable
- [ ] Remove test mode code from production build
- [ ] Verify no secrets in client-side code

#### Compliance & Privacy
- [ ] Remove PII from logs (redact PayPal emails)
- [ ] Add field-level encryption for PayPal emails
- [ ] Create data retention policy
- [ ] Add privacy policy page
- [ ] Add terms of service page
- [ ] Add GDPR-compliant data deletion mechanism
- [ ] Create incident response plan

#### Testing
- [ ] Run SQL injection tests
- [ ] Run XSS tests (all inputs)
- [ ] Run CSRF tests (all endpoints)
- [ ] Test authentication bypass attempts
- [ ] Test authorization bypass attempts
- [ ] Test rate limiting with proxies
- [ ] Test session hijacking scenarios
- [ ] Test file upload security
- [ ] Test race conditions (double payments)
- [ ] Run `npm audit` and fix all issues
- [ ] Penetration testing by security firm

#### Monitoring
- [ ] Set up security event logging
- [ ] Add alerting for suspicious activity
- [ ] Implement fraud detection monitoring
- [ ] Add payout monitoring dashboard
- [ ] Set up error tracking (Sentry)
- [ ] Create admin action audit trail

---

## 📊 ESTIMATED REMEDIATION EFFORT

| Priority | Issues | Hours | Complexity |
|----------|--------|-------|------------|
| Critical | 5 | 40-60 | High |
| High | 8 | 30-40 | Medium |
| Medium | 9 | 20-30 | Low-Medium |
| Low | 4 | 10-15 | Low |
| **Total** | **26** | **100-145** | **Mixed** |

**Timeline:** 3-4 weeks for 1 developer working full-time

**Recommended Approach:**
1. **Week 1:** Fix all Critical issues (40-60 hours)
2. **Week 2:** Fix High priority issues (30-40 hours)
3. **Week 3:** Testing, QA, security review
4. **Week 4:** Medium priority issues + production deployment

---

## 🎯 SECURITY ROADMAP

### Phase 1: Pre-Launch (REQUIRED)
**Timeline:** 3-4 weeks
**Goal:** Fix all critical vulnerabilities

- Fix all 5 critical vulnerabilities
- Implement proper authentication
- Fix RLS policies
- Add CSRF protection
- Add audit logging
- Security testing (penetration test)

**Success Criteria:** Zero critical vulnerabilities, security audit passes

---

### Phase 2: First Month Post-Launch
**Timeline:** 4 weeks
**Goal:** Address high-priority issues

- Implement distributed rate limiting (Redis)
- Add CAPTCHA to upload pages
- Implement session security improvements
- Add email validation enhancements
- Fix XSS vulnerabilities
- Implement database row locking

**Success Criteria:** Zero high-severity vulnerabilities

---

### Phase 3: First Quarter
**Timeline:** 12 weeks
**Goal:** Comprehensive security hardening

- Encrypt PII at rest
- Implement CSP headers
- Add API key rotation
- Implement comprehensive audit logging
- Add security monitoring dashboards
- ML-based fraud detection
- Behavioral analysis
- Device fingerprinting

**Success Criteria:** SOC 2 compliance ready

---

### Phase 4: Ongoing
**Goal:** Maintain security posture

- Monthly security reviews
- Quarterly penetration testing
- Annual security audits
- Bug bounty program
- Incident response drills
- GDPR compliance reviews
- Dependency scanning (automated)

---

## 🚨 COMPLIANCE CONCERNS

### GDPR Violations Identified

1. **No Data Retention Policy** - Receipts stored indefinitely
2. **No User Consent** - Missing privacy policy acceptance
3. **PII in Logs** - Console.log exposes PayPal emails
4. **No Deletion Mechanism** - No way for users to request data deletion
5. **No Breach Notification Plan** - Missing incident response procedures
6. **No Data Processing Agreement** - For third-party APIs (Google, PayPal)
7. **No Privacy by Design** - PII not encrypted at rest

**GDPR Fines:** Up to €20 million or 4% of annual revenue

### PCI DSS Concerns

While not directly handling credit cards, PayPal email storage has similar risks:

1. **Unencrypted Storage** - Payment identifiers not encrypted
2. **Weak Access Controls** - Anyone can access payment data (RLS bug)
3. **No Audit Trail** - Payment operations not logged
4. **Weak Authentication** - Admin access poorly secured

---

## 🔬 TESTING RECOMMENDATIONS

### Security Testing Checklist

- [ ] **SQL Injection Testing**
  - Test all Supabase queries with malicious input
  - Test RLS policy bypass attempts
  - Test JOIN injection attacks

- [ ] **XSS Testing**
  - Test all user input fields (receipt text, admin notes)
  - Test file upload XSS (SVG, WebP metadata)
  - Test stored XSS in admin dashboard

- [ ] **CSRF Testing**
  - Test all state-changing operations without CSRF token
  - Test Origin header spoofing
  - Test double-submit cookie bypass

- [ ] **Authentication Bypass**
  - Test admin access without password
  - Test session token forgery
  - Test timing attacks on password comparison

- [ ] **Authorization Bypass**
  - Test accessing other users' receipts
  - Test modifying other sessions' data
  - Test triggering payouts without admin role

- [ ] **Rate Limiting Bypass**
  - Test with rotating proxies
  - Test with distributed requests
  - Test with concurrent requests

- [ ] **Session Hijacking**
  - Test session ID prediction
  - Test session fixation
  - Test session replay attacks

- [ ] **File Upload Security**
  - Test malware upload
  - Test file type spoofing
  - Test path traversal
  - Test XXE injection

- [ ] **Race Conditions**
  - Test double-payment with concurrent requests
  - Test double-submission of same receipt
  - Test concurrent approval attempts

- [ ] **API Fuzzing**
  - Fuzz all API endpoints with random data
  - Test unexpected HTTP methods
  - Test malformed JSON payloads

- [ ] **Dependency Scanning**
  - Run `npm audit`
  - Run Snyk or Dependabot scans
  - Test for known CVEs

- [ ] **TLS Configuration**
  - Test SSL Labs rating (target: A+)
  - Verify HSTS implementation
  - Test certificate validity

---

## 📞 INCIDENT RESPONSE

### Security Incident Contacts

**Security Team:** [To be defined]
**On-Call Engineer:** [To be defined]
**Legal Team:** [To be defined]
**PayPal Support:** 1-888-221-1161
**Supabase Support:** support@supabase.io

### Incident Response Plan

1. **Detection** - Security monitoring alerts
2. **Containment** - Disable affected endpoints
3. **Investigation** - Analyze logs, identify scope
4. **Eradication** - Fix vulnerability, deploy patch
5. **Recovery** - Restore normal operations
6. **Lessons Learned** - Post-mortem, improve defenses

### Breach Notification Requirements

- **GDPR:** 72 hours to notify supervisory authority
- **CCPA:** Without unreasonable delay
- **Users:** Notify affected individuals

---

## 📚 REFERENCES

- [OWASP Top 10 2021](https://owasp.org/www-project-top-ten/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/security)

---

## 📝 RESPONSIBLE DISCLOSURE

If you discover a security vulnerability, please report it responsibly:

**Email:** security@keepersheart.com [To be created]
**PGP Key:** [To be provided]
**Bug Bounty:** [To be established]

**Please do NOT:**
- Publicly disclose vulnerabilities before they're fixed
- Test vulnerabilities on production systems
- Access or modify user data

**We commit to:**
- Acknowledge receipt within 24 hours
- Provide status updates every 72 hours
- Fix critical issues within 7 days
- Credit researchers (with permission)

---

**Last Updated:** October 31, 2025
**Next Review:** After critical fixes implemented + before production launch
**Security Contact:** [To be defined]
