# PayPal Payouts API Setup Guide

This guide walks you through setting up PayPal Payouts API for automated rebate payments to users.

## Why PayPal Payouts?

- **Direct payments:** Send money directly to user's PayPal/email
- **Low cost:** $0.25-0.50 per payout (dramatically cheaper than manual peer-to-peer payouts)
- **Well documented:** Mature API with great Node.js SDK
- **Instant or 1-2 days:** Choose speed vs cost
- **Global:** Works internationally (if needed)
- **Reliable:** Battle-tested by thousands of companies

---

## Pricing

### Per Transaction
- **Standard (1-2 days):** $0.25 per payout
- **Instant (minutes):** 1% of amount (max $0.25 for $25 payout)
- **No setup fees**
- **No monthly fees**

### Example Costs (for $5 rebate)
- Standard payout: $5.25 total cost ($0.25 fee)
- Instant payout: $5.05 total cost ($0.05 fee)

**Recommendation:** Use Standard payouts for MVP ($0.25/transaction is very reasonable)

---

## Step 1: Create PayPal Business Account (10 minutes)

### 1.1 Sign Up
1. Go to: https://www.paypal.com/us/webapps/mpp/account-selection
2. Click "Business Account"
3. Fill in business information:
   - Business name: Your company name
   - Business type: Sole proprietorship (or actual type)
   - Industry: Advertising/Marketing
4. Complete email verification

### 1.2 Verify Account
- Add bank account (required for payouts)
- Verify bank with micro-deposits (1-2 days)
- OR link debit card for instant verification

### 1.3 Upgrade to Business (if needed)
- Go to Settings → Account Settings
- Ensure account type is "Business"
- Complete any verification steps

---

## Step 2: Create PayPal App (5 minutes)

### 2.1 Access Developer Dashboard
1. Go to: https://developer.paypal.com/
2. Log in with your PayPal Business account
3. Click "Dashboard" in top right

### 2.2 Create App
1. Click "Apps & Credentials"
2. Make sure you're in **Sandbox** tab first (for testing)
3. Click "Create App"
4. App details:
   - App Name: `Burn That Ad Payouts`
   - App Type: Merchant
5. Click "Create App"

### 2.3 Get Sandbox Credentials
After creating, you'll see:
- **Client ID** (starts with `A...`)
- **Secret** (click "Show" to reveal)

**Save these for testing!**

---

## Step 3: Enable Payouts Feature (2 minutes)

### 3.1 Enable in Sandbox App
1. In your app settings (Sandbox)
2. Scroll to "Features"
3. Enable "Payouts"
4. Save changes

### 3.2 Request Production Access (Later)
When ready to go live:
1. Fill out PayPal application form
2. Explain use case: "Consumer rebates for whiskey marketing campaign"
3. Approval usually 1-3 business days

---

## Step 4: Configure Environment Variables (2 minutes)

### 4.1 Add to .env.local

```bash
# PayPal Payouts API
PAYPAL_MODE=sandbox  # Change to 'live' for production
PAYPAL_CLIENT_ID=your-sandbox-client-id
PAYPAL_CLIENT_SECRET=your-sandbox-secret

# Production credentials (add when approved)
# PAYPAL_MODE=live
# PAYPAL_CLIENT_ID=your-live-client-id
# PAYPAL_CLIENT_SECRET=your-live-secret
```

### 4.2 Add to .env.local.example

```bash
# PayPal Payouts API
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
```

---

## Step 5: Test in Sandbox (Claude Code handles this)

Once credentials are set up, Claude Code will:
1. Install `@paypal/payouts-sdk` npm package
2. Create `/api/paypal-payout` endpoint
3. Update admin dashboard with "Pay" button
4. Add payment tracking to database
5. Test with sandbox PayPal accounts

---

## Sandbox Testing

### Test Accounts
PayPal provides test accounts automatically:
1. Go to: https://developer.paypal.com/dashboard/accounts
2. You'll see personal test accounts (buyers/recipients)
3. Use these emails to test payouts

### Test Flow
1. Admin approves receipt
2. Click "Pay via PayPal"
3. API sends payout to test email
4. Check test account to verify funds received
5. Verify payment ID stored in database

---

## Going Live (When Ready)

### 1. Apply for Production Access
1. Go to: https://developer.paypal.com/dashboard/
2. Switch to "Live" tab
3. Create production app (same as sandbox)
4. Request Payouts feature access
5. Wait for approval (1-3 days)

### 2. Submit Application Info
PayPal will ask:
- **Use case:** Consumer rebates for marketing campaign
- **Volume:** Estimated 100-500 payouts/month
- **Amount:** $5-10 per payout
- **Recipient verification:** Users provide their PayPal email

### 3. Update Environment Variables
```bash
PAYPAL_MODE=live
PAYPAL_CLIENT_ID=your-production-client-id
PAYPAL_CLIENT_SECRET=your-production-secret
```

### 4. Final Testing
- Test with real $1 payout to yourself
- Verify payout appears in your PayPal
- Check payment tracking works
- Monitor logs for errors

---

## Security Best Practices ✅

### Do's
- ✅ Store credentials in environment variables
- ✅ Never expose client secret in client-side code
- ✅ Use sandbox for all testing
- ✅ Validate amounts before sending
- ✅ Log all payout attempts
- ✅ Store PayPal transaction IDs

### Don'ts
- ❌ Never commit credentials to Git
- ❌ Don't skip sandbox testing
- ❌ Don't send payouts without admin approval
- ❌ Don't allow user input for amounts (security risk)
- ❌ Don't retry failed payouts automatically (fraud risk)

---

## Payment Flow

### Legacy Manual Payout Flow (Deprecated)
```
Admin reviews receipt →
  Admin opens peer-to-peer payment app →
    Admin manually sends payment →
      Admin marks as paid
```

### With PayPal Payouts (Automated)
```
Admin reviews receipt →
  Admin clicks "Pay via PayPal" →
    API sends payout automatically →
      PayPal processes (1-2 days) →
        User receives funds →
          Status auto-updated to 'paid'
```

---

## Error Handling

### Common Errors

**"Invalid email"**
- User didn't provide valid PayPal email
- Ask user to update email address

**"Insufficient funds"**
- Your PayPal account doesn't have enough balance
- Add funds to business account

**"Feature not enabled"**
- Payouts feature not approved yet
- Complete approval process

**"Daily limit exceeded"**
- Sandbox has daily limits (usually $500-1000)
- Use multiple test accounts or wait 24 hours

---

## Cost Calculator

### MVP Testing (Sandbox)
- **FREE** - No charges in sandbox

### Soft Launch (100 users)
- Payout: $5 × 100 = $500
- Fees: $0.25 × 100 = $25
- **Total: $525**

### Market Test (500 users)
- Payout: $5 × 500 = $2,500
- Fees: $0.25 × 500 = $125
- **Total: $2,625**

### Regional Launch (1000 users)
- Payout: $5 × 1000 = $5,000
- Fees: $0.25 × 1000 = $250
- **Total: $5,250**

**Much cheaper than peer-to-peer business fees!**

---

## API Limits

### Sandbox
- **Max per transaction:** $5,000
- **Daily limit:** Varies (usually $500-1,000 for new apps)
- **Monthly limit:** No hard limit in sandbox

### Production
- **Max per transaction:** $20,000
- **Daily limit:** Negotiated based on volume
- **Monthly limit:** Negotiated based on volume

For this campaign: $5-10 payouts are well within limits.

---

## Alternative: PayPal Email vs PayPal Account

Users can receive payouts via:
1. **Existing PayPal account** - Instant deposit
2. **Email without PayPal** - Email invite to claim funds
3. **Phone number** - SMS invite (in some regions)

**Recommendation:** Collect PayPal email or create PayPal account during receipt upload

---

## Monitoring & Analytics

Track these metrics:
- **Payout success rate** (target: 95%+)
- **Failed payout reasons**
- **Average payout time** (Standard: 1-2 days)
- **Transaction fees** (should be ~$0.25 each)
- **User claim rate** (% who claim PayPal payouts)

---

## Support & Resources

- **PayPal Payouts Docs:** https://developer.paypal.com/docs/payouts/
- **Node.js SDK:** https://github.com/paypal/Payouts-NodeJS-SDK
- **API Reference:** https://developer.paypal.com/api/payouts/v1/
- **Support:** https://developer.paypal.com/support/

---

## Troubleshooting

### "Client ID invalid"
**Solution:** Copy from correct app (Sandbox vs Live)

### "Payouts not enabled"
**Solution:** Enable in app settings → Features

### "Receiver email not found"
**Solution:** User needs to claim payout or create PayPal account

### "Rate limit exceeded"
**Solution:** Wait 1 minute between payouts or batch them

---

## Verification Checklist

Before proceeding, verify:
- [ ] PayPal Business account created
- [ ] Bank account linked and verified
- [ ] Developer app created in Sandbox
- [ ] Payouts feature enabled
- [ ] Client ID and Secret obtained
- [ ] Credentials added to .env.local
- [ ] Test accounts available in Developer Dashboard

---

## Next Steps

Once setup is complete, tell Claude Code:

> "PayPal Payouts is set up. Implement the integration."

Claude Code will:
1. ✅ Install `@paypal/payouts-sdk` package
2. ✅ Create `/api/paypal-payout` endpoint
3. ✅ Update admin dashboard "Pay" button
4. ✅ Add payment tracking to receipts table
5. ✅ Add error handling and logging
6. ✅ Test with sandbox accounts

---

## Production Launch Checklist

When ready to go live:
- [ ] PayPal production app approved
- [ ] Production credentials in .env.local
- [ ] Test with real $1 payout
- [ ] Monitor first 10 payouts closely
- [ ] Set up alerts for failed payouts
- [ ] Document payout reconciliation process
- [ ] Train admin on error handling

---

**Ready to automate your rebates and save $0.50+ per payout versus manual peer-to-peer apps!** 💰
