# PayPal Webhook Setup Guide

This guide explains how to configure PayPal webhooks to automatically track payout status updates.

## Why Webhooks?

PayPal webhooks automatically notify your application when payout status changes (succeeded, failed, blocked, etc.). Without webhooks, you'd need to manually check the PayPal dashboard for each payout status.

---

## Prerequisites

- PayPal Business account with Payouts enabled
- Application deployed to production (webhooks require HTTPS)
- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` configured

---

## Step 1: Get Your Webhook URL

Your webhook endpoint is:
```
https://yourdomain.com/api/webhooks/paypal
```

**Development/Testing:**
- For local testing, use a tool like [ngrok](https://ngrok.com/) to expose localhost
- Example: `https://abc123.ngrok.io/api/webhooks/paypal`

---

## Step 2: Create Webhook in PayPal Dashboard

### Sandbox Environment (Testing)

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Click "Apps & Credentials" → "Sandbox" tab
3. Scroll down to "Webhooks"
4. Click "Add Webhook"

### Live Environment (Production)

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Click "Apps & Credentials" → "Live" tab
3. Scroll down to "Webhooks"
4. Click "Add Webhook"

---

## Step 3: Configure Webhook

**Webhook URL:**
```
https://yourdomain.com/api/webhooks/paypal
```

**Event Types to Subscribe:**

Select all `PAYMENT.PAYOUTS-ITEM.*` events:
- ✅ `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` - Payout completed successfully
- ✅ `PAYMENT.PAYOUTS-ITEM.FAILED` - Payout failed
- ✅ `PAYMENT.PAYOUTS-ITEM.BLOCKED` - Payout blocked by PayPal
- ✅ `PAYMENT.PAYOUTS-ITEM.CANCELED` - Payout canceled
- ✅ `PAYMENT.PAYOUTS-ITEM.DENIED` - Payout denied
- ✅ `PAYMENT.PAYOUTS-ITEM.HELD` - Payout held for review
- ✅ `PAYMENT.PAYOUTS-ITEM.REFUNDED` - Payout refunded
- ✅ `PAYMENT.PAYOUTS-ITEM.RETURNED` - Payout returned/unclaimed
- ✅ `PAYMENT.PAYOUTS-ITEM.UNCLAIMED` - Payout unclaimed by recipient

**Why these events?** Your app needs to know when:
- ✅ Payouts succeed (log success)
- ❌ Payouts fail (reset status for retry)
- ⏳ Payouts are pending (user didn't claim it yet)

Click **"Save"**

---

## Step 4: Copy Webhook ID

After creating the webhook, PayPal will show you a **Webhook ID** (looks like: `8PT597110X687430MWKJJKH`)

Copy this ID - you'll need it in the next step.

---

## Step 5: Add Webhook ID to Environment Variables

### Local Development (.env.local)

```env
PAYPAL_WEBHOOK_ID=8PT597110X687430MWKJJKH
```

### Production (Vercel/Hosting Platform)

Add to your hosting platform's environment variables:
```env
PAYPAL_WEBHOOK_ID=8PT597110X687430MWKJJKH
```

**Important:** Use different Webhook IDs for Sandbox vs Live environments!

---

## Step 6: Test Webhook

### Test in PayPal Dashboard

1. Go to your webhook in PayPal dashboard
2. Click "Simulator"
3. Select event type: `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`
4. Click "Send Test"
5. Check your application logs

### Test with Real Payout

1. Create a $0.01 payout to your own PayPal email
2. Check your application logs for webhook events
3. Verify receipt status updates in your database

### Verify Webhook is Working

Check the endpoint health:
```bash
curl https://yourdomain.com/api/webhooks/paypal
```

Should return:
```json
{
  "status": "ok",
  "message": "PayPal webhook endpoint is running",
  "environment": "sandbox",
  "webhookConfigured": true
}
```

---

## Webhook Behavior

### What Happens When Webhook Receives Event?

1. **Signature Verification** - Ensures request is from PayPal (not spoofed)
2. **Event Processing** - Updates receipt status in database
3. **Logging** - Records event in `admin_notes` field

### Automatic Status Updates

| PayPal Event | Receipt Action |
|-------------|---------------|
| `SUCCEEDED` | ✅ Logs success, keeps status as `paid` |
| `FAILED` | ❌ Resets to `approved`, clears payout ID (allows retry) |
| `BLOCKED` | 🚫 Resets to `approved` (admin can investigate) |
| `DENIED` | 🚫 Resets to `approved` (admin can investigate) |
| `CANCELED` | ↩️ Resets to `approved` (admin can retry) |
| `RETURNED` | ↩️ Resets to `approved` (user didn't claim) |
| `HELD` | ⏳ Logs pending status, keeps as `paid` |
| `UNCLAIMED` | ⏳ Logs unclaimed status, keeps as `paid` |

---

## Troubleshooting

### Webhook Not Receiving Events

**Check 1: Webhook URL is HTTPS**
- Webhooks require HTTPS (not HTTP)
- Use ngrok for local testing

**Check 2: Webhook ID is Correct**
```bash
# Check if webhook ID is set
echo $PAYPAL_WEBHOOK_ID
```

**Check 3: Check PayPal Dashboard**
- Go to Webhooks → Click your webhook
- Check "Recent Deliveries" tab
- Look for failed attempts and error messages

### Signature Verification Failing

**Cause:** Wrong `PAYPAL_WEBHOOK_ID` or credentials

**Fix:**
1. Verify `PAYPAL_WEBHOOK_ID` matches dashboard
2. Verify `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are correct
3. Check you're using correct environment (sandbox vs live)

### Events Not Updating Database

**Check 1: Database Connection**
- Verify Supabase credentials are correct
- Check database logs

**Check 2: Receipt Lookup**
- Webhook looks up receipt by `paypal_payout_id`
- Verify payout ID was saved correctly

---

## Security Best Practices

1. **Always Verify Signatures**
   - Never skip webhook signature verification in production
   - Our endpoint automatically verifies all webhooks

2. **Use HTTPS Only**
   - PayPal requires HTTPS for webhooks
   - Never use HTTP in production

3. **Monitor Webhook Logs**
   - Regularly check webhook delivery logs in PayPal dashboard
   - Set up alerts for repeated failures

4. **Keep Webhook ID Secret**
   - Don't commit `PAYPAL_WEBHOOK_ID` to git
   - Store in environment variables only

---

## Disabling Webhooks (For Testing)

To test without webhooks:

1. Set `PAYPAL_WEBHOOK_ID` to empty string:
   ```env
   PAYPAL_WEBHOOK_ID=
   ```

2. Signature verification will be skipped in sandbox mode

3. Re-enable for production!

---

## Next Steps

- ✅ Webhook configured and tested
- ⏭️ Deploy to production
- ⏭️ Monitor first real payouts
- ⏭️ Set up alerts for webhook failures

---

**Need Help?**
- [PayPal Webhooks Documentation](https://developer.paypal.com/api/rest/webhooks/)
- [PayPal Webhook Events Reference](https://developer.paypal.com/api/rest/webhooks/event-names/)
