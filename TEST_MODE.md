# Test Mode - Quick Reference

## Overview
Test mode is a password-protected debug feature that bypasses bottle detection, allowing you to test the Keeper's Heart morph animation with any photo (including hands, tables, etc.).

## How to Enable Test Mode

### Step 1: Access Password Prompt
1. Navigate to the intro page ([/intro](http://localhost:3000/intro))
2. **Triple-click** on the "How It Works" title
3. A password modal will appear

### Step 2: Enter Password
- Password: **`bob`**
- Click "Enable" or press Enter
- Test mode is now active (stored in sessionStorage)

## Visual Indicators

When test mode is enabled, you'll see:

1. **Orange badge** in top-right corner saying "TEST MODE"
   - Click the ✕ to disable test mode

2. **Scan page indicators:**
   - Orange pulsing border (instead of green/yellow)
   - Top badge: "🧪 TEST MODE - ANY PHOTO WILL WORK"
   - Confidence meter: "🧪 Test Mode - Take any photo"
   - Instructions: "Take a photo of anything (hand, table, etc.)"

## How Test Mode Works

### Normal Flow (Test Mode OFF)
```
Camera → Real Bottle Detection API → Check Confidence (>75%) → Proceed to Animation
```

### Test Mode Flow (Test Mode ON)
```
Camera → Mock Detection Response (100% confidence) → Skip API Call → Proceed to Animation
```

## Mock Detection Response

When test mode is active, the following mock data is used:

```javascript
{
  detected: true,
  brand: 'Test Mode - Keeper\'s Heart',
  confidence: 1.0,
  boundingBox: { centered, bottle-shaped },
  normalizedBoundingBox: { x: 0.3, y: 0.15, width: 0.4, height: 0.7 },
  expandedBoundingBox: { x: 0.25, y: 0.10, width: 0.5, height: 0.8 },
  aspectRatio: 1.75 // Typical bottle ratio
}
```

## Use Cases

### ✅ What Test Mode is For:
- Testing the Keeper's Heart morph animation without a real bottle
- Debugging the animation flow
- Demo purposes when no competitor bottle is available
- Testing on localhost without Google Vision API credits

### ❌ What Test Mode is NOT For:
- Production use (it's a debug feature)
- Testing actual bottle detection accuracy
- Receipt validation testing

## Technical Implementation

### Files Modified:
1. **[lib/test-mode.ts](lib/test-mode.ts)** - Core utilities
   - `isTestModeEnabled()` - Check if test mode is active
   - `enableTestMode(password)` - Enable with password verification
   - `disableTestMode()` - Disable test mode
   - `getMockDetectionResponse()` - Returns mock detection data

2. **[app/intro/page.tsx](app/intro/page.tsx)** - Password prompt UI
   - Triple-click handler on title
   - Password modal with validation
   - Test mode badge display

3. **[app/scan/page.tsx](app/scan/page.tsx)** - Detection bypass logic
   - Checks test mode on mount
   - Bypasses API call when enabled
   - Uses mock response instead of real detection
   - Visual indicators (orange borders, test mode badges)

### Session Storage:
- Key: `kh_test_mode`
- Value: `'true'` (when enabled)
- Cleared when test mode is disabled
- Persists across page navigation within the same session

## Disable Test Mode

### Option 1: Click the ✕ Button
- Top-right badge on intro page
- Top-center badge on scan page

### Option 2: Clear Session Storage
```javascript
sessionStorage.removeItem('kh_test_mode');
```

### Option 3: Close Browser Tab
- Test mode is stored in sessionStorage (not localStorage)
- Automatically cleared when tab/window is closed

## Example Usage Workflow

```
1. Go to /intro
2. Triple-click "How It Works" title
3. Enter password: "bob"
4. See orange "TEST MODE" badge appear
5. Click "Start Scanning"
6. Take photo of your hand
7. Photo immediately proceeds to animation
8. Watch Keeper's Heart morph animation
9. Click ✕ on badge to disable test mode
```

## Notes

- **No API calls** are made to Google Vision API in test mode
- **Supabase saves** still happen normally (bottle scan saved with test mode brand)
- **Rate limiting** still applies (IP-based limits not bypassed)
- **Fraud prevention** layers still active (image hashing, session validation)
- **Password stored** in [lib/test-mode.ts:5](lib/test-mode.ts#L5) - change if needed

## Security

- Password is simple ("bob") because this is a **development/debug feature**
- Should not be used in production (remove before launch if desired)
- sessionStorage only (cleared on tab close)
- No server-side bypass (detection API is still called in normal mode)
