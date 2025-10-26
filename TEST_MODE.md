# Test Mode - Quick Reference

## Overview
Test mode is a password-protected debug feature with intelligent hand detection. It attempts to detect your hand in the camera frame and places the Keeper's Heart bottle at that location. If no hand is detected after 2-3 attempts, it uses a default center-lower position.

**NEW in v2.0:** Hand-focused positioning for realistic bottle placement!

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

When test mode is enabled, you'll see dynamic indicators based on hand detection status:

### 1. Top Badge (shows detection progress)
- **Searching:** 🤚 LOOKING FOR HAND... (1/3) - Orange, pulsing
- **Hand Found:** ✅ HAND FOUND! HOLD STEADY - Green, solid
- **Fallback:** 📍 READY - TAKE PHOTO - Yellow, solid
- Click ✕ to disable test mode

### 2. Detection Frame Overlay
- **Searching:** Orange pulsing border
- **Hand Found:** Green solid border with glow
- **Fallback:** Yellow solid border with glow

### 3. Confidence Meter (below top badge)
- **Searching:** "🤚 Looking for hand... (X/3)"
- **Hand Found:** "✅ Hand found! Position your photo"
- **Fallback:** "📍 Ready to scan"

### 4. Bottom Instructions
- **Searching:** "Show your hand to the camera"
- **Hand Found/Fallback:** "Ready - take your photo!"

## How Test Mode Works

### Normal Flow (Test Mode OFF)
```
Camera → Real Bottle Detection API → Check Confidence (>75%) → Proceed to Animation
```

### Test Mode Flow (Test Mode ON) - **NEW: Hand Detection!**
```
Camera → Hand Detection API (attempts 1-3) →
  ├─ Hand Found → Position bottle at hand location → Proceed to Animation
  └─ No Hand (after 3 attempts) → Use fallback center-lower position → Proceed to Animation
```

### Hand Detection Process

**Attempt 1-3:** App calls `/api/detect-hand` to find hands using Google Vision API
- **Orange pulsing border** + "🤚 LOOKING FOR HAND... (X/3)"
- Uses `OBJECT_LOCALIZATION` to detect "Hand" objects
- If hand detected: Stores position, shows **green border** + "✅ HAND FOUND! HOLD STEADY"
- If no hand: Tries again (up to 3 attempts)

**After 3 attempts (no hand found):**
- **Yellow border** + "📍 READY - TAKE PHOTO"
- Uses default fallback position (center-lower area of frame)
- Bottle placed at `{ x: 0.35, y: 0.45, width: 0.30, height: 0.45 }`

**Hand found flow:**
- Bottle positioned at detected hand location
- Dimensions adjusted to be bottle-shaped (narrower than hand, similar height)
- Proceeds immediately to morph animation

## Mock Detection Response

Test mode now generates **dynamic** mock data based on hand detection results:

### With Hand Detected:
```javascript
{
  detected: true,
  brand: 'Test Mode - Keeper\'s Heart',
  confidence: 1.0,
  normalizedBoundingBox: {
    x: <hand_center_x - bottle_width/2>,  // Centered on hand
    y: <hand_center_y - bottle_height/2>, // Centered on hand
    width: min(0.30, hand_width * 0.8),   // Narrower than hand
    height: min(0.50, hand_height * 1.1), // Slightly taller than hand
  },
  expandedBoundingBox: { /* 20% expansion */ },
  aspectRatio: height / width,
  _debug: {
    handDetected: true
  }
}
```

### Without Hand (Fallback):
```javascript
{
  detected: true,
  brand: 'Test Mode - Keeper\'s Heart',
  confidence: 1.0,
  normalizedBoundingBox: {
    x: 0.35,    // 35% from left (center-ish)
    y: 0.45,    // 45% from top (lower-center, hand-holding area)
    width: 0.30,  // 30% width (realistic bottle)
    height: 0.45, // 45% height (medium bottle)
  },
  expandedBoundingBox: { /* 20% expansion */ },
  aspectRatio: 1.5,
  _debug: {
    handDetected: false
  }
}
```

## Use Cases

### ✅ What Test Mode is For:
- Testing the Keeper's Heart morph animation without a real bottle
- **Testing hand detection and bottle positioning**
- **Validating bottle placement in different hand positions**
- Debugging the animation flow
- Demo purposes when no competitor bottle is available
- Testing on localhost (uses Google Vision API for hand detection only)

### ❌ What Test Mode is NOT For:
- Production use (it's a debug feature)
- Testing actual bottle brand detection (always returns "Keeper's Heart")
- Receipt validation testing
- Performance testing (hand detection adds 1-3 API calls)

## Technical Implementation

### Files Modified:

1. **[app/api/detect-hand/route.ts](app/api/detect-hand/route.ts)** - NEW: Hand detection endpoint
   - Uses Google Vision API `OBJECT_LOCALIZATION`
   - Detects "Hand" objects in camera frames
   - Returns hand bounding box (normalized 0-1 coordinates)
   - Falls back to default position if no hand found
   - Optimizes images to 1024px for faster processing

2. **[lib/debug-mode.ts](lib/debug-mode.ts)** - Core utilities (UPDATED)
   - `isTestModeEnabled()` - Check if test mode is active
   - `enableTestMode(password)` - Enable with password verification
   - `disableTestMode()` - Disable test mode
   - `getMockDetectionResponse(handBoundingBox?)` - **NEW: Accepts optional hand position**
     - If hand position provided: Centers bottle at hand location
     - If no hand position: Uses default center-lower fallback

3. **[app/intro/page.tsx](app/intro/page.tsx)** - Password prompt UI
   - Triple-click handler on title
   - Password modal with validation
   - Test mode badge display

4. **[app/scan/page.tsx](app/scan/page.tsx)** - Detection logic (HEAVILY UPDATED)
   - **NEW state:** `handDetectionAttempts` (0-3 counter)
   - **NEW state:** `handPosition` (stores detected hand bounding box)
   - **NEW state:** `handDetectionStatus` ('searching' | 'found' | 'fallback')
   - **Hand detection flow:**
     1. First 3 frames call `/api/detect-hand`
     2. If hand found: Store position, show green indicators
     3. If no hand after 3 attempts: Use fallback, show yellow indicators
     4. Generate mock response with hand position (or fallback)
   - **Dynamic UI indicators** based on detection status

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

### Scenario 1: Hand Detected (Typical Flow)
```
1. Go to /intro
2. Triple-click "How It Works" title
3. Enter password: "bob"
4. See orange "TEST MODE" badge appear
5. Click "Start Scanning"
6. Camera opens, shows "🤚 LOOKING FOR HAND... (1/3)" with orange pulsing border
7. Point camera at your hand
8. After 1-2 frames: "✅ HAND FOUND! HOLD STEADY" with green border
9. Take photo (or auto-proceeds after detecting hand)
10. Watch Keeper's Heart morph animation (bottle positioned at hand location)
11. Click ✕ on badge to disable test mode
```

### Scenario 2: No Hand Detected (Fallback Flow)
```
1. Enable test mode (steps 1-5 above)
2. Camera opens, shows "🤚 LOOKING FOR HAND... (1/3)"
3. Point camera at table/wall (no hand visible)
4. After 3 frames: "📍 READY - TAKE PHOTO" with yellow border
5. Take photo
6. Watch Keeper's Heart morph animation (bottle at default center-lower position)
```

## Notes

- **Hand Detection API calls** are made in test mode (up to 3 attempts using Google Vision API)
- **Bottle detection bypassed** - no brand detection API calls
- **Supabase saves** still happen normally (bottle scan saved with test mode brand)
- **Rate limiting** still applies (IP-based limits not bypassed)
- **Fraud prevention** layers still active (image hashing, session validation)
- **Password stored** in [lib/debug-mode.ts:7](lib/debug-mode.ts#L7) - change if needed
- **Performance:** Hand detection adds ~1-3 seconds total (3 frames @ ~500ms each if no hand found)

## Security

- Password is simple ("bob") because this is a **development/debug feature**
- Should not be used in production (remove before launch if desired)
- sessionStorage only (cleared on tab close)
- No server-side bypass (detection API is still called in normal mode)
