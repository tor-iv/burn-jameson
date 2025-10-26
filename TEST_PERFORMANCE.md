# Performance Testing Guide

Quick guide to test the performance optimizations.

## Before You Start

1. Start the dev server:
```bash
npm run dev
```

2. Open browser DevTools (F12)
3. Go to **Network** tab
4. Enable **Preserve log**

---

## Test 1: Vision API Speed

**Goal:** Verify Vision API responds in 400-600ms (was 800-1200ms)

**Steps:**
1. Go to http://localhost:3000
2. Complete age gate → intro
3. Click "Scan Bottle"
4. Allow camera access
5. Point camera at whiskey bottle (Jameson, Bulleit, etc.)
6. Watch server console logs

**Expected logs:**
```
[VISION API OPTIMIZATION] Resizing 3024x4032 → max 1024px
[VISION API OPTIMIZATION] Reduced payload: 2847KB → 287KB (90% smaller)
[VISION API] Payload size: 287KB
[VISION API] ✅ Response received in 456ms ← Should be 400-600ms
```

**✅ Pass criteria:** Response time < 600ms

---

## Test 2: Gemini API Speed

**Goal:** Verify Gemini API responds in 1500-2500ms (was 3000-4000ms)

**Steps:**
1. Complete Test 1 (bottle detected)
2. Watch server console for Gemini timing
3. Wait for morph animation to complete

**Expected logs:**
```
[MORPH-SIMPLE API] 📏 Crop resized to match Keeper's dimensions: 512 x 1024
[MORPH-SIMPLE API] 🎨 Calling Gemini API for bottle replacement...
[MORPH-SIMPLE API] ⏱️  Gemini API responded in 1842ms ← Should be 1500-2500ms
```

**✅ Pass criteria:** Response time < 2500ms

---

## Test 3: End-to-End Performance

**Goal:** Total scan flow < 3 seconds (was 4-5 seconds)

**Steps:**
1. Go to http://localhost:3000/scan
2. Allow camera access
3. Point at whiskey bottle
4. Start timer when camera appears
5. Stop timer when morph animation completes

**Browser DevTools Network Tab:**
- Find `detect-bottle` request → Check **Time**
- Find `morph-bottle-simple` request → Check **Time**
- Add both times together

**✅ Pass criteria:** Total < 3 seconds

---

## Test 4: Visual Quality Check

**Goal:** Ensure optimizations didn't degrade quality

**Steps:**
1. Complete full scan flow
2. Verify transformed bottle looks realistic
3. Check for these quality issues:

**❌ Fail if you see:**
- Blurry bottle label
- Distorted bottle shape
- Floating/misaligned bottle in hands
- Pixelated edges
- Obvious artifacts

**✅ Pass if:**
- Bottle looks photo-realistic
- Label text is sharp/readable
- Proper hand grip alignment
- Smooth lighting/shadows

---

## Test 5: Different Bottle Brands

**Goal:** Verify detection still works for all competitor brands

**Test with:**
- ✅ Jameson (Irish)
- ✅ Bulleit (Bourbon)
- ✅ Woodford Reserve (Bourbon)
- ✅ Johnnie Walker (Scotch)
- ✅ Tullamore Dew (Irish)

**Expected:** All brands detected correctly with bounding boxes

---

## Troubleshooting

### Vision API is slow (>600ms)
**Possible causes:**
- Large image not being resized (check logs for "Resizing" message)
- Network latency (test with different connection)
- Google API quota/throttling (check quota in Google Cloud Console)

**Fix:**
- Verify Sharp compression is working (should see "Reduced payload" log)
- Check image size in request (should be <500KB)

---

### Gemini API is slow (>2500ms)
**Possible causes:**
- Not using Flash-Lite model (check API endpoint in logs)
- Large crop dimensions (should be 512×1024, not 699×1900)
- Network latency

**Fix:**
- Verify model endpoint: `gemini-2.5-flash-lite-image` (not `gemini-2.5-flash-image`)
- Check crop dimensions in logs (should show 512×1024)

---

### Quality degradation
**Possible causes:**
- Flash-Lite model trades quality for speed
- Smaller crop dimensions

**Fix:**
- If unacceptable, rollback to Flash model (see PERFORMANCE_OPTIMIZATIONS.md)
- Increase crop dimensions to 699×1900 (slower but higher quality)

---

## Performance Comparison

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Vision API | 800-1200ms | ??? | <600ms |
| Gemini API | 3000-4000ms | ??? | <2500ms |
| Total Flow | 4000-5000ms | ??? | <3000ms |

Fill in "???" with your test results!

---

## Report Issues

If performance is worse than expected or quality degraded:

1. Check server console logs for error messages
2. Verify all environment variables are set (GOOGLE_VISION_API_KEY, GEMINI_API_KEY)
3. Test with different network connection
4. Try different test images (some bottles may be harder to detect)

If issues persist, rollback optimizations (see PERFORMANCE_OPTIMIZATIONS.md).
