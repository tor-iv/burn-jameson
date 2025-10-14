# Lottie Fire Animation Guide

## Overview

The burn animation has been converted from Three.js shaders to **Lottie animations** for better visual quality, consistency, and performance.

## Why Lottie + After Effects?

✅ **Best Visual Quality** - Designer creates photorealistic fire once, perfect every time
✅ **Crisp at Any Resolution** - Vector-based, scales perfectly
✅ **Small File Size** - JSON format, typically 50-200KB
✅ **Easy to Update** - Replace JSON file, no code changes
✅ **Performance** - Lighter than WebGL/Three.js
✅ **Consistent** - Same animation every time across all devices

## Current Setup

### Files Created:
- `/components/LottieBurnAnimation.tsx` - React component wrapper
- `/public/animations/fire-burn.json` - **PLACEHOLDER** animation (needs replacement)
- `/app/scanning/[sessionId]/page.tsx` - Updated to use Lottie

### Component Features:
- Auto-positions over detected bottle using bounding box
- Plays once on mount
- Scales to fit detected area
- Non-interactive (pointer-events: none)

## How to Replace with After Effects Animation

### Step 1: Create Animation in After Effects

1. **Design the Fire Effect**
   - Create composition: 800x1200px (portrait bottle shape)
   - Design fire that:
     - Starts at bottom
     - Burns upward over 5 seconds (150 frames at 30fps)
     - Includes flame effects
     - Has burn-through/charring effect

2. **Key Requirements:**
   - **Duration**: 5 seconds (150 frames at 30fps)
   - **Size**: 800x1200px (matches bottle proportions)
   - **Direction**: Bottom to top
   - **Elements to include**:
     - Bright flame layer (orange/yellow)
     - Burn-through darkening (brown/black)
     - Smoke/embers (optional)
     - Edge distortion for organic look

### Step 2: Export from After Effects

1. Install **Bodymovin** plugin (Lottie export):
   - Window > Extensions > Bodymovin

2. Export Settings:
   - Select your composition
   - Choose output path: `fire-burn.json`
   - **Options**:
     - ✅ Glyphs (if using text)
     - ✅ Hidden layers
     - ✅ Guides
     - Compression: Standard

3. Click **Render**

### Step 3: Replace the Placeholder

```bash
# Simply replace the file:
cp your-fire-animation.json public/animations/fire-burn.json
```

That's it! The animation will automatically update.

## Animation Specifications

### Timing:
- **Total Duration**: 5 seconds (150 frames)
- **Frame Rate**: 30fps
- **Autoplay**: Yes
- **Loop**: No (plays once)

### Positioning:
- Animation automatically scales to fit detected bottle bounding box
- 5% padding around detected area for tight fit
- Positioned using normalized coordinates (0-1 range)

### Composition Size:
- **Width**: 800px
- **Height**: 1200px
- **Aspect Ratio**: Portrait (bottle-shaped)

## Testing Your Animation

1. Replace `public/animations/fire-burn.json` with your exported file
2. Start dev server: `npm run dev`
3. Navigate to scan page: `http://localhost:3000/scan`
4. Point camera at Jameson bottle
5. Watch your animation play!

## LottieFiles Resources

### Where to Find Fire Animations:
- [LottieFiles.com](https://lottiefiles.com) - Browse community animations
- Search terms: "fire", "burn", "flame", "explosion"
- Can download and modify existing animations

### Recommended Fire Effects:
Look for animations with:
- Vertical progression (bottom to top)
- Orange/red color palette
- Smooth transitions
- Transparency support

## Code Reference

### Current Implementation:

```tsx
// components/LottieBurnAnimation.tsx
import Lottie from "lottie-react";
import fireAnimation from "@/public/animations/fire-burn.json";

<Lottie
  animationData={fireAnimation}
  loop={false}
  autoplay={true}
/>
```

### Customization Options:

```tsx
// Change speed
<Lottie animationData={fireAnimation} speed={1.5} />

// Add callback when complete
<Lottie
  animationData={fireAnimation}
  onComplete={() => console.log('Animation done!')}
/>

// Control playback
const lottieRef = useRef();
lottieRef.current.play();
lottieRef.current.pause();
lottieRef.current.setSpeed(2);
```

## File Size Optimization

Typical Lottie animations:
- Simple: 20-50KB
- Medium: 50-150KB
- Complex: 150-300KB

If your file is too large:
1. Reduce keyframes
2. Simplify shapes
3. Use shape layers instead of precomps
4. Remove unused elements

## Troubleshooting

### Animation not showing?
- Check file path: `/public/animations/fire-burn.json`
- Verify JSON is valid (paste into JSONLint)
- Check browser console for errors

### Animation too fast/slow?
- Adjust speed prop: `<Lottie speed={0.5} />` (slower) or `speed={2}` (faster)

### Animation not fitting bottle?
- Check bounding box detection
- Adjust expansion in scanning page: `expandBoundingBox(box, 1.05, 1.05)`

## Next Steps

1. **Design Your Fire Animation** in After Effects
2. **Export with Bodymovin** plugin
3. **Replace** `/public/animations/fire-burn.json`
4. **Test** on the scan page
5. **Iterate** based on visual feedback

## Resources

- [Lottie Documentation](https://airbnb.io/lottie/)
- [LottieFiles](https://lottiefiles.com)
- [Bodymovin Plugin](https://github.com/airbnb/lottie-web)
- [After Effects to Lottie Guide](https://lottiefiles.com/blog/working-with-lottie/after-effects-to-lottie-ultimate-guide)
