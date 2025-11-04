# Production Launch Checklist - "Burn That Ad"

This comprehensive guide walks you through launching the app to production, from buying a domain to configuring PayPal webhooks.

**Total Time Estimate:** 3-4 hours
**Difficulty:** Intermediate

---

## 📋 **Pre-Launch Requirements**

Before starting, ensure you have:

- [ ] PayPal Business account (verified)
- [ ] PayPal Payouts product access (approved for both Sandbox + Live)
- [ ] Vercel account with project deployed
- [ ] Supabase production database
- [ ] Google Vision API key with sufficient quota
- [ ] All code tested in staging/sandbox environment

---

## 🌐 **Step 1: Purchase & Configure Domain**

### **1.1 Purchase Domain**

**Recommended Registrars:**
- **Namecheap** - https://www.namecheap.com (cheapest)
- **Google Domains** - https://domains.google (easiest integration)
- **GoDaddy** - https://www.godaddy.com (most popular)
- **Cloudflare** - https://www.cloudflare.com/products/registrar (best privacy)

**Cost:** $10-15/year

**Steps:**
1. Go to registrar website
2. Search for your desired domain (e.g., `burnthatad.com`)
3. Add to cart
4. Complete purchase
5. **Important:** Disable auto-renewal if you want manual control

**Domain Suggestions:**
- `burnthatad.com` (primary)
- `keepersheart-promo.com`
- `whiskey-rebate.com`
- Use `.com` for best trust/recognition

---

### **1.2 Connect Domain to Vercel**

**Time:** 5-10 minutes

**Steps:**

1. **Go to Vercel Dashboard**
   - Navigate to: https://vercel.com/dashboard
   - Select your project ("burn-jameson")
   - Click **Settings** → **Domains**

2. **Add Domain**
   - Click **"Add"** button
   - Enter your domain: `burnthatad.com`
   - Click **"Add"**

3. **Configure DNS Records**

   Vercel will show you DNS records to add. You'll need:

   **For Root Domain (burnthatad.com):**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   TTL: 3600
   ```

   **For WWW Subdomain (www.burnthatad.com):**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: 3600
   ```

4. **Add DNS Records at Your Registrar**

   **For Namecheap:**
   - Go to Dashboard → Domain List → Manage
   - Click "Advanced DNS"
   - Click "Add New Record"
   - Add both A and CNAME records above
   - Save changes

   **For Google Domains:**
   - Go to DNS settings
   - Click "Manage custom records"
   - Add both records
   - Save

   **For GoDaddy:**
   - Go to My Products → Domains → DNS
   - Click "Add" under Records
   - Add both records
   - Save

5. **Wait for DNS Propagation**
   - Typically takes 10-30 minutes
   - Can take up to 48 hours (rare)
   - Check status at: https://dnschecker.org

6. **Verify in Vercel**
   - Return to Vercel Dashboard → Domains
   - You'll see "Valid Configuration" once DNS propagates
   - Vercel automatically provisions SSL certificate (free via Let's Encrypt)

---

### **1.3 Test Domain**

```bash
# Should return your app
curl https://burnthatad.com

# Should return 200 status
curl -I https://burnthatad.com

# Verify SSL certificate
curl -vI https://burnthatad.com 2>&1 | grep -i 'SSL certificate verify ok'
```

---

## 🔌 **Step 2: Set Up PayPal Webhooks (Live Environment)**

### **2.1 Switch from Sandbox to Live**

**Important:** You need to create a **NEW** webhook in the **Live** environment. Do NOT reuse the Sandbox webhook!

**Steps:**

1. **Go to PayPal Developer Dashboard**
   - Navigate to: https://developer.paypal.com/dashboard/

2. **Switch to Live Environment**
   - Click **"Apps & Credentials"**
   - Click **"Live"** tab (NOT Sandbox)
   - Scroll down to **"Webhooks"** section

---

### **2.2 Create Live Webhook**

**Time:** 5 minutes

**Steps:**

1. **Click "Add Webhook"**

2. **Enter Webhook URL**
   ```
   https://burnthatad.com/api/webhooks/paypal
   ```

   **Important:**
   - Must be HTTPS (not HTTP)
   - Must be your production domain
   - Path must be `/api/webhooks/paypal` exactly

3. **Select Event Types**

   Click "Event types" and select these **9 events**:

   **Expand "Payouts" category and check:**
   - ✅ Payment payout item succeeded
   - ✅ Payment payout item failed
   - ✅ Payment payout item blocked
   - ✅ Payment payout item canceled
   - ✅ Payment payout item denied
   - ✅ Payment payout item held
   - ✅ Payment payout item refunded
   - ✅ Payment payout item returned
   - ✅ Payment payout item unclaimed

   **Quick tip:** Search for "PAYOUTS-ITEM" to find them all

4. **Click "Save"**

5. **Copy Webhook ID**
   - PayPal will display a Webhook ID (e.g., `8PT597110X687430MWKJJKH`)
   - **Copy this ID** - you'll need it for environment variables

---

### **2.3 Verify Webhook Health**

```bash
# Test webhook endpoint
curl https://burnthatad.com/api/webhooks/paypal

# Expected response:
{
  "status": "ok",
  "message": "PayPal webhook endpoint is running",
  "environment": "live",
  "webhookConfigured": true
}
```

---

### **2.4 Test with PayPal Simulator**

**Steps:**

1. **Go to PayPal Dashboard → Webhooks**
2. **Click on your webhook**
3. **Click "Simulator" tab**
4. **Select event type:** "Payment payout item succeeded"
5. **Click "Send Test"**
6. **Check Vercel logs:**
   ```bash
   vercel logs --follow
   ```
7. **Look for:**
   ```
   📨 PAYPAL WEBHOOK RECEIVED
   Event Type: PAYMENT.PAYOUTS-ITEM.SUCCEEDED
   ✅ Webhook signature verified
   ```

---

## 🔐 **Step 3: Configure Production Environment Variables**

### **3.1 Get Live PayPal Credentials**

**Steps:**

1. **Go to PayPal Dashboard**
   - https://developer.paypal.com/dashboard/
   - Click "Apps & Credentials" → "Live" tab

2. **Create REST App (if not already created)**
   - Click "Create App"
   - App Name: "Burn That Ad - Production"
   - App Type: "Merchant"
   - Click "Create App"

3. **Get Credentials**
   - **Client ID:** Displayed on app page
   - **Secret:** Click "Show" to reveal
   - **Copy both** - you'll need them

---

### **3.2 Add Environment Variables to Vercel**

**Method A: Via Vercel Dashboard**

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Click **Settings** → **Environment Variables**
4. Add each variable below:

**Method B: Via Vercel CLI**

```bash
vercel env add VARIABLE_NAME production
```

---

### **3.3 Complete Environment Variables List**

**Copy each variable and add to Vercel:**

```env
# Site Configuration
NEXT_PUBLIC_SITE_URL=https://burnthatad.com

# Supabase (Production)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key

# Google Vision API
GOOGLE_VISION_API_KEY=your_google_vision_api_key

# Gemini API (Optional - for bottle morphing)
GEMINI_API_KEY=your_gemini_api_key

# PayPal Payouts (LIVE CREDENTIALS)
PAYPAL_CLIENT_ID=your_LIVE_client_id
PAYPAL_CLIENT_SECRET=your_LIVE_client_secret
PAYPAL_ENVIRONMENT=live
PAYPAL_WEBHOOK_ID=your_LIVE_webhook_id

# Admin Dashboard
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_production_password

# Fraud Prevention (ENABLE IN PRODUCTION)
NEXT_PUBLIC_ENABLE_RECEIPT_HASH_CHECK=true
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=true
PAYPAL_EMAIL_RATE_LIMIT_DAYS=30
```

**Critical Checklist:**
- [ ] `PAYPAL_ENVIRONMENT` is set to `live` (NOT sandbox)
- [ ] `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are LIVE credentials
- [ ] `PAYPAL_WEBHOOK_ID` is from the LIVE webhook
- [ ] Fraud prevention is ENABLED (true)
- [ ] Admin password is strong (not "admin123")

---

### **3.4 Redeploy Application**

After adding environment variables:

```bash
# Trigger redeployment
vercel --prod

# Or via dashboard: Deployments → Latest → Redeploy
```

**Verify:**
```bash
# Check environment is "live"
curl https://burnthatad.com/api/webhooks/paypal | jq '.environment'
# Should return: "live"
```

---

## 🗄️ **Step 4: Database Setup**

### **4.1 Run Migrations on Production Supabase**

**Steps:**

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your production project

2. **Run Migrations via SQL Editor**

   Navigate to: SQL Editor → New Query

   **Run in order:**

   **Migration 001:**
   ```bash
   # Copy contents of supabase/migrations/001_initial_schema.sql
   # Paste into SQL Editor
   # Click "Run"
   ```

   **Migration 002:**
   ```bash
   # Copy contents of supabase/migrations/002_bottle_scan_schema.sql
   # Paste and run
   ```

   **Migration 003:**
   ```bash
   # Copy contents of supabase/migrations/003_receipt_fraud_prevention.sql
   # Paste and run
   ```

   **Migration 004:**
   ```bash
   # Copy contents of supabase/migrations/004_paypal_column_rename.sql
   # Paste and run
   ```

3. **Verify Schema**

   Run this query to verify:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'receipts'
   AND column_name IN ('paypal_email', 'paypal_payout_id', 'auto_approved', 'confidence_score')
   ORDER BY column_name;
   ```

   **Expected output:**
   ```
   auto_approved     | boolean
   confidence_score  | numeric
   paypal_email      | text
   paypal_payout_id  | text
   ```

---

### **4.2 Create Storage Buckets**

**Steps:**

1. **Go to Storage → Buckets**
2. **Create two buckets:**

   **Bucket 1: bottle-images**
   - Name: `bottle-images`
   - Public: Yes
   - File size limit: 10MB
   - Allowed MIME types: image/jpeg, image/png, image/webp

   **Bucket 2: receipt-images**
   - Name: `receipt-images`
   - Public: Yes
   - File size limit: 10MB
   - Allowed MIME types: image/jpeg, image/png, image/webp

3. **Verify Buckets**
   ```bash
   # Test upload to bottle-images
   curl -X POST \
     'https://your-project.supabase.co/storage/v1/object/bottle-images/test.jpg' \
     -H 'Authorization: Bearer YOUR_ANON_KEY' \
     -F 'file=@test-image.jpg'
   ```

---

## ✅ **Step 5: Production Testing**

### **5.1 End-to-End Flow Test**

**Test as a real user:**

1. **Go to:** https://burnthatad.com
2. **Complete age gate**
3. **Scan competitor bottle** (use test image or real bottle)
4. **Watch burn animation**
5. **Upload receipt** with YOUR OWN PayPal email
6. **Enter valid PayPal email**
7. **Submit receipt**
8. **Check confirmation page** - should show "via PayPal in 1-2 days"

**Expected:**
- Session persists through all pages
- Images upload successfully
- Receipt stored in database with `pending` status

---

### **5.2 Admin Dashboard Test**

**Steps:**

1. **Go to:** https://burnthatad.com/admin
2. **Enter admin password**
3. **Verify receipt appears** in pending queue
4. **Check confidence score** displayed
5. **DO NOT APPROVE YET** - wait for $0.01 test

---

### **5.3 $0.01 Test Payout**

**Critical:** Test with small amount first!

**Steps:**

1. **Upload test receipt** with YOUR OWN PayPal email
2. **Admin dashboard:** Approve & Pay
3. **Amount:** Change to $0.01 (not $5)
4. **Click "Approve & Pay"**
5. **Check logs:**
   ```bash
   vercel logs --follow
   ```
6. **Look for:**
   ```
   ✅ PayPal payout sent successfully
   Payout ID: PAYOUT-XXXXXXXXXX
   ```

7. **Check PayPal Dashboard**
   - Go to: https://www.paypal.com/activity
   - Look for payout (may take 5-10 minutes to appear)
   - Status should be "Pending" or "Processing"

8. **Wait 1-2 days**
   - Check if $0.01 arrives in your account
   - Check webhook logs for SUCCESS event

**If $0.01 test succeeds:**
- ✅ PayPal integration is working
- ✅ Ready for real payouts

**If test fails:**
- Check PayPal dashboard for error message
- Verify LIVE credentials are correct
- Check webhook received FAILED event
- See Troubleshooting section below

---

### **5.4 Webhook Verification**

**Steps:**

1. **Check Webhook Delivery**
   - Go to: PayPal Dashboard → Webhooks → Your Webhook
   - Click "Recent Deliveries" tab
   - Look for successful deliveries (200 status)

2. **Verify Database Updated**
   ```sql
   SELECT id, status, paypal_payout_id, admin_notes
   FROM receipts
   WHERE paypal_email = 'your-email@example.com'
   ORDER BY uploaded_at DESC
   LIMIT 1;
   ```

   **Should show:**
   - `status`: 'paid'
   - `paypal_payout_id`: 'PAYOUT-XXXXXXXXXX'
   - `admin_notes`: Contains webhook log

3. **Test Failed Payout Scenario**
   - Upload receipt with invalid email: `fakeemail@invalid.domain`
   - Approve & pay
   - Wait for webhook FAILED event
   - Verify receipt status reset to 'approved'

---

## 🚀 **Step 6: Launch!**

### **6.1 Final Pre-Launch Checklist**

**Domain:**
- [ ] Domain resolves correctly (https://burnthatad.com)
- [ ] SSL certificate valid (green padlock in browser)
- [ ] WWW redirect works (www.burnthatad.com → burnthatad.com)

**PayPal:**
- [ ] Webhook configured in LIVE environment
- [ ] Webhook ID added to production env vars
- [ ] $0.01 test payout succeeded
- [ ] Webhook received SUCCESS event

**Environment Variables:**
- [ ] All variables added to Vercel
- [ ] `PAYPAL_ENVIRONMENT=live`
- [ ] Fraud prevention ENABLED
- [ ] Strong admin password

**Database:**
- [ ] All migrations run
- [ ] Storage buckets created
- [ ] Test receipt uploaded successfully

**Testing:**
- [ ] End-to-end flow works
- [ ] Admin dashboard accessible
- [ ] Receipt validation working
- [ ] Webhook logs visible

---

### **6.2 Soft Launch (Pilot Test)**

**Recommended:** Start with small controlled test

**Steps:**

1. **Invite 10-20 beta testers**
   - Friends, family, colleagues
   - Give them specific instructions
   - Ask for feedback

2. **Monitor First 20 Receipts**
   - Check auto-approval rate (target: 70%+)
   - Review manual review reasons
   - Verify all payouts process correctly

3. **Adjust Confidence Threshold if Needed**
   - If too many false positives → Increase to 85%
   - If too many manual reviews → Decrease to 75%
   - Edit: `/app/api/auto-approve-receipt/route.ts:47`

4. **Monitor Webhook Logs**
   - Check "Recent Deliveries" in PayPal dashboard
   - Verify 100% delivery rate
   - Investigate any failures

---

### **6.3 Full Launch**

**Once pilot test succeeds:**

1. **Update Marketing Materials**
   - Website: https://burnthatad.com
   - QR codes with domain
   - Print materials with URL

2. **Enable Analytics**
   ```bash
   npm install @vercel/analytics
   ```

   Add to `app/layout.tsx`:
   ```typescript
   import { Analytics } from '@vercel/analytics/react';

   export default function RootLayout({ children }) {
     return (
       <html>
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     );
   }
   ```

3. **Set Up Monitoring**
   - Vercel Analytics (automatic)
   - PayPal Dashboard (check daily)
   - Supabase Logs (check for errors)

4. **Launch Campaign!** 🎉

---

## 📊 **Step 7: Post-Launch Monitoring**

### **7.1 Daily Checks (First Week)**

**Every day for first 7 days:**

1. **Check Payout Success Rate**
   ```sql
   SELECT
     COUNT(*) as total_payouts,
     COUNT(CASE WHEN status = 'paid' THEN 1 END) as successful,
     COUNT(CASE WHEN status = 'approved' THEN 1 END) as pending_retry,
     ROUND(COUNT(CASE WHEN status = 'paid' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) as success_rate
   FROM receipts
   WHERE paypal_payout_id IS NOT NULL;
   ```

   **Target:** 95%+ success rate

2. **Check Auto-Approval Rate**
   ```sql
   SELECT
     COUNT(*) as total_receipts,
     COUNT(CASE WHEN auto_approved = true THEN 1 END) as auto_approved,
     ROUND(COUNT(CASE WHEN auto_approved = true THEN 1 END)::numeric / COUNT(*)::numeric * 100, 1) as auto_approval_rate
   FROM receipts;
   ```

   **Target:** 70-80% auto-approval rate

3. **Check Webhook Delivery**
   - Go to PayPal Dashboard → Webhooks → Recent Deliveries
   - **Target:** 100% successful (200 status)

4. **Check Manual Review Queue**
   - Go to: https://burnthatad.com/admin
   - **Target:** < 50 pending receipts

---

### **7.2 Weekly Checks**

**Every week:**

1. **Review Fraud Prevention Stats**
   - Duplicate receipts blocked
   - Rate limit hits
   - Image hash matches

2. **Check Average Confidence Scores**
   ```sql
   SELECT
     ROUND(AVG(confidence_score), 2) as avg_confidence,
     MIN(confidence_score) as min_confidence,
     MAX(confidence_score) as max_confidence
   FROM receipts
   WHERE confidence_score IS NOT NULL;
   ```

3. **Review Rejected Receipts**
   - Look for patterns
   - Adjust validation if needed

---

## 🔧 **Troubleshooting**

### **Issue: Domain not resolving**

**Check:**
```bash
nslookup burnthatad.com
dig burnthatad.com
```

**Fix:**
- Wait for DNS propagation (up to 48 hours)
- Verify DNS records at registrar
- Check Vercel domain status

---

### **Issue: Webhook not receiving events**

**Check:**
1. PayPal Dashboard → Recent Deliveries
2. Look for error messages
3. Verify webhook URL is HTTPS
4. Verify `PAYPAL_WEBHOOK_ID` is correct

**Fix:**
```bash
# Test webhook endpoint
curl https://burnthatad.com/api/webhooks/paypal

# Check environment
vercel env ls
```

---

### **Issue: PayPal payout failing**

**Check:**
1. PayPal Dashboard → Activity
2. Look for error message
3. Common errors:
   - Invalid email address
   - Receiver account restricted
   - Insufficient funds

**Fix:**
- Verify user entered correct email
- Check PayPal account balance
- Review PayPal's error code documentation

---

### **Issue: SSL certificate error**

**Check:**
```bash
curl -vI https://burnthatad.com 2>&1 | grep -i 'SSL'
```

**Fix:**
- Wait 5-10 minutes (Vercel auto-provisions)
- Verify domain is verified in Vercel
- Check DNS records are correct

---

## 📞 **Support Resources**

**PayPal:**
- Developer Support: https://developer.paypal.com/support/
- Webhook Docs: https://developer.paypal.com/api/rest/webhooks/

**Vercel:**
- Support: https://vercel.com/support
- Domain Docs: https://vercel.com/docs/concepts/projects/domains

**Supabase:**
- Support: https://supabase.com/support
- Docs: https://supabase.com/docs

---

## ✅ **Launch Complete!**

**Congratulations!** 🎉

Your app is now live at **https://burnthatad.com** with:
- ✅ Production domain configured
- ✅ PayPal webhooks receiving live events
- ✅ Auto-approval system active
- ✅ Fraud prevention enabled
- ✅ All systems monitored

**Next Steps:**
- Monitor metrics daily for first week
- Respond to user feedback
- Adjust confidence threshold as needed
- Scale PayPal account limits if needed

**Optional Enhancements:**
- **Animation Control:** Add URL parameter (`?animation=coal`) or admin UI toggle to switch between fire/coal animations without redeploying (currently requires env var change + server restart)

---

**Questions or issues?** See [PAYPAL_PRODUCTION_READY.md](PAYPAL_PRODUCTION_READY.md) for additional troubleshooting.
