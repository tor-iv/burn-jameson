# UX Flow - Screen-by-Screen Specification

**Goal:** Create the smoothest, fastest path from bottle scan to $5 payout

---

## Design Principles

1. **Mobile-first, thumb-optimized** - All primary actions in bottom 40% of screen
2. **Zero cognitive load** - One clear action per screen
3. **Instant feedback** - Show progress immediately, load in background
4. **Forgiving errors** - Always provide fallback options
5. **Fast defaults** - Pre-fill everything possible, minimize typing

---

## Screen 1: Landing Page (`/`)

### First Visit
**Layout:**
```
┌─────────────────────────┐
│                         │
│   [Keeper's Heart Logo] │
│                         │
│    BURN THAT AD         │
│    Get $5 Back          │
│                         │
│    Scan competitor      │
│    whiskey, buy ours,   │
│    get cash back        │
│                         │
│  ┌───────────────────┐  │
│  │  I'm 21+ Let's Go │  │ <- Big amber button
│  └───────────────────┘  │
│                         │
│   Terms • Privacy       │
└─────────────────────────┘
```

**Behavior:**
- Check `localStorage.getItem('kh_age_verified')`
- If verified, redirect to `/intro` (or `/scan` if `kh_seen_intro` exists)
- Button click → Show age gate modal overlay
- After age verification → Set localStorage → Redirect to `/intro`

**Copy:**
- Headline: "Burn That Ad" (Playfair Display, 48px)
- Subhead: "Get $5 Back" (32px, amber color)
- Body: "Scan competitor whiskey, buy ours, get cash back" (18px)

---

## Screen 2: Age Gate Modal

**Layout:**
```
┌─────────────────────────┐
│  ╔═══════════════════╗  │
│  ║                   ║  │
│  ║  [KH Logo]        ║  │
│  ║                   ║  │
│  ║  Are you 21+?     ║  │
│  ║                   ║  │
│  ║  ┌─────┐ ┌─────┐  ║  │
│  ║  │ Yes │ │ No  │  ║  │
│  ║  └─────┘ └─────┘  ║  │
│  ║                   ║  │
│  ╚═══════════════════╝  │
└─────────────────────────┘
```

**Behavior:**
- Modal overlay with backdrop blur
- "Yes" → `localStorage.setItem('kh_age_verified', Date.now())` → Close modal → Continue
- "No" → Show "Sorry, must be 21+" → Redirect to keepersheart.com

---

## Screen 3: Campaign Intro (`/intro`)

**Layout:**
```
┌─────────────────────────┐
│                         │
│   How It Works          │
│                         │
│   ① 📸 Scan             │
│   Point camera at       │
│   Jameson bottle        │
│                         │
│   ② 🛒 Buy              │
│   Purchase Keeper's     │
│   Heart whiskey         │
│                         │
│   ③ 💰 Get $5           │
│   Upload receipt,       │
│   get instant rebate    │
│                         │
│  ┌───────────────────┐  │
│  │  Start Scanning   │  │ <- Big amber button
│  └───────────────────┘  │
│                         │
│  Skip intro next time   │ <- Small checkbox
└─────────────────────────┘
```

**Behavior:**
- Show on first visit only (unless checkbox unchecked)
- "Skip intro" checkbox → `localStorage.setItem('kh_seen_intro', 'true')`
- "Start Scanning" → Navigate to `/scan`
- Preload camera permissions in background while user reads

**Copy:**
- Use friendly, casual tone
- Emphasize "$5" and "instant"

---

## Screen 4: Camera Scanning (`/scan`)

**Layout:**
```
┌─────────────────────────┐
│ [×]              [Info] │ <- Top bar overlay
│                         │
│                         │
│        ╔═══════╗        │ <- Detection frame overlay
│        ║       ║        │    (pulsing border)
│        ║ VIDEO ║        │
│        ║ FEED  ║        │
│        ║       ║        │
│        ╚═══════╝        │
│                         │
│   Point at Jameson      │ <- Instruction text
│   bottle label          │
│                         │
│  ┌───────────────────┐  │
│  │ Having trouble?   │  │ <- Appears after 10s
│  │ Upload photo      │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

**Behavior:**
- Request camera immediately: `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })`
- Show loading spinner during camera initialization
- Capture frame every 2 seconds → Send to `/api/detect-bottle`
- Pulsing border animation during processing
- Show confidence meter: "Scanning... 45%... 78%..."
- When confidence > 75%:
  1. Generate session ID
  2. Capture final frame → Upload to Supabase Storage
  3. Insert into `bottle_scans` table
  4. Navigate to `/scanning/[sessionId]` (burn animation)
- If camera denied → Show "Upload photo instead" button immediately
- "Having trouble?" button appears after 10 seconds → Manual override

**Visual Feedback:**
```typescript
// Real-time confidence display
<div className="absolute top-24 left-0 right-0 text-center">
  <p className="text-white text-lg font-semibold">
    {confidence < 30 && "Looking for bottle..."}
    {confidence >= 30 && confidence < 75 && `Scanning... ${Math.round(confidence)}%`}
    {confidence >= 75 && "✓ Jameson detected!"}
  </p>
</div>
```

**Error States:**
- Camera blocked → "Tap 'Allow' to use camera" + "Upload photo" button
- ML API error → "Try better lighting" + retry button
- No detection after 15s → Show manual override button

---

## Screen 5: Burn Animation (`/scanning/[sessionId]`)

**Layout:**
```
┌─────────────────────────┐
│                         │
│                         │
│   [Bottle Image with    │
│    Fire/Burn Overlay    │
│    Animation Playing]   │
│                         │
│                         │
│   Burning that ad...    │ <- Animated text
│                         │
│                         │
└─────────────────────────┘
```

**Behavior:**
- Show captured bottle image
- Overlay burn animation (Framer Motion + CSS filters)
- Animation duration: 2.5 seconds
- **Haptic feedback:** `navigator.vibrate([100, 50, 100])`
- Auto-navigate to `/success/[sessionId]` when complete
- Preload next screen during animation

**Animation Details:**
```typescript
// Fire overlay with CSS filters
<motion.div
  initial={{ opacity: 0, scale: 1.2 }}
  animate={{ opacity: [0, 1, 1, 0], scale: [1.2, 1, 1, 0.8] }}
  transition={{ duration: 2.5 }}
  style={{
    background: 'linear-gradient(to top, #ff6b00, #ff0000)',
    mixBlendMode: 'screen',
    filter: 'blur(20px)'
  }}
/>
```

---

## Screen 6: Success - Buy Keeper's Heart (`/success/[sessionId]`)

**Layout:**
```
┌─────────────────────────┐
│                         │
│   Nice! ✓               │
│                         │
│   [Keeper's Heart       │
│    Bottle Image]        │
│                         │
│   Now buy Keeper's      │
│   Heart whiskey and     │
│   get your $5 back      │
│                         │
│   Find it at your       │
│   local liquor store    │
│                         │
│  ┌───────────────────┐  │
│  │ I bought it!      │  │ <- Primary button
│  │ Upload receipt    │  │
│  └───────────────────┘  │
│                         │
│  I'll upload later      │ <- Small text link
└─────────────────────────┘
```

**Behavior:**
- Verify `session_id` exists in database
- Show Keeper's Heart bottle hero image
- "Upload receipt" → Navigate to `/upload/[sessionId]`
- "I'll upload later" → Show "Save this link" with shareable URL
- Send reminder: Copy session URL to clipboard

**Copy:**
- Congratulatory tone
- Clear call-to-action
- Mention "$5" again

---

## Screen 7: Receipt Upload (`/upload/[sessionId]`)

**Layout:**
```
┌─────────────────────────┐
│                         │
│   Upload Your Receipt   │
│                         │
│   Must show Keeper's    │
│   Heart purchase        │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │   [Camera Icon]   │  │ <- Tap to capture
│  │   Tap to photo    │  │
│  │                   │  │
│  └───────────────────┘  │
│                         │
│   Your PayPal Email     │
│  ┌───────────────────┐  │
│  │ user@email.com    │  │ <- Auto-focused input
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ Submit & Get $5   │  │ <- Disabled until both filled
│  └───────────────────┘  │
└─────────────────────────┘
```

**Behavior:**
- Load saved PayPal email from localStorage if exists
- Receipt upload:
  - Option 1: Camera capture (default)
  - Option 2: File picker (fallback)
  - Show thumbnail preview after capture
- PayPal email input:
  - Auto-focus cursor
  - Validate format: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
  - Save to localStorage on blur
- Submit button enabled only when both fields filled
- On submit:
  1. Upload receipt image to Supabase Storage
  2. Insert into `receipts` table with session_id
  3. Show loading spinner: "Submitting..."
  4. Navigate to `/confirmation/[sessionId]`

**Validation:**
```typescript
const validatePayPalEmail = (email: string) => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: "Enter a valid PayPal email address" }
  }
  return { valid: true, email }
}
```

**UX Optimizations:**
- Start uploading receipt in background while user types email
- Show file size limit: "Max 10MB"
- Compress image before upload (reduce to 1200px width)

---

## Screen 8: Confirmation (`/confirmation/[sessionId]`)

**Layout:**
```
┌─────────────────────────┐
│                         │
│   All Set! 🎉           │
│                         │
│   Your receipt is       │
│   being reviewed        │
│                         │
│   You'll receive $5     │
│   via PayPal within     │
│   24 hours              │
│                         │
│   ┌─────────────────┐   │
│   │  $5 Pending     │   │ <- Animated shimmer
│   │  to user@email  │   │
│   └─────────────────┘   │
│                         │
│  ┌───────────────────┐  │
│  │ Done              │  │
│  └───────────────────┘  │
│                         │
│  Scan another bottle    │ <- Small link
└─────────────────────────┘
```

**Behavior:**
- Show success animation (confetti)
- Display user's PayPal email
- "Done" → Navigate to `/` (or close if in standalone PWA)
- "Scan another bottle" → Navigate to `/scan`
- Send confirmation SMS (optional): "Thanks! Your $5 rebate is being processed."

**Copy:**
- Reassuring tone
- Clear timeline expectations
- Encourage repeat usage

---

## Screen 9: Admin Dashboard (`/admin`)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Burn That Ad - Admin                     [Logout]│
│                                                   │
│ [Pending (12)] [Approved (45)] [Rejected (3)]    │
│                                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ Session: kh-1234567890                      │ │
│ │ Date: Oct 10, 2025 3:45 PM                  │ │
│ │                                             │ │
│ │ ┌─────────────┐    ┌─────────────┐         │ │
│ │ │   Bottle    │    │   Receipt   │         │ │
│ │ │   (Jameson) │    │ (Keeper's)  │         │ │
│ │ │  conf: 0.89 │    │             │         │ │
│ │ └─────────────┘    └─────────────┘         │ │
│ │                                             │ │
│ │ PayPal: user@email.com                      │ │
│ │ Amount: $5.00                               │ │
│ │                                             │ │
│ │ [✓ Approve & Pay]  [✗ Reject]              │ │
│ │                                             │ │
│ │ Notes: ___________________________         │ │
│ └─────────────────────────────────────────────┘ │
│                                                   │
│ Keyboard: A = Approve, R = Reject, → = Next      │
└─────────────────────────────────────────────────┘
```

**Behavior:**
- Require admin authentication (Supabase Auth)
- Show pending receipts first (newest first)
- Side-by-side image comparison (bottle vs receipt)
- Display session metadata: timestamp, confidence score, PayPal email
- Approve flow:
  1. Click "Approve & Pay"
  2. Show loading: "Sending PayPal payout..."
  3. Call Supabase Edge Function → PayPal Payouts API
  4. Update `receipts.status = 'paid'` and `paid_at = now()`
  5. Store `paypal_payout_id`
  6. Show success: "Paid $5 via PayPal"
  7. Move to next pending receipt
- Reject flow:
  1. Click "Reject"
  2. Require notes (reason)
  3. Update `receipts.status = 'rejected'`
  4. Optionally send notification to user
- Keyboard shortcuts for speed:
  - `A` = Approve
  - `R` = Reject
  - `→` = Next
  - `←` = Previous

**Fraud Detection Flags:**
- Same receipt image uploaded multiple times (image hash)
- Same PayPal email > 3 times in 30 days
- Session_id mismatch (bottle + receipt from different sessions)
- Confidence score < 70% (flag for review)

---

## Error & Edge Cases

### Camera Permission Denied
**Screen:** `/scan`
```
┌─────────────────────────┐
│                         │
│   📷 Camera Needed      │
│                         │
│   To scan bottles,      │
│   allow camera access   │
│                         │
│  ┌───────────────────┐  │
│  │ Open Settings     │  │
│  └───────────────────┘  │
│                         │
│  Or upload a photo:     │
│  ┌───────────────────┐  │
│  │ Choose File       │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

### Bottle Not Detected (Manual Override)
**Screen:** `/scan` after 10 seconds
```
Having trouble?
[✓] I have a Jameson bottle in front of me
[Continue] → Skip to burn animation
```

### Session Expired
**Screen:** `/upload/[invalid-session]`
```
┌─────────────────────────┐
│                         │
│   Oops! Session expired │
│                         │
│   Please scan a new     │
│   bottle to continue    │
│                         │
│  ┌───────────────────┐  │
│  │ Start Over        │  │
│  └───────────────────┘  │
└─────────────────────────┘
```

### PayPal Payout Failed
**Admin sees:**
```
❌ Payment failed: Invalid PayPal email
[Retry] [Reject]
```

---

## Performance Optimizations

### Preloading Strategy
```typescript
// On intro screen, preload camera
useEffect(() => {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => stream.getTracks().forEach(t => t.stop()))
}, [])

// During burn animation, prefetch next screen
router.prefetch(`/success/${sessionId}`)

// During receipt upload, start uploading immediately
const uploadPromise = uploadReceipt(file) // Don't await
// User enters PayPal email while upload happens
await uploadPromise // Wait before submit
```

### Image Compression
```typescript
// Compress before upload (reduce bandwidth)
const compressImage = (file: File, maxWidth = 1200) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = new Image()

  return new Promise((resolve) => {
    img.onload = () => {
      const scale = maxWidth / img.width
      canvas.width = maxWidth
      canvas.height = img.height * scale
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    }
    img.src = URL.createObjectURL(file)
  })
}
```

### Offline Support
```typescript
// Service Worker caches app shell
// Queue receipt uploads when offline
if (!navigator.onLine) {
  localStorage.setItem('pending_upload', JSON.stringify({
    sessionId,
    receipt: base64Image,
    paypalEmail
  }))
  // Show: "You're offline. We'll upload when connected."
}
```

---

## Mobile Interactions

### Touch Targets
- All buttons: Minimum 44px × 44px
- Primary actions: 56px height (easy thumb reach)
- Bottom sheet style for forms (thumb-friendly)

### Haptic Feedback
```typescript
// On successful bottle detection
navigator.vibrate(200)

// On error
navigator.vibrate([100, 50, 100])

// On payment confirmation
navigator.vibrate([100, 50, 100, 50, 200])
```

### Pull-to-Refresh
- Disable on camera screen (prevents accidental refresh)
```css
.camera-view {
  overscroll-behavior: contain;
}
```

---

## Copy Guidelines

**Tone:** Friendly, casual, confident
**Voice:** Second person ("You'll receive $5")
**Style:** Short sentences, action-oriented

**Good:**
- "Get $5 back"
- "Point at Jameson bottle"
- "Boom! $5 is yours"

**Bad:**
- "Receive a monetary rebate"
- "Please align the camera viewfinder"
- "Your payment will be processed"

---

## Tracking Events (for later)

```typescript
// Track key moments
analytics.track('Age Verified')
analytics.track('Bottle Detected', { brand, confidence })
analytics.track('Receipt Uploaded', { sessionId })
analytics.track('Payment Sent', { amount: 5, paypalEmail })

// Track drop-off points
analytics.track('Camera Permission Denied')
analytics.track('Bottle Detection Failed')
analytics.track('Receipt Upload Abandoned')
```

---

## Next Steps

1. Build prototype screens in Figma (optional)
2. Set up Next.js routes for each screen
3. Implement camera component first (highest risk)
4. Test on real iOS/Android devices ASAP
5. Get real Jameson bottles for ML training

**Priority:** Get camera → ML detection → burn animation working first. Everything else can use placeholders.
