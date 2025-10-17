# Bounding Box Improvements: Getting Accurate Bottle Contours

## The Problem

**Current State:** Fire animation uses a rectangular bounding box that doesn't follow the actual bottle shape.

```
Current (Rectangle):          Desired (Contour):
┌─────────────┐                   ╱─────╲
│   ╱─────╲   │                  │       │
│  │       │  │                  │BOTTLE │
│  │BOTTLE │  │                  │       │
│  │       │  │                   ╲_____╱
│   ╲_____╱   │
└─────────────┘
   ↑ Empty space                 ↑ Precise shape
```

**Issues:**
- Fire animation extends into empty space around bottle
- Doesn't conform to bottle's cylindrical shape
- Looks less realistic for bottles at angles
- Rectangle doesn't reach all the way to bottle top/edges accurately

## Is YOLO v12 Overkill? **YES**

### Why Full YOLO Implementation is Overkill

1. **You already have working detection** - Google Vision OBJECT_LOCALIZATION works well
2. **Speed isn't critical** - Users capture one photo, not real-time video streaming
3. **Current cost is negligible** - $15/month for 10,000 scans isn't a problem
4. **Training burden is high** - Requires:
   - Collecting 500-1000 images of whiskey bottles
   - Manual annotation of each image
   - Training infrastructure (GPU)
   - Ongoing maintenance as bottle designs change
   - Model hosting/deployment
5. **The real issue isn't detection speed** - It's **shape accuracy** (contour vs rectangle)

### What YOLO Would Give You

**Pros:**
- 100-300x faster inference (1.64ms vs 200-500ms)
- Can be trained on specific whiskey brands
- Oriented Bounding Boxes (OBB) - can detect angled bottles better
- Potential for client-side deployment (no API calls)

**Cons:**
- Significant upfront work (weeks)
- Still gives you a **bounding box**, not a contour mask (unless using YOLO segmentation variant)
- Need to maintain training dataset
- More complex deployment (model hosting, versioning)
- Additional infrastructure costs

**Verdict:** YOLO solves the wrong problem. You don't need faster detection, you need **better shape representation**.

---

## Practical Solutions (Ranked: Easiest → Best)

### **Solution 1: Check Existing Google Vision Polygon Data (EASIEST)**

**Complexity:** Very Low (15 minutes)
**Cost:** $0
**Accuracy:** Medium

#### What to Do

Google Vision's `boundingPoly` might already return polygon vertices (not just 4 corners of a rectangle).

**Test this first:**

```typescript
// In app/api/detect-bottle/route.ts, add logging:
console.log('Full boundingPoly structure:', JSON.stringify(bottleObject.boundingPoly, null, 2));

// Check if you get:
// Option A (Polygon - GOOD):
{
  "vertices": [
    { "x": 150, "y": 50 },
    { "x": 180, "y": 55 },
    { "x": 185, "y": 400 },
    { "x": 145, "y": 405 },
    { "x": 140, "y": 300 },
    // ... more vertices following bottle contour
  ]
}

// Option B (Rectangle - need better solution):
{
  "vertices": [
    { "x": 150, "y": 50 },
    { "x": 200, "y": 50 },
    { "x": 200, "y": 400 },
    { "x": 150, "y": 400 }
  ]
}
```

**If you have polygon data (Option A):**

1. **Update detection API response:**
```typescript
return {
  // ... existing fields
  boundingPolygon: bottleObject.boundingPoly.vertices, // Array of {x, y} points
};
```

2. **Update fire animation to use polygon clipping:**
```typescript
// In EnhancedFireAnimation.tsx
interface Props {
  boundingBox: { x, y, width, height }; // Keep for fallback
  boundingPolygon?: Array<{ x: number; y: number }>; // New!
}

// Generate CSS clip-path from polygon
const polygonPoints = props.boundingPolygon
  ?.map(p => `${(p.x / imageWidth) * 100}% ${(p.y / imageHeight) * 100}%`)
  .join(', ');

const containerStyle = {
  position: "absolute",
  clipPath: polygonPoints ? `polygon(${polygonPoints})` : undefined,
  // ... rest of styles
};
```

**Pros:**
- Zero additional API calls or libraries
- No cost
- Instant improvement if data is available

**Cons:**
- Only works if Google Vision returns detailed polygon (not guaranteed)
- May still be a simple rectangle (4 vertices)
- Limited to what Google Vision provides

**Recommendation:** **Try this first!** Takes 15 minutes to verify if the data is already there.

---

### **Solution 2: Gemini 2.5 Segmentation (RECOMMENDED)**

**Complexity:** Medium (2-3 days)
**Cost:** Low (~$0.001-0.01 per image)
**Accuracy:** High (pixel-perfect bottle contours)

#### Why Gemini 2.5?

**Major Discovery:** Gemini 2.5 (released late 2024) has **built-in object segmentation** that returns:
- Bounding box
- Object label
- **Base64 encoded PNG segmentation mask** (exact bottle shape!)

This is exactly what you need: a pixel-perfect mask of the bottle.

#### How It Works

```
User captures photo
       ↓
Google Vision API (brand detection)
       ↓
Gemini 2.5 API (bottle segmentation mask)
       ↓
Fire animation uses mask (fire only shows through bottle shape)
```

#### Implementation Overview

**1. New API endpoint:**
```typescript
// app/api/segment-bottle/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const image = formData.get('image') as Blob;

  const imageBuffer = Buffer.from(await image.arrayBuffer());

  // Initialize Gemini
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  // Request segmentation
  const prompt = `Detect and segment the whiskey bottle in this image.
                  Return a precise segmentation mask showing only the bottle.`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: "image/jpeg"
      }
    }
  ]);

  // Gemini 2.5 returns JSON with:
  // - boundingBox: { x, y, width, height }
  // - label: "bottle"
  // - segmentationMask: "base64 PNG data"

  const response = await result.response;
  const segmentationData = JSON.parse(response.text());

  return NextResponse.json({
    success: true,
    mask: segmentationData.segmentationMask, // Base64 PNG
    boundingBox: segmentationData.boundingBox,
  });
}
```

**2. Update detect-bottle flow:**
```typescript
// In app/api/detect-bottle/route.ts
// After getting brand from Google Vision:

// Get segmentation mask from Gemini
const maskResponse = await fetch('/api/segment-bottle', {
  method: 'POST',
  body: formData, // Same image
});

const maskData = await maskResponse.json();

return NextResponse.json({
  // ... existing brand detection results
  segmentationMask: maskData.mask, // Add mask to response
});
```

**3. Use mask in fire animation:**
```typescript
// In EnhancedFireAnimation.tsx
interface Props {
  boundingBox: { x, y, width, height };
  segmentationMask?: string; // Base64 PNG mask
  imageUrl: string;
}

// Apply mask to fire canvas
const containerStyle = {
  position: "absolute",
  left: `${boundingBox.x * 100}%`,
  top: `${boundingBox.y * 100}%`,
  width: `${boundingBox.width * 100}%`,
  height: `${boundingBox.height * 100}%`,
  maskImage: segmentationMask ? `url(${segmentationMask})` : undefined,
  WebkitMaskImage: segmentationMask ? `url(${segmentationMask})` : undefined,
  // Fire will only render where mask is white (bottle area)!
};
```

**4. Alternative: Use mask as canvas clipping:**
```typescript
// In fire drawing code:
if (segmentationMask) {
  // Load mask image
  const maskImg = new Image();
  maskImg.src = segmentationMask;

  await maskImg.decode();

  // Use as clipping mask
  fctx.save();
  fctx.drawImage(maskImg, 0, 0, W(), H());
  fctx.globalCompositeOperation = 'source-in';
  // Draw fire (will be clipped to mask shape)
  drawFire(now);
  fctx.restore();
}
```

#### What You Get

**Mask Structure:**
- PNG image (same dimensions as source photo)
- White pixels = bottle
- Black pixels = background
- Follows exact bottle contour (curves, neck, base)

**Visual:**
```
Mask PNG:                Fire Animation:
████████████
█          █
█  ╱────╲  █               ╱────╲
█ │      │ █   +  🔥  =   │  🔥  │
█ │BOTTLE│ █               │  🔥  │
█ │      │ █               │  🔥  │
█  ╲____╱  █                ╲🔥🔥╱
█          █
████████████
(White = bottle)        (Fire clipped to mask)
```

#### Pros

✅ **Pixel-perfect accuracy** - follows exact bottle shape
✅ **Works on any bottle** - no training needed
✅ **Handles angles** - bottles at any orientation
✅ **Easy integration** - similar to current Google Vision API
✅ **Fast inference** - Gemini 2.5 Flash is optimized for speed (~200-500ms)
✅ **Low cost** - ~$0.001-0.01 per image (cheaper than training custom YOLO)
✅ **Maintained by Google** - no model maintenance burden

#### Cons

⚠️ **New API dependency** - need Gemini API key (separate from Google Vision)
⚠️ **Additional API call** - adds latency (~200-500ms)
⚠️ **Cost per scan** - small but ongoing (vs one-time YOLO training)
⚠️ **Learning curve** - need to understand Gemini API response format

#### Cost Comparison

**Gemini 2.5 Segmentation:**
- Flash model: ~$0.001 per image (1000 images = $1)
- 10,000 scans/month = $10/month
- **Total with Google Vision:** $15 (Vision) + $10 (Gemini) = **$25/month**

**Custom YOLO:**
- Training: Free (own hardware) or $50-200 (cloud GPU)
- Hosting: $20-50/month (inference server)
- Maintenance: Developer time (hours/month)
- **Total:** $50-100/month + developer time

**Current (Rectangle boxes):**
- Google Vision only: $15/month
- No additional work

**Verdict:** Gemini adds $10/month but gives dramatically better results without training burden.

#### Implementation Timeline

- **Day 1:** Set up Gemini API, test segmentation on sample bottles
- **Day 2:** Integrate into detect-bottle flow, handle mask response
- **Day 3:** Update fire animation to use mask, test on various bottles
- **Total:** 2-3 days

---

### **Solution 3: Edge Detection Refinement (BACKUP)**

**Complexity:** Low-Medium (1-2 days)
**Cost:** $0
**Accuracy:** Medium

#### Concept

Use OpenCV-style edge detection to refine the Google Vision bounding box on the server.

#### How It Works

```
Google Vision gives rough box
       ↓
Crop image to that region
       ↓
Run edge detection (Canny algorithm)
       ↓
Find bottle contours
       ↓
Fit tighter polygon around bottle
       ↓
Return refined bounding box
```

#### Implementation

**Install dependencies:**
```bash
npm install opencv4nodejs
# or
npm install @u4/opencv4nodejs  # Lighter alternative
```

**Create refinement function:**
```typescript
// lib/refine-bottle-bounds.ts
import cv from '@u4/opencv4nodejs';

export async function refineBoundingBox(
  imageBuffer: Buffer,
  roughBox: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number
) {
  // Convert normalized to pixel coordinates
  const pixelBox = {
    x: Math.floor(roughBox.x * imageWidth),
    y: Math.floor(roughBox.y * imageHeight),
    width: Math.floor(roughBox.width * imageWidth),
    height: Math.floor(roughBox.height * imageHeight),
  };

  // Load image
  const mat = cv.imdecode(imageBuffer);

  // Crop to rough bounding box
  const cropped = mat.getRegion(new cv.Rect(
    pixelBox.x,
    pixelBox.y,
    pixelBox.width,
    pixelBox.height
  ));

  // Convert to grayscale
  const gray = cropped.cvtColor(cv.COLOR_BGR2GRAY);

  // Apply Gaussian blur to reduce noise
  const blurred = gray.gaussianBlur(new cv.Size(5, 5), 0);

  // Edge detection
  const edges = blurred.canny(50, 150);

  // Find contours
  const contours = edges.findContours(
    cv.RETR_EXTERNAL,
    cv.CHAIN_APPROX_SIMPLE
  );

  // Find largest contour (likely the bottle)
  let largestContour = contours[0];
  let maxArea = 0;

  for (const contour of contours) {
    const area = contour.area;
    if (area > maxArea) {
      maxArea = area;
      largestContour = contour;
    }
  }

  // Get rotated rectangle around contour
  const rotatedRect = largestContour.minAreaRect();

  // Convert back to normalized coordinates
  const refinedBox = {
    x: (pixelBox.x + rotatedRect.center.x - rotatedRect.size.width / 2) / imageWidth,
    y: (pixelBox.y + rotatedRect.center.y - rotatedRect.size.height / 2) / imageHeight,
    width: rotatedRect.size.width / imageWidth,
    height: rotatedRect.size.height / imageHeight,
    angle: rotatedRect.angle, // Bottle rotation angle!
  };

  return refinedBox;
}
```

**Integrate into detect-bottle:**
```typescript
// In app/api/detect-bottle/route.ts
const normalizedBoundingBox = normalizeBoundingPoly(boundingBox, dimensions);

// NEW: Refine the bounding box
const refinedBoundingBox = await refineBoundingBox(
  buffer,
  normalizedBoundingBox,
  dimensions.width!,
  dimensions.height!
);

return NextResponse.json({
  // ... existing fields
  normalizedBoundingBox,
  refinedBoundingBox, // Add refined version
});
```

#### Pros

✅ **No additional API calls** - all processing server-side
✅ **No cost** - uses open-source OpenCV
✅ **Tighter boxes** - better fit than Google Vision's rough box
✅ **Can detect rotation** - handles angled bottles
✅ **Works with current flow** - extends Google Vision, doesn't replace it

#### Cons

⚠️ **Still rectangular** - doesn't give true contour mask
⚠️ **Adds processing time** - ~50-100ms per image
⚠️ **Requires OpenCV** - native dependency (can be tricky to install)
⚠️ **May fail on complex backgrounds** - edge detection can be noisy
⚠️ **Medium accuracy** - better than raw box, worse than segmentation mask

#### When to Use This

- If Gemini 2.5 segmentation doesn't work well for your bottles
- If you want to avoid additional API costs
- If you need a quick improvement without learning new APIs
- As a fallback if segmentation services fail

---

### **Solution 4: SAM 2 (Segment Anything Model) (ADVANCED)**

**Complexity:** High (3-5 days)
**Cost:** Medium ($0.005-0.02 per image via Replicate, or self-hosting costs)
**Accuracy:** Very High (best possible segmentation)

#### What is SAM 2?

Meta's "Segment Anything Model 2" is the state-of-the-art for object segmentation. It can generate pixel-perfect masks for **any object** with just a simple prompt (point, box, or text).

**Key Features:**
- Trained on billions of masks
- Works on any object (not just pre-trained classes)
- Can segment with minimal prompting
- Very accurate, even with challenging backgrounds

#### Implementation via Replicate API

**1. Sign up for Replicate:**
- https://replicate.com
- Get API key
- ~$0.005-0.02 per prediction

**2. Create segmentation endpoint:**
```typescript
// app/api/segment-bottle-sam/route.ts
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const image = formData.get('image') as Blob;
  const boundingBox = JSON.parse(formData.get('boundingBox') as string);

  const imageBuffer = Buffer.from(await image.arrayBuffer());
  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:image/jpeg;base64,${base64Image}`;

  // Call Replicate SAM 2
  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: "sam-2-model-version-id", // Get from Replicate docs
      input: {
        image: dataUrl,
        box: [
          boundingBox.x,
          boundingBox.y,
          boundingBox.x + boundingBox.width,
          boundingBox.y + boundingBox.height,
        ],
      },
    }),
  });

  const prediction = await response.json();

  // Wait for result (or poll)
  // Returns: mask image URL

  return NextResponse.json({
    maskUrl: prediction.output.mask_url,
  });
}
```

**3. Use in detection flow:**
```typescript
// After Google Vision detection:
const roughBox = normalizedBoundingBox;

// Get precise mask from SAM 2
const samResponse = await fetch('/api/segment-bottle-sam', {
  method: 'POST',
  body: JSON.stringify({
    image: imageBase64,
    boundingBox: roughBox,
  }),
});

const samData = await samResponse.json();

return {
  // ... brand detection
  segmentationMask: samData.maskUrl,
};
```

#### Pros

✅ **Best-in-class accuracy** - state-of-the-art segmentation
✅ **Works on any bottle** - no training needed
✅ **Handles complex cases** - partial occlusion, weird angles, poor lighting
✅ **Production-ready** - hosted API, no maintenance
✅ **Flexible prompting** - can use box, point, or text prompt

#### Cons

⚠️ **Higher cost** - ~$0.005-0.02 per image (2-20x more than Gemini)
⚠️ **Third-party dependency** - relies on Replicate or self-hosting
⚠️ **Slower inference** - ~1-3 seconds per image
⚠️ **More complex integration** - async predictions, polling for results
⚠️ **Overkill for most cases** - unless you need absolute best accuracy

#### Cost Comparison

**SAM 2 via Replicate:**
- $0.01 per image (average)
- 10,000 scans/month = $100/month
- **Total:** $115/month (Vision $15 + SAM $100)

**Self-Hosted SAM 2:**
- GPU instance: $50-200/month
- Inference time: ~1-3 sec per image
- Need to manage infrastructure

**Verdict:** Only worth it if Gemini segmentation isn't accurate enough and you need the absolute best results.

---

### **Solution 5: Custom YOLO Segmentation Model (OVERKILL)**

**Complexity:** Very High (2-4 weeks)
**Cost:** High (training + hosting)
**Accuracy:** High (customizable)

#### Why This is Overkill

This is the full custom ML pipeline approach. Only consider if:
- You need sub-50ms inference times (real-time video)
- You want to run entirely client-side (no API calls)
- You have specific accuracy requirements not met by other solutions
- You have in-house ML expertise

#### What's Involved

**1. Dataset Creation (1-2 weeks):**
- Collect 500-1000 images of whiskey bottles
- Manual annotation with segmentation masks (not just boxes)
- Tools: Label Studio, Roboflow, CVAT
- Split: 70% train, 20% validation, 10% test

**2. Model Training (2-5 days):**
- Fine-tune YOLOv11/v12 segmentation model
- Or use YOLOv8-seg (has segmentation variant)
- Requires GPU (cloud or local)
- Hyperparameter tuning
- Model validation

**3. Deployment (3-5 days):**
- Export to ONNX for browser deployment
- Or host on inference server
- CDN for model distribution
- Fallback mechanisms

**4. Ongoing Maintenance:**
- Retrain as bottle designs change
- Monitor accuracy drift
- Update dataset
- Model versioning

#### Pros

✅ **Fastest inference** - <50ms on GPU, ~100-200ms on CPU
✅ **Client-side possible** - ONNX.js in browser, no API calls
✅ **Full control** - customize for exact use case
✅ **Multi-task** - can detect brand + segment simultaneously
✅ **Scales** - no per-request costs once deployed

#### Cons

⚠️ **Huge upfront investment** - weeks of work
⚠️ **Dataset creation** - hundreds of hours of annotation
⚠️ **Requires ML expertise** - not a "learn as you go" project
⚠️ **Ongoing maintenance** - continuous work
⚠️ **Infrastructure complexity** - model hosting, versioning, CDN
⚠️ **Solves wrong problem** - you don't need speed, you need accuracy

**Verdict:** **Don't do this unless you have very specific requirements that aren't met by pre-trained models.**

---

## Comparison Table

| Solution | Accuracy | Speed | Cost | Complexity | Time to Deploy | Recommendation |
|----------|----------|-------|------|------------|----------------|----------------|
| **Check existing vertices** | ⭐⭐⭐ | ⚡⚡⚡⚡⚡ | 💰 Free | 🔧 Very Low | 15 min | **Try first!** |
| **Gemini 2.5 segmentation** | ⭐⭐⭐⭐⭐ | ⚡⚡⚡⚡ | 💰💰 Low | 🔧🔧 Medium | 2-3 days | **Best choice** |
| **Edge detection refinement** | ⭐⭐⭐ | ⚡⚡⚡⚡ | 💰 Free | 🔧🔧 Medium | 1-2 days | Good backup |
| **SAM 2** | ⭐⭐⭐⭐⭐ | ⚡⚡⚡ | 💰💰💰 Medium | 🔧🔧🔧 High | 3-5 days | If Gemini fails |
| **Custom YOLO** | ⭐⭐⭐⭐ | ⚡⚡⚡⚡⚡ | 💰💰💰💰 High | 🔧🔧🔧🔧🔧 Very High | 2-4 weeks | **Overkill** |

---

## Recommended Implementation Path

### Phase 1: Quick Test (15 minutes)

```typescript
// Add logging to detect-bottle/route.ts
console.log('Bounding poly structure:', JSON.stringify(bottleObject.boundingPoly, null, 2));
```

**Check if vertices form a polygon:**
- If yes → Use directly (Solution 1)
- If no (just rectangle) → Proceed to Phase 2

### Phase 2: Gemini 2.5 Integration (2-3 days) - **RECOMMENDED**

1. **Day 1:** Set up Gemini API, test segmentation
   - Create `/api/segment-bottle` route
   - Test on 10-20 sample bottles
   - Verify mask quality

2. **Day 2:** Integrate into detection flow
   - Call Gemini after Google Vision
   - Return mask in API response
   - Handle errors and fallbacks

3. **Day 3:** Update fire animation
   - Apply mask to fire canvas
   - Test on various bottle shapes
   - Verify performance

**Expected Results:**
- Pixel-perfect bottle contours
- Fire animation follows exact bottle shape
- Total cost: +$10/month
- Minimal maintenance burden

### Phase 3: Fallback (if needed)

If Gemini doesn't work well:
- Try Solution 3 (Edge detection refinement) - 1-2 days
- Or Solution 4 (SAM 2) if you need best accuracy - 3-5 days

**Do NOT implement custom YOLO unless:**
- You've tried all other solutions
- You have specific requirements (real-time video, client-side only)
- You have ML expertise in-house
- You have budget for weeks of development

---

## Technical Comparison: Segmentation Methods

### Bounding Box (Current)
```
Output: { x: 0.3, y: 0.2, width: 0.4, height: 0.6 }
Representation: Rectangle
Accuracy: Low-Medium
Use case: Fast detection, general location
```

### Polygon (Solution 1)
```
Output: [
  { x: 0.30, y: 0.20 },
  { x: 0.35, y: 0.18 },
  { x: 0.70, y: 0.22 },
  { x: 0.68, y: 0.80 },
  { x: 0.32, y: 0.78 }
]
Representation: Multi-point polygon
Accuracy: Medium
Use case: Better fit than rectangle, still simplified
```

### Segmentation Mask (Solutions 2, 4, 5)
```
Output: PNG image (base64 or URL)
- White pixels = bottle
- Black pixels = background
- Can have 1000s of pixels defining exact edge
Representation: Pixel-perfect mask
Accuracy: Very High
Use case: Exact shape conformity, realistic effects
```

**Visual Comparison:**
```
Bounding Box:        Polygon:            Segmentation Mask:
┌─────────┐         ╱───────╲           ░░░░░░░░
│  ╱───╲  │        ╱         ╲          ░░╱───╲░░
│ │     │ │       │           │         ░│     │░
│ │  B  │ │       │     B     │         ░│  B  │░
│ │     │ │       │           │         ░│     │░
│  ╲___╱  │        ╲         ╱          ░░╲___╱░░
└─────────┘         ╲───────╱           ░░░░░░░░

~40% empty space   ~20% empty space    0% empty space
```

---

## Cost-Benefit Analysis

### Current System (Rectangle boxes)
**Cost:** $15/month (Google Vision)
**Benefit:** Basic detection works
**Problem:** Fire animation doesn't match bottle shape

### Recommended: Gemini 2.5 Segmentation
**Cost:** $25/month ($15 Vision + $10 Gemini)
**Benefit:** Pixel-perfect bottle masks, dramatic visual improvement
**ROI:** $10/month for professional-quality animation = **Worth it**

### Alternative: Edge Detection
**Cost:** $15/month (just Vision)
**Benefit:** Slightly better boxes, no additional API cost
**ROI:** Free improvement, but limited accuracy gain

### Overkill: Custom YOLO
**Cost:** $100+/month + weeks of dev time
**Benefit:** Fastest inference, full control
**ROI:** **Negative** - spending $1000+ to save $10/month

---

## Final Recommendation

### Do This:

1. ✅ **First (15 min):** Check if Google Vision already gives you polygon vertices
2. ✅ **If not (2-3 days):** Implement Gemini 2.5 segmentation
3. ✅ **Test thoroughly:** Verify masks work on all target bottle brands

### Don't Do This:

❌ **Custom YOLO training** - massive overkill for your use case
❌ **SAM 2** - only if Gemini fails (which is unlikely)
❌ **Complex ML pipeline** - you don't need it

### Why This is the Right Approach:

**Problem:** Fire animation doesn't follow bottle shape
**Root Cause:** Using rectangular bounding box
**Solution:** Get segmentation mask (exact bottle outline)
**Best Tool:** Gemini 2.5 (easy, accurate, affordable)

**You don't need:**
- ❌ Faster detection (speed is fine)
- ❌ Custom training (pre-trained works great)
- ❌ Complex infrastructure (API calls are fine)

**You do need:**
- ✅ Better shape accuracy (segmentation vs box)
- ✅ Easy integration (Gemini API is simple)
- ✅ Reliable results (Google-maintained model)

---

## Expected Results After Implementation

### Before (Rectangle box):
```
Fire animation:
┌─────────────┐
│🔥🔥 ╱─╲ 🔥🔥│  ← Fire in empty space
│🔥  │   │  🔥│  ← Doesn't match bottle
│🔥  │BOT│  🔥│
│🔥   ╲─╱   🔥│
└─────────────┘
User perception: "Looks okay but not quite right"
```

### After (Segmentation mask):
```
Fire animation:
    ╱─────╲
   🔥│     │🔥    ← Fire follows bottle edge
   🔥│ BOT │🔥    ← Precise shape match
   🔥│     │🔥    ← Professional look
    🔥╲───╱🔥
     🔥🔥🔥
User perception: "Wow, that looks realistic!"
```

**Impact:**
- More immersive user experience
- Better brand impression (looks premium)
- Higher engagement (visual quality matters)
- Small cost increase ($10/month) for big quality jump

---

## Summary

**Question:** Should we use YOLO v12 for better bounding boxes?

**Answer:** **No, YOLO is overkill.** Instead:

1. **Check existing data** - Google Vision might already give you polygons (15 min)
2. **Use Gemini 2.5 segmentation** - Get pixel-perfect bottle masks (2-3 days, +$10/month)
3. **Fallback to edge detection** - If Gemini doesn't work (1-2 days, $0)

**Don't build custom YOLO unless:**
- You've exhausted all other options
- You need real-time video processing
- You have ML team and budget

**The real issue isn't detection accuracy or speed - it's getting the exact bottle shape.** Segmentation masks solve this perfectly without the complexity of custom ML training.
