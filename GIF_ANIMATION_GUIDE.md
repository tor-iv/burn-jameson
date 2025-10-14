# 🔥 GIF Fire Animation Setup Guide

## ✅ System Ready!

The new GIF-based burn animation system is installed and configured. You just need to add a fire GIF!

## What You Need

**A fire GIF file** that will be layered multiple times to create a dramatic burn effect.

### Quick Setup (2 minutes):

1. **Find a fire GIF** (recommendations below)
2. **Save it** as `/public/animations/fire.gif`
3. **Test** at http://localhost:3000/scan

That's it! The component will automatically create multiple layered effects.

## Where to Get Fire GIFs

### Option 1: GIPHY (Free, Easy)
1. Go to [giphy.com](https://giphy.com)
2. Search: "fire burning" or "flame animation"
3. Find one you like
4. Click "Download" → Select GIF format
5. Save as `fire.gif` in `/public/animations/`

### Option 2: Tenor (Free, Easy)
1. Go to [tenor.com](https://tenor.com)
2. Search: "fire" or "burning flames"
3. Download as GIF
4. Save to `/public/animations/fire.gif`

### Option 3: Free Stock Sites
- [Pixabay](https://pixabay.com) - Search "fire GIF"
- [Pexels](https://pexels.com) - Has video, can convert to GIF

## Recommended Fire GIF Characteristics

✅ **Visual Style:**
- Realistic fire (not cartoon)
- Orange/red/yellow colors
- Transparent or black background
- Vertical flames preferred

✅ **Technical Specs:**
- Format: GIF
- Size: 500-1000px wide
- File size: 500KB - 5MB
- FPS: 20-30
- Loop: Yes

## How the Animation Works

The component creates **5 layered fire effects**:

1. **Main Fire Layer** - Travels bottom to top over 5 seconds
2. **Left Edge Fire** - Flickering flames on left side
3. **Right Edge Fire** - Flickering flames on right side
4. **Center Intense Fire** - Bright core flames with scaling
5. **Burn-Through Darkening** - Dark overlay showing burn damage
6. **Orange Glow** - Radial glow for ambient effect

### Blend Modes & Effects:
- `screen` blend mode for fire (adds light)
- `multiply` blend mode for darkening
- Dynamic filters: brightness, saturation, hue rotation
- Animated opacity, position, and scale

## Animation Features

### ⏱️ **Timing:**
- Total duration: 5 seconds
- Travels from bottom to top
- Multiple staggered animations
- Auto-stops after completion

### 🎨 **Visual Effects:**
- Multiple fire layers with different filters
- Screen blend mode for realistic fire
- Hue rotation for color variation
- Brightness and contrast adjustments
- Flip/mirror for variety

### 📍 **Positioning:**
- Auto-fits detected bottle bounding box
- Covers entire bottle height
- Edge flames extend beyond edges
- Center fire focused on middle

## Customization

### Adjust Animation Speed

Edit `/components/GifBurnAnimation.tsx`:

```tsx
// Change duration from 5 to 3 seconds (faster)
transition={{
  duration: 3,  // Was 5
  ease: "linear",
}}
```

### Adjust Fire Intensity

```tsx
// Make fire brighter
style={{
  filter: "brightness(2.0) contrast(1.5)",  // Increase values
}}
```

### Add More Fire Layers

Duplicate any fire layer block and adjust position:

```tsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="absolute inset-0"
  style={{ mixBlendMode: "screen" }}
>
  <img src="/animations/fire.gif" className="w-full h-full object-cover" />
</motion.div>
```

## File Structure

```
/public/animations/
  fire.gif         ← ADD THIS FILE
  fire-burn.json   (old Lottie, not used anymore)
  burning.html     (not used)

/components/
  GifBurnAnimation.tsx  ← New component (ready)

/app/scanning/[sessionId]/
  page.tsx  ← Updated to use GIF animation
```

## Testing

1. Add `fire.gif` to `/public/animations/`
2. Server should be running at http://localhost:3000
3. Navigate to `/scan`
4. Point at Jameson bottle
5. Watch the multi-layered fire effect!

## Troubleshooting

### GIF not showing?
```bash
# Check file exists
ls -la public/animations/fire.gif

# Verify it's a real GIF
file public/animations/fire.gif
# Should say: "GIF image data"
```

### Animation too fast/slow?
- Edit `duration` values in `GifBurnAnimation.tsx`
- Default is 5 seconds

### Fire too dim/bright?
- Adjust `filter` properties
- Adjust `opacity` values in animations

### Need different blend effect?
Change `mixBlendMode`:
- `screen` - Adds light (fire effect)
- `lighten` - Only lighter pixels show
- `color-dodge` - Very bright effect
- `normal` - No blending

## Performance Tips

- Keep GIF file size under 5MB
- Optimize GIF with tools like [ezgif.com](https://ezgif.com)
- Lower frame rate if too heavy (15-20 FPS is fine)
- Reduce dimensions if needed (500-800px wide)

## Example Fire GIF Search Terms

Search these on GIPHY or Tenor:
- "realistic fire"
- "burning flames"
- "fire loop"
- "campfire animation"
- "torch fire"
- "flame effect"

## Converting Video to GIF

If you find a fire video:
1. Use [ezgif.com/video-to-gif](https://ezgif.com/video-to-gif)
2. Upload video
3. Set size to 800px wide
4. Select 5-second portion
5. Set FPS to 20-25
6. Download GIF

## Next Steps

1. 🔥 **Download a fire GIF** from GIPHY/Tenor
2. 💾 **Save as** `/public/animations/fire.gif`
3. 🧪 **Test** at http://localhost:3000/scan
4. 🎨 **Customize** if needed (brightness, speed, etc.)
5. 🚀 **Deploy!**

---

**Current Status**:
- ✅ GIF animation system ready
- ✅ Component created with 5+ fire layers
- ✅ Auto-positioned over detected bottle
- ⏳ **Waiting for fire.gif file**

**Server**: http://localhost:3000 (running)
