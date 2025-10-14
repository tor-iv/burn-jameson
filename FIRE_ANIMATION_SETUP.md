# 🔥 Fire Animation Setup Guide

## ✅ System is Ready!

The Lottie animation system is fully installed and configured. You just need to add a realistic fire animation.

## Quick Start: Download a Professional Fire Animation

### Option 1: Use a Free Lottie Animation (Easiest)

Visit **[LottieFiles.com](https://lottiefiles.com)** and search for fire animations:

#### Recommended Fire Animations:

1. **Search Terms**: "fire burn", "burning flame", "fire effect", "flame animation"

2. **What to Look For**:
   - ✅ Vertical movement (bottom to top)
   - ✅ Orange/red/yellow colors
   - ✅ Smooth animation
   - ✅ Transparent background
   - ✅ 3-5 second duration

3. **Download Steps**:
   - Click on animation you like
   - Click "Download" → "Lottie JSON"
   - Save as `fire-burn.json`
   - Replace `/public/animations/fire-burn.json` with your download

#### Top Recommended Lottie Files:

**Search these on LottieFiles.com:**
- "Fire Flame" by LottieFiles
- "Burning Fire" animations
- "Flame Effect" animations
- "Fire Loop" animations

### Option 2: Create in After Effects (Best Quality)

If you want a custom animation that perfectly matches your brand:

#### 1. After Effects Setup
```
Composition Settings:
- Width: 800px
- Height: 1200px (bottle shape)
- Duration: 5 seconds
- Frame Rate: 30fps
```

#### 2. Design the Fire Effect

**Layer Structure** (bottom to top):
1. **Burn-through Layer** - Dark brown/black that reveals burned area
2. **Core Fire Layer** - Bright orange flames
3. **Hot Spots Layer** - Yellow-white hottest parts
4. **Flicker Layers** - Edge flames that dance
5. **Smoke Layer** (optional) - Gray wisps at top

**Animation Keyframes:**
```
0:00 - Fire starts at bottom (y: 100%)
0:30 - Fire reaches 20% up bottle
1:00 - Fire reaches 40% up bottle
2:00 - Fire reaches 60% up bottle
3:00 - Fire reaches 80% up bottle
4:00 - Fire reaches 95% up bottle
5:00 - Fire covers entire bottle (y: 0%)
```

**Effects to Add:**
- Turbulent Displace (for organic movement)
- Glow (for realistic fire luminance)
- Color gradients (orange → yellow → white)
- Scale/Rotation keyframes (for flickering)

#### 3. Export with Bodymovin

1. Install **Bodymovin** plugin:
   - Window → Extensions → Bodymovin

2. Select your composition

3. Export Settings:
   ```
   ✅ Glyphs
   ✅ Hidden Layers
   ✅ Split
   Compression: Standard
   ```

4. Click **Render** → saves as `fire-burn.json`

5. Copy to project:
   ```bash
   cp fire-burn.json /Users/torcox/burn-jameson/public/animations/
   ```

## Current Animation Status

- ✅ Lottie system installed
- ✅ Component created ([LottieBurnAnimation.tsx](components/LottieBurnAnimation.tsx))
- ✅ Integrated into scanning page
- ⏳ **Needs realistic fire animation JSON**

## Testing Your Animation

1. Add your `fire-burn.json` to `/public/animations/`
2. Server should be running at `http://localhost:3000`
3. Navigate to `/scan`
4. Point camera at Jameson bottle
5. Watch your fire animation!

## Animation Specifications

### Required Properties:
- **File**: `/public/animations/fire-burn.json`
- **Duration**: 5 seconds (150 frames at 30fps)
- **Size**: 800x1200px (portrait/bottle shaped)
- **Direction**: Bottom → Top
- **Loop**: false (plays once)
- **Autoplay**: true

### Visual Requirements:
- Flames should travel from bottom to top
- Orange/red/yellow fire colors
- Smooth progression over 5 seconds
- Realistic flickering and movement
- Should cover entire vertical space

## Customization Options

### Adjust Animation Speed

Edit `components/LottieBurnAnimation.tsx`:

```tsx
<Lottie
  animationData={fireAnimation}
  loop={false}
  autoplay={true}
  speed={1.5}  // 1.5x faster, or 0.5 for slower
/>
```

### Add Animation Callbacks

```tsx
<Lottie
  animationData={fireAnimation}
  loop={false}
  autoplay={true}
  onComplete={() => {
    console.log('Fire animation completed!');
    // Trigger next action
  }}
/>
```

### Control Playback Programmatically

```tsx
const lottieRef = useRef<LottieRefCurrentProps>(null);

// Play/Pause
lottieRef.current?.play();
lottieRef.current?.pause();

// Jump to specific frame
lottieRef.current?.goToAndPlay(50, true);

// Change speed
lottieRef.current?.setSpeed(2);
```

## File Size Guidelines

- **Simple**: 20-50KB - Basic shapes, minimal keyframes
- **Medium**: 50-150KB - Good detail, smooth animation
- **Complex**: 150-300KB - Highly detailed, many layers

If file is too large:
1. Reduce number of keyframes
2. Simplify shapes
3. Remove unused layers
4. Use shape layers instead of precomps

## Troubleshooting

### Animation not showing?
```bash
# Check file exists
ls -la public/animations/fire-burn.json

# Verify JSON is valid
cat public/animations/fire-burn.json | python -m json.tool
```

### Animation playing too fast/slow?
- Add `speed` prop to Lottie component
- Or edit JSON `"fr"` (frame rate) value

### Animation not covering full bottle?
- Check that animation canvas is 800x1200px
- Verify layers animate from y:600 to y:-600

### Colors look wrong?
- Lottie uses RGB values from 0-1, not 0-255
- Example: Orange = [1, 0.5, 0] not [255, 128, 0]

## Example Fire Colors (0-1 RGB)

```
Dark Red/Ember:   [0.9, 0.2, 0]
Orange:           [1, 0.5, 0.05]
Bright Orange:    [1, 0.7, 0.2]
Yellow:           [1, 0.9, 0.3]
Hot White:        [1, 1, 0.9]
Burn Brown:       [0.1, 0.05, 0]
```

## Resources

- 🎨 [LottieFiles.com](https://lottiefiles.com) - Free animations
- 📚 [Lottie Docs](https://airbnb.io/lottie/) - Official documentation
- 🔧 [Bodymovin Plugin](https://github.com/airbnb/lottie-web) - After Effects export
- 📖 [AE to Lottie Guide](https://lottiefiles.com/blog/working-with-lottie/after-effects-to-lottie-ultimate-guide)

## Next Steps

1. ⭐ **Download a fire animation** from LottieFiles.com
2. 📥 Save as `/public/animations/fire-burn.json`
3. 🧪 Test on http://localhost:3000/scan
4. 🎨 If needed, customize or create in After Effects
5. 🚀 Deploy!

---

**Current Status**: System ready, waiting for fire animation JSON file! 🔥
