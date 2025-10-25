# Receipt Test Mode - Quick Reference

## Overview
Receipt test mode is a password-protected debug feature that allows rapid PayPal API testing by creating mock receipts directly in the admin dashboard, bypassing the need to scan bottles and upload receipts.

## How to Enable Test Mode

### Step 1: Access Admin Dashboard
1. Navigate to [/admin](http://localhost:3000/admin)
2. Enter your admin password

### Step 2: Enable Test Mode
1. **Double-click** on the "Admin Dashboard" title
2. A password prompt will appear
3. Enter password: **`bob`**
4. Test mode is now active (stored in sessionStorage)

## Visual Indicators

When test mode is enabled, you'll see:

1. **Orange banner** at top saying "🧪 TEST MODE ACTIVE"
   - Click the ✕ button to disable test mode

2. **Orange "Create Test Receipt" button** in the header
   - Only visible when test mode is active
   - Click to instantly create a test receipt

3. **Test receipt badges** on mock receipts:
   - Orange border: "🧪 TEST RECEIPT - For PayPal API testing only"
   - Session ID starts with `kh-test-`

## How Test Mode Works

### Normal Flow (Test Mode OFF)
```
User Flow: Age Gate → Scan Bottle → Upload Receipt → Admin Approval → PayPal Payout
```

### Test Mode Flow (Test Mode ON)
```
Admin Flow: Enable Test Mode → Click "Create Test Receipt" → Instant Mock Receipt → Approve & Pay → Real PayPal API Call
```

## Mock Receipt Data

When you create a test receipt, the following data is automatically generated:

**Bottle Scan:**
- Session ID: `kh-test-{timestamp}-{uuid}`
- Brand: "Test Mode - Jameson"
- Confidence: 100%
- Image: Placeholder image
- Status: `completed`

**Receipt:**
- Session ID: (same as bottle scan)
- PayPal Email: `test-receipt@paypal.com`
- Amount: $5.00 (or uses `TEST_PAYOUT_AMOUNT` if set in ENV)
- Image: Placeholder image
- Status: `pending`

## Use Cases

### ✅ What Receipt Test Mode is For:
- **Testing PayPal Payouts API** without scanning bottles
- **Quick integration testing** of the payment flow
- **Verifying PayPal credentials** (sandbox or live)
- **Testing with minimal cost** (use `TEST_PAYOUT_AMOUNT=0.01`)
- **Demo purposes** for stakeholders

### ❌ What Receipt Test Mode is NOT For:
- Production use (it's a debug feature)
- Testing bottle detection (use bottle test mode instead)
- Testing receipt OCR validation

## Example Usage Workflow

### Testing with Sandbox (FREE)

```bash
# In .env.local
PAYPAL_ENVIRONMENT=sandbox
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_secret
```

**Steps:**
1. Go to `/admin`
2. Double-click "Admin Dashboard" title
3. Enter password: `bob`
4. Click "🧪 Create Test Receipt"
5. Receipt appears in pending list instantly
6. Click "Approve & Pay"
7. PayPal sandbox processes $5.00 payout
8. Check sandbox at https://www.sandbox.paypal.com

### Testing with Live + Penny Payouts (Costs $0.01-0.02)

```bash
# In .env.local
PAYPAL_ENVIRONMENT=live
PAYPAL_CLIENT_ID=your_live_client_id
PAYPAL_CLIENT_SECRET=your_live_secret
TEST_PAYOUT_AMOUNT=0.01  # Override default $5.00
```

**Steps:**
1. Go to `/admin`
2. Double-click "Admin Dashboard" title
3. Enter password: `bob`
4. Click "🧪 Create Test Receipt"
5. Click "Approve & Pay"
6. PayPal sends $0.01 to `test-receipt@paypal.com`
7. **Cost: ~$0.01-0.02 per test** (payout + PayPal fee)

## Disable Test Mode

### Option 1: Click the ✕ Button
- Click the ✕ on the orange test mode banner

### Option 2: Double-Click Title Again
- Double-click "Admin Dashboard" title
- Click OK when prompted to disable

### Option 3: Clear Session Storage
```javascript
sessionStorage.removeItem('kh_test_mode');
```

### Option 4: Close Browser Tab
- Test mode is stored in sessionStorage (not localStorage)
- Automatically cleared when tab/window is closed

## Technical Implementation

### Files Modified:
1. **[lib/test-mode.ts](lib/test-mode.ts)** - Added mock receipt functions
   - `generateTestSessionId()` - Creates unique test session IDs
   - `getMockReceiptData()` - Returns complete mock receipt + bottle scan data

2. **[app/admin/page.tsx](app/admin/page.tsx)** - Admin UI enhancements
   - Double-click handler on title for test mode toggle
   - "Create Test Receipt" button (visible when test mode active)
   - Visual indicators for test receipts
   - Database insertion logic for mock data

### Session Storage:
- Key: `kh_test_mode`
- Value: `'true'` (when enabled)
- Cleared when test mode is disabled
- Persists across page navigation within the same session

### Database Records:
Test receipts create real database entries:
- `bottle_scans` table: Mock bottle scan with test session ID
- `receipts` table: Mock receipt with `pending` status

These records are **functionally identical** to real receipts, allowing you to test the complete PayPal payout flow.

## Combining with PayPal Test Amount

Test mode works great with the `TEST_PAYOUT_AMOUNT` environment variable:

```bash
# .env.local
TEST_PAYOUT_AMOUNT=0.01  # Send $0.01 instead of $5.00
```

**Result:**
- Test receipts created with test mode will use the test amount
- Admin sees: "Amount: $0.01" instead of "$5.00"
- PayPal payout sends $0.01 to the test email
- **Perfect for cheap live testing!**

## Fraud Prevention

Test receipts:
- ✅ **Bypass bottle scanning** (no camera needed)
- ✅ **Bypass receipt upload** (no photo needed)
- ✅ **Still trigger real PayPal API** (full integration test)
- ✅ **Use unique session IDs** (no conflicts with real sessions)
- ✅ **Are clearly marked** (session ID starts with `kh-test-`)
- ⚠️ **Count toward rate limits** (IP/email limits still apply)

If you want to disable rate limiting for testing:
```bash
# .env.local
ENABLE_PAYPAL_EMAIL_RATE_LIMIT=false  # Allow unlimited payouts per email
```

## Notes

- **No bottle scanning required** - Skip the entire user flow
- **No receipt upload required** - Skip photo validation
- **Real PayPal API calls** - Tests actual integration
- **Instant creation** - One click to generate test data
- **Visible in admin list** - Appears alongside real receipts
- **Password same as bottle test mode** - Uses same password (`bob`)
- **Session storage only** - Cleared on tab close

## Security

- Password is simple ("bob") because this is a **development/debug feature**
- Should not be used in production with real money (remove before launch if desired)
- sessionStorage only (cleared on tab close)
- Test receipts are clearly marked with `kh-test-` prefix

## Comparison: Bottle Test Mode vs Receipt Test Mode

| Feature | Bottle Test Mode | Receipt Test Mode |
|---------|------------------|-------------------|
| **Purpose** | Test morph animation | Test PayPal payouts |
| **Where to enable** | Intro page (triple-click title) | Admin page (double-click title) |
| **What it bypasses** | Bottle detection API | Entire user flow (scan + upload) |
| **What it creates** | Mock detection response | Mock receipt + bottle scan in DB |
| **API calls made** | None (client-side mock) | Real PayPal Payouts API |
| **Cost** | Free | Depends on ENV (sandbox=free, live=costs money) |
| **Use case** | Animation testing | Payment integration testing |

## Troubleshooting

**Test mode button not showing:**
- Make sure you've enabled test mode (double-click title, enter password)
- Refresh the page if needed

**Test receipt creation fails:**
- Check Supabase credentials in `.env.local`
- Verify database schema is up to date
- Check browser console for errors

**PayPal payout fails on test receipt:**
- Verify `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are correct
- Check `PAYPAL_ENVIRONMENT` is set correctly
- For sandbox: Use test accounts from https://developer.paypal.com/dashboard/accounts
- For live: Make sure credentials are from the "Live" tab, not "Sandbox"

**Test receipts show $5.00 instead of $0.01:**
- Make sure `TEST_PAYOUT_AMOUNT=0.01` is set in `.env.local`
- Restart dev server: `npm run dev`

## Related Documentation

- [TEST_MODE.md](TEST_MODE.md) - Bottle test mode documentation
- [PAYPAL_QUICK_START.md](PAYPAL_QUICK_START.md) - PayPal setup guide
- [FRAUD_PREVENTION_SUMMARY.md](FRAUD_PREVENTION_SUMMARY.md) - Fraud prevention features
