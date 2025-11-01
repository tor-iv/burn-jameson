# Animation Modes Guide

Comprehensive guide for the Burn That Ad animation system. The app features 10 different animation modes for bottle transformation effects.

## Table of Contents
- [Overview](#overview)
- [Quick Start](#quick-start)
- [Animation Modes Reference](#animation-modes-reference)
- [Configuration](#configuration)
- [Adding New Modes](#adding-new-modes)
- [Performance Considerations](#performance-considerations)

---

## Overview

### System Architecture

The animation system is managed by [lib/animation-manager.ts](../lib/animation-manager.ts), which provides:

- **Mode Selection**: 10 different animation implementations
- **Persistent Storage**: localStorage saves user's preferred mode
- **Performance Tier Detection**: Automatically recommends modes based on device capabilities
- **Cost Tracking**: Monitors API usage for AI-powered modes
- **Two-Phase Support**: Burn animation followed by morph animation (for AI modes)

### Animation Categories

**Standard Animations (FREE):**
- No API costs
- Canvas, CSS, or WebGL-based
- Instant playback, no network requests
- 7 modes available

**AI-Powered Animations ($$):**
- Gemini API integration
- Realistic bottle transformation
- $0.04-$0.31 per scan
- 2 modes available

---

## Quick Start

### Setting Default Animation

**Option 1: Environment Variable**
```bash
# .env.local
NEXT_PUBLIC_DEFAULT_ANIMATION_MODE=spin-reveal
```

**Option 2: Programmatic**
```javascript
import { setAnimationMode } from '@/lib/animation-manager';

// Set mode at runtime
setAnimationMode('burn-to-coal');
```

**Option 3: Admin Panel**
- Navigate to `/admin`
- Click "Animation Settings" section
- Select desired mode from visual grid
- Changes apply immediately

### Reading Current Mode

```javascript
import { getAnimationMode, getAnimationConfig } from '@/lib/animation-manager';

const currentMode = getAnimationMode(); // Returns: 'ai-morph-simple'
const config = getAnimationConfig(currentMode);

console.log(config.name); // "AI Morph (Simple)"
console.log(config.costPerUse); // 0.04
console.log(config.estimatedDuration); // 8000 (ms)
```

---

## Animation Modes Reference

### 1. Enhanced Fire (DEFAULT)
**ID:** `enhanced-fire`
**Component:** [EnhancedFireAnimation.tsx](../components/EnhancedFireAnimation.tsx)

**Description:**
Canvas-based particle system with brand-specific bottle shapes. Most visually dramatic fire effect with ember particles, ash, and smoke.

**Technical Details:**
- Canvas 2D API with custom particle physics
- 6-stage burn progression (heat-up → ignition → active burn → structural fail → collapse → embers)
- Brand-specific bottle clipping paths
- 45 embers/sec, 60 ash particles/sec, 30 smoke particles/sec

**Pros:**
- Free (no API cost)
- High performance (60fps on modern devices)
- Most dramatic visual effect
- Brand detection for accurate bottle shapes

**Cons:**
- Heavy on low-end devices
- Requires good GPU

**Best For:**
Default experience, high-impact campaigns

**Duration:** 6 seconds

---

### 2. Three.js Shader
**ID:** `three-shader`
**Component:** [ThreeBurnAnimation.tsx](../components/ThreeBurnAnimation.tsx)

**Description:**
WebGL shader-based burn effect with paper-like burn-through appearance.

**Technical Details:**
- Three.js with custom fragment shaders
- Real-time distortion and color grading
- GPU-accelerated rendering

**Pros:**
- Free (no API cost)
- Smooth shader transitions
- Unique aesthetic (paper burn)

**Cons:**
- Medium performance impact
- Requires WebGL support
- May fail on older devices

**Best For:**
Creative campaigns, artistic presentations

**Duration:** 5 seconds

---

### 3. Framer Flames
**ID:** `framer-flames`
**Component:** [burn-animation.tsx](../components/burn-animation.tsx)

**Description:**
Simple Framer Motion flame animation. Lightweight and fast.

**Technical Details:**
- Pure CSS animations via Framer Motion
- No Canvas or WebGL required
- Minimal CPU/GPU usage

**Pros:**
- Free (no API cost)
- Fastest performance
- Works on all devices
- Smallest bundle size

**Cons:**
- Least realistic effect
- Basic visual impact

**Best For:**
Low-end devices, fast testing, accessibility

**Duration:** 2.5 seconds

---

### 4. Lottie Animation
**ID:** `lottie`
**Component:** [LottieBurnAnimation.tsx](../components/LottieBurnAnimation.tsx)

**Description:**
JSON-based Lottie animation player. Requires fire-burn.json asset.

**Technical Details:**
- Lottie library for vector animations
- Requires external JSON file
- CPU-based rendering

**Pros:**
- Free (no API cost)
- High performance
- Designer-friendly (After Effects export)

**Cons:**
- Requires asset file
- Limited customization at runtime

**Best For:**
When designers need control, branded animations

**Duration:** 3 seconds

---

### 5. Burn to Coal ✨ NEW
**ID:** `burn-to-coal`
**Component:** [BurnToCoalAnimation.tsx](../components/BurnToCoalAnimation.tsx)

**Description:**
Bottle burns and transforms into charred coal with glowing ember effects, then the coal crumbles away to reveal Keeper's Heart underneath.

**Technical Details:**
- Canvas 2D with progressive darkening gradient
- 4 phases: burn (0-33%), char (33-58%), ember glow (58-83%), reveal (83-100%)
- Particle system for embers and ash
- Pulsing orange ember spots on charred surface
- Crumbling effect revealing Keeper's Heart bottle illustration

**Visual Effect:**
```
Phase 1 (Burn): Fire progresses from bottom to top, darkening bottle
Phase 2 (Char): Fully blackened with charcoal texture
Phase 3 (Ember): Glowing orange edges pulsing
Phase 4 (Reveal): Charcoal crumbles away top-to-bottom revealing Keeper's Heart
```

**Pros:**
- Free (no API cost)
- High performance
- Satisfying destruction → transformation effect
- No network required
- Shows Keeper's Heart at the end

**Cons:**
- Keeper's Heart is illustrated (not actual photo)
- Darker aesthetic may not suit all campaigns

**Best For:**
Aggressive competitive campaigns, "destroy the competition and rise from the ashes" messaging

**Duration:** 6 seconds

---

### 6. Spin Reveal ✨ NEW
**ID:** `spin-reveal`
**Component:** [SpinRevealAnimation.tsx](../components/SpinRevealAnimation.tsx)

**Description:**
360° rotation animation revealing Keeper's Heart bottle at the end. Smooth and elegant transformation.

**Technical Details:**
- CSS 3D transforms (`rotateY`)
- Framer Motion for smooth easing
- Two-sided card flip effect
- Custom Keeper's Heart bottle illustration (CSS-based)

**Visual Effect:**
```
0°-180°: Competitor bottle rotates (front face visible)
180°: Crossfade transition
180°-360°: Keeper's Heart bottle revealed (back face visible)
```

**Pros:**
- Free (no API cost)
- High performance (CSS GPU-accelerated)
- Professional, elegant feel
- Works on all devices

**Cons:**
- Less dramatic than burn effects
- No actual bottle photograph (uses illustrated silhouette)

**Best For:**
Upscale campaigns, elegant presentations, mobile-first experiences

**Duration:** 4 seconds

---

### 7. Melt Down ✨ NEW
**ID:** `melt-down`
**Component:** [MeltDownAnimation.tsx](../components/MeltDownAnimation.tsx)

**Description:**
Competitor bottle melts downward like wax or ice with dripping effects. Reveals Keeper's Heart underneath.

**Technical Details:**
- Canvas 2D with progressive clipping mask
- Drip particle system (40 drips/sec)
- Wavy melt line with glow effect
- Amber/gold Keeper's Heart reveal gradient

**Visual Effect:**
```
0.5s: Wait phase (no melting)
0.5s-4.0s: Progressive melt from top to bottom with drips
4.0s-4.5s: Final fade, Keeper's Heart fully revealed
```

**Pros:**
- Free (no API cost)
- Satisfying visual effect
- Good mobile performance
- Unique melting physics

**Cons:**
- Medium performance (Canvas-heavy)
- Keeper's Heart bottle is placeholder (not actual photo)

**Best For:**
Creative campaigns, "melt away the competition" messaging

**Duration:** 4.5 seconds

---

### 8. AI Morph (Simple) 🤖
**ID:** `ai-morph-simple`
**Component:** [SimpleBottleMorph.tsx](../components/SimpleBottleMorph.tsx)

**Description:**
Gemini API generates single transformed frame with crossfade. Fast, cheap, and realistic AI-powered bottle transformation.

**Technical Details:**
- Calls Gemini 2.5 Flash Image API
- Single-frame generation (~1.5-2s)
- Preloading during bottle detection (zero perceived wait)
- Lighting analysis and adaptive color matching
- Server-side image processing (Sharp library)

**Visual Effect:**
```
Phase 1: Enhanced fire burn (60% of total duration)
Phase 2: Crossfade from original → AI-transformed bottle (40% duration)
```

**Pros:**
- Most realistic transformation
- Lighting-aware (matches scene conditions)
- Preserves hands, background
- Preloaded (no wait time)

**Cons:**
- $0.04 per scan API cost
- Requires Gemini API key
- Network dependent

**Best For:**
Production campaigns, maximum realism, when budget allows

**Duration:** 8 seconds (4.8s burn + 3.2s morph)

**Cost:** $0.04 per scan

---

### 9. AI Morph (8 Frames) 🤖
**ID:** `ai-morph-full`
**Component:** [BottleMorphAnimation.tsx](../components/BottleMorphAnimation.tsx)

**Description:**
Gemini API generates 8 intermediate frames for smooth morph. Expensive but highest quality transformation.

**Technical Details:**
- Calls Gemini API 8 times in parallel
- Frame percentages: 0%, 15%, 30%, 45%, 60%, 75%, 90%, 100%
- Canvas-based frame interpolation
- Adaptive alpha blending between frames

**Visual Effect:**
```
Phase 1: Enhanced fire burn
Phase 2: Interpolated 8-frame morph animation (very smooth)
```

**Pros:**
- Smoothest transformation
- Most cinematic quality
- Ultra-realistic morphing

**Cons:**
- $0.31 per scan API cost (8x more expensive)
- 8-frame generation delay (~8-12s)
- High network usage
- Not recommended for production

**Best For:**
Demo videos, promotional materials, premium experiences

**Duration:** 8 seconds (5s generation + 3s animation)

**Cost:** $0.31 per scan

---

### 10. Video Morph (DISABLED)
**ID:** `video-morph`
**Component:** VideoMorphAnimation.tsx

**Description:**
Pre-rendered video animations (melt → reform). Requires video assets per brand.

**Status:** Disabled until video assets are created.

**Pros:**
- Free playback (no API cost)
- Consistent quality
- No generation delay

**Cons:**
- Requires video files for each competitor brand
- Large bundle size
- Static content (can't adapt to lighting/scene)

**Duration:** 5 seconds

**Cost:** Free (after asset creation)

---

## Configuration

### Animation Manager API

```javascript
import {
  getAnimationMode,
  setAnimationMode,
  getAvailableModes,
  getAnimationConfig,
  isTwoPhaseAnimation,
  resetAnimationMode,
} from '@/lib/animation-manager';

// Get current mode
const mode = getAnimationMode(); // Returns: AnimationMode

// Set new mode
setAnimationMode('spin-reveal'); // Saves to localStorage

// Get all available modes (excludes disabled)
const modes = getAvailableModes(); // Returns: AnimationMode[]

// Get mode configuration
const config = getAnimationConfig('burn-to-coal');
// Returns: {
//   id: 'burn-to-coal',
//   name: 'Burn to Coal',
//   description: '...',
//   component: 'BurnToCoalAnimation',
//   estimatedDuration: 5000,
//   costPerUse: 0,
//   performance: 'high',
//   requiresAssets: false,
//   enabled: true
// }

// Check if mode uses two-phase animation (burn + morph)
const isTwoPhase = isTwoPhaseAnimation('ai-morph-simple'); // Returns: true

// Reset to default
resetAnimationMode(); // Clears localStorage, reverts to DEFAULT_MODE
```

### Environment Variables

```bash
# .env.local

# Set default animation mode (optional)
NEXT_PUBLIC_DEFAULT_ANIMATION_MODE=spin-reveal

# Gemini API key (required for AI-powered modes)
GEMINI_API_KEY=your_gemini_api_key
```

### Admin Panel

Navigate to `/admin` → "Animation Settings" section:

1. Click section header to expand
2. View all available modes in grid layout
3. Click mode card to activate
4. See real-time update in "Current:" indicator
5. Changes persist via localStorage

**Mode Card Info:**
- Name and description
- Performance tier (HIGH/MEDIUM/LOW)
- Cost (FREE or $/amount)
- Duration in seconds

---

## Adding New Modes

### Step 1: Create Animation Component

Create new file in `/components/YourAnimation.tsx`:

```typescript
"use client";

import { useEffect, useRef } from "react";

interface YourAnimationProps {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  imageUrl: string;
  onComplete?: () => void;
}

export default function YourAnimation({
  boundingBox,
  imageUrl,
  onComplete
}: YourAnimationProps) {
  // Your animation logic here

  useEffect(() => {
    // Start animation
    // Call onComplete() when finished
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Your animation rendering */}
    </div>
  );
}
```

### Step 2: Register Mode in Animation Manager

Edit [lib/animation-manager.ts](../lib/animation-manager.ts):

```typescript
// 1. Add to AnimationMode type
export type AnimationMode =
  | 'enhanced-fire'
  | 'your-new-mode'; // Add here

// 2. Add configuration
export const ANIMATION_MODES: Record<AnimationMode, AnimationModeConfig> = {
  // ... existing modes
  'your-new-mode': {
    id: 'your-new-mode',
    name: 'Your Mode Name',
    description: 'Brief description of what this animation does.',
    component: 'YourAnimation',
    estimatedDuration: 5000, // milliseconds
    costPerUse: 0, // USD
    performance: 'high', // 'high' | 'medium' | 'low'
    requiresAssets: false,
    enabled: true,
  },
};
```

### Step 3: Add to Scanning Page

Edit [app/scanning/[sessionId]/page.tsx](../app/scanning/[sessionId]/page.tsx):

```typescript
// 1. Add dynamic import
const YourAnimation = dynamic(() => import("@/components/YourAnimation"), {
  ssr: false,
});

// 2. Add case to renderBurnAnimation()
case 'your-new-mode':
  return (
    <YourAnimation
      boundingBox={activeBox}
      imageUrl={bottleImage}
      onComplete={() => {}}
    />
  );
```

### Step 4: Test

```bash
# Set as default for testing
NEXT_PUBLIC_DEFAULT_ANIMATION_MODE=your-new-mode npm run dev
```

Or use admin panel to switch modes.

---

## Performance Considerations

### Performance Tiers

**High Performance:**
- Enhanced Fire: Canvas particle system (well-optimized)
- Framer Flames: Pure CSS (minimal overhead)
- Lottie: Vector-based, GPU-accelerated
- Burn to Coal: Canvas with efficient particles
- Spin Reveal: CSS 3D transforms (GPU-accelerated)
- AI Morph Simple: Preloaded, single image crossfade

**Medium Performance:**
- Three.js Shader: WebGL shaders (GPU-dependent)
- Melt Down: Canvas-heavy with many particles
- AI Morph Full: 8-frame interpolation (Canvas-heavy)

**Low Performance:**
- Video Morph: Large video files, playback overhead

### Device Detection

The animation manager automatically detects device capabilities:

```javascript
import { getDevicePerformanceTier, getRecommendedAnimationMode } from '@/lib/animation-manager';

const tier = getDevicePerformanceTier(); // Returns: 'high' | 'medium' | 'low'

// Recommends mode based on device
const recommended = getRecommendedAnimationMode();
```

**Detection Logic:**
- **Low-end**: <4GB RAM or <4 CPU cores → Recommends `framer-flames`
- **High-end**: iOS devices → Recommends `enhanced-fire`
- **Medium**: Others → Uses `DEFAULT_MODE`

### Optimization Tips

1. **Use Preloading**: AI morph modes preload during bottle detection
2. **Disable on Low-End**: Check device tier and switch to lighter modes
3. **Monitor Costs**: Track AI mode usage via cost tracking
4. **Test on Real Devices**: Canvas performance varies wildly across devices

---

## Cost Analysis

### Free Modes (7 modes)

Total cost per scan: **$0.00**

Recommended for:
- High-volume campaigns
- Testing/development
- Budget-conscious clients

### AI-Powered Modes (2 modes)

| Mode | Cost/Scan | When to Use |
|------|-----------|-------------|
| AI Morph Simple | $0.04 | Production, realistic transformation |
| AI Morph Full | $0.31 | Demos, premium experiences |

**Example Cost Projections:**

| Scans/Day | Mode | Daily Cost | Monthly Cost |
|-----------|------|------------|--------------|
| 100 | Free | $0 | $0 |
| 100 | AI Simple | $4 | $120 |
| 100 | AI Full | $31 | $930 |
| 1000 | AI Simple | $40 | $1,200 |

---

## Troubleshooting

### Animation Not Playing

**Check 1: Is mode enabled?**
```javascript
import { ANIMATION_MODES } from '@/lib/animation-manager';
console.log(ANIMATION_MODES['your-mode'].enabled); // Should be true
```

**Check 2: Does mode require assets?**
- `lottie`: Requires `fire-burn.json` file
- `video-morph`: Requires video files per brand
- `ai-morph-*`: Requires `GEMINI_API_KEY` environment variable

**Check 3: Component imported correctly?**
- Check dynamic import in scanning page
- Verify component export is default

### AI Morph Not Working

**Error: "Gemini API key not found"**
- Add `GEMINI_API_KEY` to `.env.local`
- Restart dev server

**Error: "Preloaded image not found"**
- Preloading happens during bottle detection
- Check network tab for `/api/morph-bottle-simple` call
- Verify sessionStorage key `preloaded_morph_{sessionId}`

**Slow Performance**
- AI Morph Simple: Should be ~1.5-2s (check server logs)
- AI Morph Full: Generates 8 frames in parallel (~8-12s)
- Check Gemini API quota/rate limits

### Canvas Performance Issues

**Symptoms**: Low FPS, stuttering, crashes on mobile

**Solutions**:
1. Switch to lighter mode: `setAnimationMode('framer-flames')`
2. Reduce particle count in component config
3. Disable on low-end devices via `getDevicePerformanceTier()`

---

## Best Practices

### 1. Default to Free Modes
For production campaigns, start with free modes (Enhanced Fire or Spin Reveal) to minimize costs.

### 2. Use AI Modes Selectively
Enable AI modes only for:
- VIP users
- Special promotions
- Demo/marketing materials

### 3. Monitor Costs
Track Gemini API usage in Google Cloud Console. Set billing alerts.

### 4. Test on Real Devices
Canvas and WebGL performance varies significantly. Test on:
- iPhone (high-end)
- Budget Android (low-end)
- Desktop browsers

### 5. Provide Fallbacks
Always have a lightweight fallback mode in case of:
- API failures
- Slow networks
- Device limitations

---

## Examples

### Example 1: Campaign-Specific Modes

```javascript
// routes.ts
const CAMPAIGN_CONFIG = {
  'aggressive-competitor': 'burn-to-coal',
  'elegant-reveal': 'spin-reveal',
  'destruction-theme': 'melt-down',
  'premium-experience': 'ai-morph-simple',
};

const campaignType = getCampaignType(); // Your logic
setAnimationMode(CAMPAIGN_CONFIG[campaignType]);
```

### Example 2: Device-Adaptive Selection

```javascript
import { getDevicePerformanceTier, setAnimationMode } from '@/lib/animation-manager';

const tier = getDevicePerformanceTier();

if (tier === 'low') {
  setAnimationMode('framer-flames'); // Lightest
} else if (tier === 'medium') {
  setAnimationMode('spin-reveal'); // Balanced
} else {
  setAnimationMode('ai-morph-simple'); // Best quality
}
```

### Example 3: Cost-Based Selection

```javascript
import { getEstimatedCost, setAnimationMode } from '@/lib/animation-manager';

const userTier = getUserTier(); // 'free' | 'premium'

if (userTier === 'premium') {
  setAnimationMode('ai-morph-simple'); // $0.04/scan
} else {
  setAnimationMode('burn-to-coal'); // Free
}
```

---

## Summary

- **10 modes** available (7 free, 2 AI-powered, 1 disabled)
- **3 NEW modes** added: Burn to Coal, Spin Reveal, Melt Down
- **Admin panel** for easy mode switching and testing
- **Performance tier detection** for device-adaptive selection
- **Cost tracking** for AI-powered modes
- **Persistent storage** via localStorage
- **Extensible** - easy to add new modes

For questions or issues, see [CLAUDE.md](../CLAUDE.md) debugging section.
