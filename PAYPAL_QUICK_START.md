# PayPal Payouts - Quick Start

## 🚀 What Changed?

Your app now pays users via **PayPal Payouts API** instead of manual Venmo transfers!

---

## ✅ What's Already Done

1. ✅ Frontend updated to collect PayPal email (not Venmo username)
2. ✅ Admin dashboard updated to trigger automatic payouts
3. ✅ PayPal API integration built ([app/api/paypal-payout/route.ts](app/api/paypal-payout/route.ts))
4. ✅ Database schema updated (see [supabase-update-receipts.sql](supabase-update-receipts.sql))

---

## 📋 What You Need to Do (15 minutes)

### 1. Update Database (2 minutes)
Run this SQL in Supabase SQL Editor:
```sql
ALTER TABLE receipts RENAME COLUMN venmo_username TO paypal_email;
```

### 2. Get PayPal Credentials (5 minutes)
1. Go to https://developer.paypal.com/dashboard/
2. Create app: "Burn That Ad"
3. Copy **Client ID** and **Secret**

### 3. Add to .env.local (2 minutes)
```bash
PAYPAL_CLIENT_ID=your_client_id
PAYPAL_CLIENT_SECRET=your_secret
PAYPAL_ENVIRONMENT=sandbox  # Use 'sandbox' for testing
```

### 4. Restart Server (1 minute)
```bash
npm run dev
```

### 5. Test It! (5 minutes)
1. Scan a bottle
2. Upload receipt
3. Enter email: `your-test@email.com`
4. Go to `/admin`
5. Click **Approve & Pay**
6. ✅ Payout sent automatically!

---

## 💰 How Admin Pays Users Now

### Old Flow (Manual):
1. Admin approves receipt
2. Opens Venmo app manually
3. Searches for username
4. Sends payment manually
5. Marks as paid manually

### New Flow (Automated):
1. Admin clicks **"Approve & Pay"**
2. System confirms: "Send $5 to user@email.com?"
3. Admin clicks OK
4. ✅ **Payment sent automatically via PayPal API**
5. ✅ Receipt marked as "paid" in database
6. ✅ Payout ID saved for tracking

---

## 🎯 User Experience

**What user enters:** `user@gmail.com` (their email)

**What happens:**
- Has PayPal → Money arrives in 1-2 days ✅
- No PayPal → Gets email to claim it (creates account automatically) ✅

**Why it's better than Venmo:**
- Everyone has email (not everyone has Venmo)
- No usernames to remember
- Automatic account creation
- Professional payment receipts

---

## 📊 Cost

- **Rebate:** $5.00
- **PayPal fee:** $0.25
- **Total:** $5.25 per user

---

## 🧪 Testing Strategies

### Option 1: Sandbox Testing (FREE - Recommended)

**Cost: $0.00**

```bash
# .env.local
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_secret
```

Steps:
1. Create test accounts at: https://developer.paypal.com/dashboard/accounts
2. Use test email for payouts (e.g., `buyer@personal.example.com`)
3. Check sandbox account: https://www.sandbox.paypal.com
4. No real money spent - perfect for development

**Pros:**
- ✅ Completely free
- ✅ Unlimited testing
- ✅ Full API functionality
- ✅ No risk

**Cons:**
- ❌ Not real-world testing
- ❌ Requires PayPal developer account

---

### Option 2: Live Testing with Penny Payouts

**Cost: $0.02 per test** (includes PayPal fee)

```bash
# .env.local
PAYPAL_ENVIRONMENT=live
PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_CLIENT_SECRET=your_live_secret
TEST_PAYOUT_AMOUNT=0.01  # Override $5.00 default
```

Steps:
1. Use live PayPal credentials
2. Set `TEST_PAYOUT_AMOUNT=0.01` to send $0.01 instead of $5.00
3. Use your own email for testing
4. Verify money arrives in your account

**Pros:**
- ✅ Real-world testing
- ✅ Minimal cost ($0.02 per test)
- ✅ Tests actual money flow
- ✅ Validates live credentials

**Cons:**
- ❌ Small cost per test
- ❌ Uses real PayPal account

**Cost Breakdown:**
- Payout amount: $0.01
- PayPal fee: ~$0.01 (minimum fee)
- **Total: ~$0.02 per test**

---

### Option 3: Full Production Testing

**Cost: $5.25 per test**

```bash
# .env.local
PAYPAL_ENVIRONMENT=live
PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_CLIENT_SECRET=your_live_secret
# Do NOT set TEST_PAYOUT_AMOUNT - uses $5.00 default
```

**Cost Breakdown:**
- Payout amount: $5.00
- PayPal fee: $0.25
- **Total: $5.25 per test**

Only use this for final pre-launch validation!

---

### Recommended Testing Workflow

**Phase 1: Development (Sandbox - FREE)**
```bash
PAYPAL_ENVIRONMENT=sandbox
# Test unlimited times at $0.00 cost
```

**Phase 2: Staging ($0.01 Payouts)**
```bash
PAYPAL_ENVIRONMENT=live
TEST_PAYOUT_AMOUNT=0.01
# Test 5-10 times at $0.10-$0.20 total cost
```

**Phase 3: Pre-Launch ($5.00 Payout)**
```bash
PAYPAL_ENVIRONMENT=live
# Remove TEST_PAYOUT_AMOUNT
# Final validation: 1-2 tests at $5.25-$10.50 cost
```

**Phase 4: Production**
```bash
PAYPAL_ENVIRONMENT=live
# Same as Phase 3 - ready to go!
```

**Total Testing Cost: ~$0.20 - $11.00** (depending on how many live tests you run)

---

## 🚨 Before Production

- [ ] Run database migration (rename column)
- [ ] Get **live** PayPal credentials (not sandbox)
- [ ] Add credentials to `.env.local`
- [ ] Change `PAYPAL_ENVIRONMENT=live`
- [ ] Test with $1 payout first
- [ ] Verify money arrives
- [ ] Launch! 🎉

---

## 📖 Full Documentation

See [docs/PAYPAL_SETUP.md](docs/PAYPAL_SETUP.md) for:
- Detailed setup instructions
- Troubleshooting guide
- Security best practices
- API reference

---

## 🆘 Need Help?

**Issue:** "PayPal credentials not configured"
**Fix:** Add `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` to `.env.local`, restart server

**Issue:** "Failed to authenticate"
**Fix:** Double-check credentials, ensure no extra spaces

**Issue:** User didn't receive money
**Fix:** Payouts take 1-2 days (not instant). Check PayPal dashboard for status.

---

## 🎉 That's It!

You now have **automated PayPal payouts** with:
- ✅ One-click admin approval
- ✅ Automatic payment processing
- ✅ Database tracking
- ✅ Seamless user experience
- ✅ $0.25 per transaction (cheaper than manual labor!)

**Questions?** Check [docs/PAYPAL_SETUP.md](docs/PAYPAL_SETUP.md)
