# Bottle Morph Animation - Setup Guide

## Overview

This feature uses **Gemini 2.5 Flash Image** to create a smooth morphing animation that transforms a competitor whiskey bottle (e.g., Jameson) into a Keeper's Heart bottle over 2-4 seconds.

## Cost Analysis

### 3-Frame Mode (Recommended for Testing)
- **Frames Generated:** 3 (0%, 50%, 100%)
- **Cost per User:** $0.12
- **Generation Time:** ~3-5 seconds
- **Playback Time:** 3 seconds
- **Total Experience:** ~6-8 seconds

### 8-Frame Mode (Premium Quality)
- **Frames Generated:** 8 (0%, 15%, 30%, 45%, 60%, 75%, 90%, 100%)
- **Cost per User:** $0.31
- **Generation Time:** ~3-5 seconds (parallel generation)
- **Playback Time:** 3 seconds
- **Total Experience:** ~6-8 seconds

### Monthly Cost Estimates

**Assuming 1,000 users/month:**
- 3-frame mode: $120/month
- 8-frame mode: $310/month

**Assuming 10,000 users/month:**
- 3-frame mode: $1,200/month
- 8-frame mode: $3,100/month

## Setup Instructions

### Step 1: Add Gemini API Key

1. Get your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Add to `.env.local`:

```bash
GEMINI_API_KEY=your_api_key_here
```

### Step 2: Test the API Route

Test the morph API directly:

```bash
curl -X POST http://localhost:3000/api/morph-bottle \
  -H "Content-Type: application/json" \
  -d '{
    "image": "data:image/jpeg;base64,...",
    "morphPercent": 50,
    "useThreeFrameMode": true
  }'
```

### Step 3: Enable Morph Animation

**Option A: Replace Existing Scanning Page**

Rename the files to use the morph version:

```bash
# Backup original
mv app/scanning/[sessionId]/page.tsx app/scanning/[sessionId]/page-original.tsx

# Use morph version
mv app/scanning/[sessionId]/page-with-morph.tsx app/scanning/[sessionId]/page.tsx
```

**Option B: Use Development Toggle**

Keep `page-with-morph.tsx` as `page.tsx` and use the dev toggle button to enable/disable morphing in development mode.

### Step 4: Configure Animation Mode

In the scanning page, set the morph mode:

```typescript
// For cheaper 3-frame mode ($0.12 per user)
<BottleMorphAnimation
  useThreeFrameMode={true}
  duration={3000}
/>

// For premium 8-frame mode ($0.31 per user)
<BottleMorphAnimation
  useThreeFrameMode={false}
  duration={3000}
/>
```

### Step 5: Enable for Users

Set morph animation to be enabled by default:

```typescript
// In the scanning page useEffect
const morphEnabled = true; // Or use feature flag, A/B test, etc.
setUseMorphAnimation(morphEnabled);
sessionStorage.setItem('morph_enabled', morphEnabled.toString());
```

## Architecture

### Flow Diagram

```
User scans bottle
       ↓
Bottle detected (Vision API)
       ↓
Navigate to /scanning/[sessionId]
       ↓
Phase 1: Burn Animation (2 seconds)
       ↓
Phase 2: Generate Morph Frames (3-5 seconds)
       ├── Call /api/morph-bottle with 0%
       ├── Call /api/morph-bottle with 50% (or 15%, 30%, 45%...)
       └── Call /api/morph-bottle with 100%
       ↓
Phase 3: Play Morph Animation (3 seconds)
       ↓
Show Success / Continue Button
```

### File Structure

```
app/
  api/
    morph-bottle/
      route.ts                    # Gemini API integration
  scanning/
    [sessionId]/
      page.tsx                    # Main scanning page (with morph)
      page-original.tsx           # Backup (burn only)

components/
  BottleMorphAnimation.tsx        # Canvas-based morph renderer
  GifBurnAnimation.tsx            # Existing burn effect

.env.local
  GEMINI_API_KEY=...             # Required for morph feature
```

## How It Works

### 1. Prompt Engineering

Each frame is generated with a carefully crafted prompt that:
- Specifies the exact morph percentage (0-100%)
- Describes the target Keeper's Heart bottle appearance
- Instructs to preserve background, lighting, and shadows
- Focuses changes only on the bottle region

### 2. Parallel Generation

All frames are generated simultaneously using `Promise.all()` to minimize wait time:
- 3 frames: ~3 seconds total
- 8 frames: ~4 seconds total (still parallel)

### 3. Canvas Animation

The `BottleMorphAnimation` component:
- Preloads all generated frames
- Uses `requestAnimationFrame` for smooth 60fps playback
- Blends between keyframes using canvas `globalAlpha`
- Provides progress indicators during generation

### 4. Bounding Box Integration

The detected bottle bounding box from Vision API is passed to help Gemini:
- Focus transformations on the bottle region
- Preserve surrounding areas unchanged
- Maintain spatial consistency

## Customization Options

### Adjust Animation Duration

```typescript
<BottleMorphAnimation
  duration={2500}  // 2.5 seconds (faster)
  // or
  duration={4000}  // 4 seconds (slower, more dramatic)
/>
```

### Adjust Frame Count

Edit `/app/api/morph-bottle/route.ts` to change frame percentages:

```typescript
// Current 3-frame mode
const framePercentages = [0, 50, 100];

// Custom 5-frame mode ($0.20 per user)
const framePercentages = [0, 25, 50, 75, 100];

// More intermediate frames for smoother morph
const framePercentages = [0, 10, 25, 40, 60, 75, 90, 100];
```

### Customize Keeper's Heart Description

Edit the `KEEPERS_HEART_DESCRIPTION` in `/app/api/morph-bottle/route.ts`:

```typescript
const KEEPERS_HEART_DESCRIPTION = `
Your custom bottle description here...
Include details like:
- Bottle shape and color
- Label design and colors
- Brand elements
- Distinctive features
`;
```

## Testing Checklist

- [ ] Gemini API key added to `.env.local`
- [ ] API route responds successfully: `/api/morph-bottle`
- [ ] 3-frame mode generates images correctly
- [ ] 8-frame mode generates images correctly (optional)
- [ ] Canvas animation plays smoothly
- [ ] Bounding box is passed correctly from detection
- [ ] Progress indicator shows during generation
- [ ] Error handling works (try invalid API key)
- [ ] Auto-advance timer works after animation
- [ ] Mobile performance is acceptable
- [ ] Cost tracking is accurate

## Troubleshooting

### "GEMINI_API_KEY not configured"
- Ensure `.env.local` has the key
- Restart dev server after adding env variables

### "No image generated in response"
- Check Gemini API quota/limits
- Verify API key has correct permissions
- Check console logs for detailed error

### Animation is choppy
- Use 3-frame mode for faster generation
- Reduce `duration` prop for faster playback
- Check network speed (frames need to download)

### Bottles don't morph correctly
- Adjust `KEEPERS_HEART_DESCRIPTION` prompt
- Lower `temperature` in API call (more consistent)
- Ensure bounding box is accurate from detection

### Too expensive
- Use 3-frame mode ($0.12 vs $0.31)
- Cache results for common bottle types
- Add rate limiting per user

## Feature Flags

For production, consider using feature flags:

```typescript
// Example with environment variable
const MORPH_ENABLED = process.env.NEXT_PUBLIC_ENABLE_MORPH === 'true';

// Example with A/B testing (50% of users)
const MORPH_ENABLED = Math.random() < 0.5;

// Example with user tier
const MORPH_ENABLED = user.isPremium || user.isFirstTime;
```

## Future Enhancements

1. **Caching:** Store generated morphs for common bottles in CDN
2. **WebGPU:** Use local AI models for faster, free generation
3. **Video Output:** Export morph sequence as shareable video
4. **Custom Timing:** Let users control playback speed
5. **Multi-bottle:** Handle multiple bottles in one frame
6. **AR Integration:** Combine with real-time AR overlay

## API Reference

### POST /api/morph-bottle

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "boundingBox": {
    "x": 0.3,
    "y": 0.2,
    "width": 0.4,
    "height": 0.6
  },
  "morphPercent": 50,
  "useThreeFrameMode": true
}
```

**Response:**
```json
{
  "success": true,
  "morphPercent": 50,
  "image": "data:image/jpeg;base64,...",
  "cost": 0.039
}
```

## Support

For issues or questions:
1. Check console logs for detailed errors
2. Review Gemini API documentation: https://ai.google.dev/gemini-api/docs/image-generation
3. File an issue with reproduction steps

---

**Total Implementation Time:** ~2 hours
**Lines of Code:** ~500
**Dependencies Added:** None (uses existing Next.js + Gemini API)
