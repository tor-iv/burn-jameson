# Bottle Morph Debugging Guide

## Current Status

You're using the **simplified morph system** that:
- Makes 1 API call (not 3-8)
- Costs $0.04 per user
- Cross-fades original → transformed image

## What to Check Now

### 1. Browser Console Logs

Open your browser's DevTools console (F12) and look for these logs:

**Expected flow:**
```
[SCANNING PAGE] 🔥 Starting morph animation flow
[SCANNING PAGE] 📍 Animation phase: burn
[SCANNING PAGE] 🎨 Transitioning to morph phase
[SCANNING PAGE] 📍 Animation phase: morph
[SCANNING PAGE] 🎨 Rendering SimpleBottleMorph component
[SIMPLE MORPH] 🎨 Generating transformed bottle...
[SIMPLE MORPH] Image length: 195216 chars
[SIMPLE MORPH] ✅ Received transformed image, size: 2537088 chars
[SIMPLE MORPH] 🖼️ Rendering original image
[SIMPLE MORPH] 🎨 Rendering transformed image with opacity: 0
[SIMPLE MORPH] 🎥 Starting cross-fade over 2000ms
[SIMPLE MORPH] ✅ Transformed image DOM element loaded
[SIMPLE MORPH] 🎨 Rendering transformed image with opacity: 0.5
[SIMPLE MORPH] 🎨 Rendering transformed image with opacity: 1
[SIMPLE MORPH] ✅ Cross-fade complete
[SIMPLE MORPH] 📞 Calling onComplete callback
```

### 2. Visual Indicators (in dev mode)

Look at the top-right corner:
- **Morph: ON/OFF** - Toggle button
- **Phase: burn/morph/complete** - Current animation phase

Look at the bottom-right corner (during morph):
- **Cost: $0.04 | Opacity: X%** - Shows cross-fade progress

### 3. What You Should See

**Timeline:**
1. **0-2s:** Burn animation plays over bottle
2. **2-10s:** "Transforming Bottle..." loading screen (generating with AI)
3. **10-12s:** Cross-fade from original bottle to Keeper's Heart bottle
4. **12s+:** Continue button appears

## Common Issues

### Issue: Black Screen After Loading

**Symptoms:** Loading screen disappears but screen goes black

**Possible causes:**

1. **Images not rendering**
   - Check browser console for `[SIMPLE MORPH] 🖼️ Rendering` logs
   - Check for image load errors
   - Verify base64 image data is valid

2. **Navigating away too soon**
   - Check if you see `GET /success/...` in server logs before animation completes
   - The page shouldn't navigate until onComplete is called

3. **CSS/styling issue**
   - Images might be rendering but invisible
   - Check z-index and opacity values

### Issue: "No image generated in response"

**Symptoms:** Error message in loading screen

**Solution:** Gemini API returned text instead of image
- This is a Gemini API limitation
- Try again - it's inconsistent
- Check your API key and quota

### Issue: Page navigates before seeing morph

**Symptoms:** Jump to success page while still loading

**Solution:** The timing is removed now, should only advance on button click

## Manual Testing Checklist

- [ ] Turn on morph animation (purple button, top-right)
- [ ] Scan a bottle (Jameson or similar)
- [ ] Wait through burn animation (2s)
- [ ] See "Transforming Bottle..." loading indicator
- [ ] Wait for API call to complete (~5-10s)
- [ ] Check browser console for `[SIMPLE MORPH]` logs
- [ ] Look for original image to appear
- [ ] Look for transformed image to fade in
- [ ] Check opacity indicator increases 0% → 100%
- [ ] See continue button appear
- [ ] Click continue

## Debug Info to Share

If it's still not working, please share:

1. **Browser console logs** (all `[SIMPLE MORPH]` and `[SCANNING PAGE]` lines)
2. **Current phase** (shown in top-right corner)
3. **Any errors** (red text in console)
4. **Screenshot** of the black screen
5. **Server logs** (we can see API is working)

## Quick Fixes to Try

### Fix 1: Force original image to show

Edit `SimpleBottleMorph.tsx` line 151:
```typescript
style={{ opacity: isGenerating ? 0 : 1 }}
// Change to:
style={{ opacity: 1 }} // Always visible
```

### Fix 2: Skip loading screen

Edit `SimpleBottleMorph.tsx` line 113:
```typescript
{isGenerating && (
// Change to:
{false && ( // Never show loading screen
```

### Fix 3: Show transformed image immediately

Edit `SimpleBottleMorph.tsx` line 164:
```typescript
style={{ opacity: opacity }}
// Change to:
style={{ opacity: transformedImage ? 1 : 0 }} // Full opacity when loaded
```

## Current File Status

✅ **Server API:** Working perfectly (generating images)
❓ **Client Component:** Images may not be displaying
❓ **Timing:** Need to verify animation phases

The API is 100% working based on your server logs. The issue is purely in the React component rendering the images to the screen.
