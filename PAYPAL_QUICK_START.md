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

## 🧪 Testing (Sandbox)

1. Use test credentials with `PAYPAL_ENVIRONMENT=sandbox`
2. Create test account at: https://developer.paypal.com/dashboard/accounts
3. Use test email for payouts
4. Check sandbox account: https://www.sandbox.paypal.com

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
