# PayPal Payouts Setup Guide

This guide walks you through setting up PayPal Payouts API for the Burn That Ad campaign.

---

## Overview

The app uses **PayPal Payouts API** to send rebates directly to consumers. When an admin approves a receipt, the system automatically sends money to the user's PayPal email address.

**Cost:** $0.25 per payout (Standard 1-2 day delivery)

---

## Step 1: Create PayPal Business Account

1. Go to [PayPal Business](https://www.paypal.com/us/business)
2. Click **Sign Up** and select **Business Account**
3. Complete the registration process
4. Verify your email and link a bank account (required for payouts)

**Note:** You need a **Business** account, not a personal account, to access Payouts API.

---

## Step 2: Create PayPal App Credentials

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Log in with your PayPal Business account
3. Click **Apps & Credentials**
4. Select **Sandbox** tab (for testing) or **Live** tab (for production)
5. Click **Create App**
6. Enter app name: "Burn That Ad Campaign"
7. Copy your **Client ID** and **Secret**

### For Sandbox Testing:
- Use sandbox credentials in `.env` with `PAYPAL_ENVIRONMENT=sandbox`
- Create test accounts at: https://developer.paypal.com/dashboard/accounts
- Use test PayPal emails for testing (e.g., `buyer@example.com`)

### For Production:
- Use live credentials in `.env` with `PAYPAL_ENVIRONMENT=live`
- Ensure your PayPal Business account is fully verified
- Add funds or link a bank account for payouts

---

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Add your PayPal credentials:
   ```bash
   # PayPal Payouts API
   PAYPAL_CLIENT_ID=AeA1... (your Client ID)
   PAYPAL_CLIENT_SECRET=EJZ... (your Secret)
   PAYPAL_ENVIRONMENT=sandbox  # or 'live' for production
   ```

3. Restart your development server:
   ```bash
   npm run dev
   ```

---

## Step 4: Update Database Schema

Run the SQL migration to rename `venmo_username` to `paypal_email`:

```bash
# Option 1: Run in Supabase SQL Editor
cat supabase-update-receipts.sql

# Then paste the contents into:
# https://app.supabase.com/project/YOUR_PROJECT/sql

# Option 2: If you have psql access
psql YOUR_DATABASE_URL < supabase-update-receipts.sql
```

The migration:
```sql
ALTER TABLE receipts RENAME COLUMN venmo_username TO paypal_email;
COMMENT ON COLUMN receipts.paypal_email IS 'PayPal email address for payout';
```

---

## How It Works

### User Flow:
1. User uploads receipt
2. User enters their email (e.g., `user@gmail.com`)
3. Receipt goes to admin review queue

### Admin Flow:
1. Admin views receipt in dashboard at `/admin`
2. Admin clicks **"Approve & Pay"**
3. System confirms: "Send $5.00 to user@gmail.com?"
4. Admin confirms
5. **System automatically:**
   - Marks receipt as "approved"
   - Calls PayPal Payouts API
   - Sends $5 to user's email
   - Updates receipt status to "paid"
   - Shows confirmation with Payout ID

### User Receives Money:
- **Has PayPal:** Money arrives in their account (1-2 days)
- **No PayPal:** Gets email from PayPal to claim money (creates account automatically)

---

## Testing in Sandbox

### Create Test Accounts:
1. Go to [PayPal Sandbox Accounts](https://developer.paypal.com/dashboard/accounts)
2. Click **Create Account**
3. Create a **Personal** account (for receiving payouts)
4. Note the email address (e.g., `sb-test123@personal.example.com`)

### Test the Flow:
1. Run your app: `npm run dev`
2. Scan a bottle (mock detection)
3. Upload receipt
4. Enter sandbox test email: `sb-test123@personal.example.com`
5. Go to admin dashboard: `http://localhost:3000/admin`
6. Approve the receipt
7. Check PayPal Sandbox: [https://www.sandbox.paypal.com](https://www.sandbox.paypal.com)
8. Log in with test account to see the payout

---

## API Route Details

The payout is handled by [app/api/paypal-payout/route.ts](../app/api/paypal-payout/route.ts):

**Endpoint:** `POST /api/paypal-payout`

**Request:**
```json
{
  "receiptId": "uuid",
  "paypalEmail": "user@example.com",
  "amount": 5.00
}
```

**Response (Success):**
```json
{
  "success": true,
  "payoutId": "ABCDEF123456",
  "batchId": "BATCH-1234567890",
  "amount": 5.00,
  "paypalEmail": "user@example.com",
  "message": "Payout sent successfully"
}
```

**Response (Error):**
```json
{
  "error": "Error message here"
}
```

---

## Security Considerations

### Production Checklist:
- [ ] Use **live** PayPal credentials (not sandbox)
- [ ] Set strong `NEXT_PUBLIC_ADMIN_PASSWORD` in `.env`
- [ ] Store PayPal secrets in environment variables (never commit to Git)
- [ ] Enable PayPal account 2FA
- [ ] Monitor PayPal dashboard for suspicious activity
- [ ] Set daily/weekly payout limits in your business logic
- [ ] Log all payout attempts for audit trail

### Fraud Prevention:
- Admin manually reviews every receipt before payout
- One payout per receipt (checked in API)
- Duplicate image detection prevents same photo reuse
- Rate limiting prevents abuse (3 scans per 24 hours per IP)
- Session expiry (24 hours)

---

## Troubleshooting

### Error: "PayPal credentials not configured"
- Check `.env.local` has `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`
- Restart dev server after adding env variables

### Error: "Failed to authenticate with PayPal"
- Verify Client ID and Secret are correct
- Check you're using the right credentials (sandbox vs live)
- Ensure no extra spaces in `.env.local`

### Error: "Insufficient funds"
- Add funds to your PayPal Business account
- Or link a bank account for automatic funding

### Error: "Recipient account invalid"
- Email address is not a valid PayPal email
- For non-PayPal users, they'll receive an email to claim (not an error)

### Payout sent but user didn't receive
- Check status in PayPal dashboard
- Payouts take 1-2 business days (not instant)
- User may need to check spam folder for PayPal email

---

## Cost Calculation

**Per Payout:**
- Rebate: $5.00
- PayPal fee: $0.25
- **Total cost:** $5.25

**Campaign Examples:**
- 100 users: $525
- 500 users: $2,625
- 1,000 users: $5,250

**Instant Payouts (Optional):**
- Cost: $0.25 + 1% of amount (e.g., $5 = $0.30 total fee)
- Arrives in ~30 minutes instead of 1-2 days
- Good for VIP campaigns or time-sensitive promotions

To enable instant payouts, modify the API payload:
```javascript
sender_batch_header: {
  // ... other fields
  funding_source: 'BALANCE',  // Add this for instant
}
```

---

## Resources

- [PayPal Payouts API Docs](https://developer.paypal.com/docs/api/payments.payouts-batch/v1/)
- [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
- [PayPal Business Account](https://www.paypal.com/us/business)
- [Sandbox Testing Guide](https://developer.paypal.com/api/rest/sandbox/)

---

## Support

**Questions?**
- PayPal Developer Support: https://developer.paypal.com/support/
- Check API logs in PayPal Dashboard
- Review server logs for error details

**Production Launch Checklist:**
1. Switch to live credentials
2. Test with small amount first ($1-2)
3. Verify payout arrives successfully
4. Monitor first 10-20 payouts closely
5. Set up alerts for failed payouts
