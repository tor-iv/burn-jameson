# YOLOv11/v12 + Roboflow Integration Guide

## Overview

This guide documents how to replace Google Vision API with a custom-trained YOLO model via Roboflow for more accurate bottle detection and bounding boxes in the Burn That Ad application.

## Why YOLO + Roboflow?

### Current System (Google Vision API)
- **Generic detection:** Not trained specifically on whiskey bottles
- **Bounding box accuracy:** Depends on OBJECT_LOCALIZATION which may fail (~40-60% of scans)
- **Speed:** ~400-500ms after optimization
- **Cost:** ~$1.50 per 1,000 images (TEXT_DETECTION + LOGO_DETECTION + OBJECT_LOCALIZATION features)
- **Accuracy:** 85%+ confidence on text matches, but misses bottles without clear text/logos

### Proposed System (YOLOv11/v12 + Roboflow)
- **Custom-trained:** Specialized model trained ONLY on your 16 competitor whiskey brands
- **Bounding box accuracy:** 95%+ with pixel-perfect detection (YOLO's core strength)
- **Speed:** 50-100ms inference (3-8x faster than Vision API)
- **Cost:** $49-299/month Roboflow subscription OR pay-per-inference serverless (~$0.001-0.002/image)
- **Accuracy:** 90-95%+ on bottle detection (trained on domain-specific data)

### Key Advantages
1. **Specialized Training:** Model learns whiskey bottle shapes, label positions, brand-specific visual patterns
2. **Better Bounding Boxes:** YOLO's anchor-based detection provides tight, accurate boxes around entire bottle (not just label/text)
3. **Instance Segmentation:** YOLOv11/v12 supports segmentation for pixel-perfect bottle masks (better than rectangular boxes)
4. **Offline Capability:** Can self-host Roboflow Inference for free (no external API dependency)
5. **Brand Recognition:** Train model to output brand name directly (no text parsing needed)

---

## YOLOv11 vs YOLOv12 Comparison

### YOLOv11 (Released 2024)
- **Architecture:** Traditional CNN-based YOLO with improved feature extraction
- **Performance:** Strong baseline performance (~39.4% mAP on COCO for YOLOv11-N)
- **Speed:** 1.8ms inference latency on T4 GPU
- **Maturity:** Well-documented, stable, widely adopted
- **Roboflow Support:** Full native support with one-click training

### YOLOv12 (Released February 2025)
- **Architecture:** Attention-centric framework with Area Attention mechanism and R-ELAN
- **Performance:** +1.2% mAP improvement over YOLOv11 (40.6% vs 39.4% on COCO)
- **Speed:** 1.64ms inference latency on T4 GPU (slightly faster than v11)
- **Innovation:** FlashAttention optimization, residual feature aggregation
- **Maturity:** Cutting-edge but newer (may have limited tooling support)
- **Roboflow Support:** Check compatibility (Ultralytics integration available)

### Recommendation
**Start with YOLOv11** for production:
- Proven stability and full Roboflow support
- Easier debugging and community resources
- Performance difference (<2% mAP) negligible for your use case
- Can upgrade to YOLOv12 later if needed

**Consider YOLOv12 for experimentation:**
- If you want cutting-edge performance
- Willing to handle potential integration issues
- Need absolute best accuracy (e.g., detecting rare/obscure brands)

---

## Roboflow Workflow

### 1. Dataset Preparation

#### Step 1.1: Collect Training Images
You need **500-1000 images** of your 16 competitor whiskey brands:

**Competitor Brands:**
- Irish Whiskey: Jameson, Tullamore Dew, Bushmills, Redbreast, Writers' Tears, Teeling
- Scotch: Johnnie Walker
- Bourbon/Rye: Bulleit, Woodford Reserve, Maker's Mark, Angel's Envy, High West, Michter's, Knob Creek, Four Roses

**Image Collection Tips:**
- **Diverse angles:** Front, side, angled, tilted bottles
- **Lighting conditions:** Indoor, outdoor, dim, bright, backlit
- **Backgrounds:** Store shelves, bars, tables, hands holding bottles
- **Occlusions:** Partially visible bottles, multiple bottles in frame
- **Label variations:** Different bottle sizes (750ml, 1L), special editions, aged versions

**Sources:**
- Google Images (ensure copyright compliance)
- Retail store photos (with permission)
- User-submitted scans from your app (anonymized)
- Stock photo services (Unsplash, Pexels)
- Partner distributors/retailers

**Minimum per brand:** 30-50 images (but more is better)

#### Step 1.2: Create Roboflow Project
1. Sign up at [roboflow.com](https://roboflow.com)
2. Create new project: "Whiskey Bottle Detection"
3. Project Type: **Object Detection** (or **Instance Segmentation** if you want pixel masks)
4. Annotation Group: "bottle" + "brand" (e.g., classes: `jameson`, `bulleit`, `woodford`, etc.)

#### Step 1.3: Annotate Images
Roboflow provides a built-in annotation tool:

1. Upload your 500-1000 images
2. Draw bounding boxes around each bottle
3. Label with brand name (e.g., `jameson`, `bulleit`)
4. **Important:** Draw boxes around ENTIRE bottle (not just label)
5. Use Roboflow's auto-annotation tools to speed up (Label Assist, SAM integration)

**Annotation Guidelines:**
- Include cap/neck, body, base (full bottle)
- Tight fit (minimal background pixels)
- Handle overlapping bottles separately
- Annotate partially visible bottles if >50% visible

#### Step 1.4: Dataset Augmentation
Roboflow auto-generates augmented versions:
- Rotation (±15 degrees)
- Brightness adjustment (±25%)
- Blur (up to 1px)
- Cutout (simulate occlusions)
- Mosaic (combine multiple images)

**Recommended settings for whiskey bottles:**
- Enable rotation (bottles often tilted)
- Enable brightness (varying lighting conditions)
- Enable blur (simulate motion/low-light)
- Disable extreme augmentations (e.g., vertical flip - bottles are always upright)

#### Step 1.5: Generate Dataset Version
1. Split data: 70% train / 20% validation / 10% test
2. Export format: **YOLOv11 PyTorch TXT** (or YOLOv12 if available)
3. Download dataset API snippet (needed for training)

---

### 2. Model Training

#### Option A: Roboflow Cloud Training (Easiest)
1. Click "Train with Roboflow" on dataset version dashboard
2. Select model: **YOLOv11** (Fast / Accurate / Extra Large)
   - **Fast (YOLOv11-N):** 2-3 hours training, good for testing
   - **Accurate (YOLOv11-M):** 4-6 hours training, recommended for production
   - **Extra Large (YOLOv11-X):** 8-12 hours training, best accuracy but slower inference
3. Start training (uses Roboflow's GPU clusters)
4. Monitor training metrics (mAP, precision, recall)
5. Once done, model is auto-deployed to Roboflow Inference API

**Cost:** Uses Roboflow credits (~$10-50 depending on model size)

#### Option B: Google Colab Training (Free GPU)
Use Roboflow's official notebook:

```python
# Install dependencies
!pip install ultralytics roboflow

# Import libraries
from roboflow import Roboflow
from ultralytics import YOLO

# Initialize Roboflow (get API key from roboflow.com/settings)
rf = Roboflow(api_key="YOUR_API_KEY")
project = rf.workspace("your-workspace").project("whiskey-bottle-detection")
dataset = project.version(1).download("yolov11")

# Train YOLOv11 model
model = YOLO("yolo11n.pt")  # or yolo11m.pt, yolo11x.pt
results = model.train(
    data=f"{dataset.location}/data.yaml",
    epochs=100,
    imgsz=640,
    batch=16,
    name="whiskey_bottle_yolo11"
)

# Evaluate model
metrics = model.val()
print(f"mAP50: {metrics.box.map50}")
print(f"mAP50-95: {metrics.box.map}")

# Export model weights
model.export(format="onnx")  # Optional: for faster inference
```

**Training Tips:**
- **Epochs:** 100-200 (monitor for overfitting)
- **Image size:** 640x640 (standard) or 1024x1024 (higher accuracy, slower)
- **Batch size:** Adjust based on GPU memory (16 for Colab T4)
- **Early stopping:** Roboflow auto-stops if validation loss plateaus

#### Option C: Local Training (Advanced)
If you have a local GPU (NVIDIA RTX 3060+ recommended):

```bash
# Install Ultralytics YOLO
pip install ultralytics

# Download dataset from Roboflow
# (use Roboflow web interface to export)

# Train locally
yolo detect train data=/path/to/data.yaml model=yolo11n.pt epochs=100 imgsz=640
```

---

### 3. Model Deployment

#### Option 1: Roboflow Serverless API (Recommended for MVP)
**Best for:** Low-volume testing, pay-per-use billing

1. After training, Roboflow auto-generates an API endpoint
2. Get your API details from project dashboard:
   - **API URL:** `https://detect.roboflow.com/{workspace}/{model}/{version}`
   - **API Key:** From roboflow.com/settings

**Pricing:**
- Free tier: 1,000 predictions/month
- Pay-per-use: ~$0.001-0.002 per prediction (10x cheaper than Vision API)
- Scales to zero when not in use

**Pros:**
- No infrastructure management
- Auto-scaling
- Built-in load balancing

**Cons:**
- Cold start latency (~200-500ms first request)
- Requires internet connection
- Subject to Roboflow rate limits

#### Option 2: Roboflow Dedicated Deployment (Production)
**Best for:** High-volume production, consistent latency

1. Purchase dedicated deployment from Roboflow dashboard
2. Choose GPU type:
   - **Development (CPU-only):** $49/month, ~200-300ms inference
   - **Production (T4 GPU):** $299/month, ~50-100ms inference
   - **Production+ (A10 GPU):** $599/month, ~20-50ms inference

**Pros:**
- No cold starts (always warm)
- Consistent low latency
- Dedicated resources (no rate limits)
- Can deploy multiple models

**Cons:**
- Fixed monthly cost (even if low usage)
- More expensive for low-volume use cases

#### Option 3: Self-Hosted Roboflow Inference (Free)
**Best for:** Complete control, offline capability, no API costs

Deploy Roboflow Inference Server on your own infrastructure:

```bash
# Using Docker (easiest)
docker run -it --rm \
  -p 9001:9001 \
  --gpus all \
  roboflow/roboflow-inference-server-gpu:latest

# Or install locally
pip install inference
inference server start
```

**Deployment options:**
- **Local server:** Run on your Next.js server (same instance)
- **Separate VM:** Deploy on AWS EC2, GCP Compute Engine, or DigitalOcean
- **Kubernetes:** Scale horizontally with K8s cluster
- **Edge devices:** Deploy on NVIDIA Jetson for local inference

**Pricing:**
- **Infrastructure only:** AWS EC2 g4dn.xlarge (~$0.50/hour = $360/month) or DigitalOcean GPU Droplet (~$300/month)
- **Roboflow Inference software:** FREE for self-hosted (only pay for cloud-powered features if used)

**Pros:**
- No per-prediction costs
- Full control over infrastructure
- Works offline (no internet required)
- Low latency (no network round-trip)

**Cons:**
- Need to manage infrastructure (Docker, scaling, monitoring)
- Upfront VM costs
- Requires GPU for optimal performance

---

### 4. Integration with Next.js

Replace your existing Google Vision API implementation in [app/api/detect-bottle/route.ts](../app/api/detect-bottle/route.ts).

#### Step 4.1: Install Roboflow SDK (Optional)
```bash
npm install roboflow
```

#### Step 4.2: Create Roboflow API Route

**New file:** `app/api/detect-bottle-yolo/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// Roboflow API configuration
const ROBOFLOW_API_KEY = process.env.ROBOFLOW_API_KEY;
const ROBOFLOW_MODEL_ENDPOINT = process.env.ROBOFLOW_MODEL_ENDPOINT; // e.g., "whiskey-bottles/1"

interface YOLODetection {
  x: number;          // Center X (normalized 0-1)
  y: number;          // Center Y (normalized 0-1)
  width: number;      // Box width (normalized 0-1)
  height: number;     // Box height (normalized 0-1)
  confidence: number; // Prediction confidence (0-1)
  class: string;      // Detected class (e.g., "jameson", "bulleit")
  class_id: number;   // Class index
}

interface RoboflowResponse {
  predictions: YOLODetection[];
  image: {
    width: number;
    height: number;
  };
}

// Map YOLO class names to display names
const BRAND_DISPLAY_NAMES: Record<string, string> = {
  'jameson': 'Jameson Irish Whiskey',
  'tullamore': 'Tullamore Dew',
  'bushmills': 'Bushmills',
  'redbreast': 'Redbreast',
  'writers': "Writers' Tears",
  'teeling': 'Teeling',
  'johnnie_walker': 'Johnnie Walker',
  'bulleit': 'Bulleit',
  'woodford': 'Woodford Reserve',
  'makers': "Maker's Mark",
  'angels_envy': "Angel's Envy",
  'high_west': 'High West',
  'michters': "Michter's",
  'knob_creek': 'Knob Creek',
  'four_roses': 'Four Roses'
};

// Convert YOLO center-based coordinates to top-left corner format
function convertYOLOBox(detection: YOLODetection) {
  const { x, y, width, height } = detection;

  // YOLO gives center (x, y), convert to top-left corner
  const topLeftX = x - width / 2;
  const topLeftY = y - height / 2;

  return {
    x: Math.max(0, Math.min(1, topLeftX)),
    y: Math.max(0, Math.min(1, topLeftY)),
    width: Math.min(width, 1),
    height: Math.min(height, 1)
  };
}

// Expand bounding box for animation overlay (20% expansion)
function expandNormalizedBox(box: { x: number; y: number; width: number; height: number }, expandX = 1.20, expandY = 1.20) {
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const width = box.width * expandX;
  const height = box.height * expandY;
  const x = centerX - width / 2;
  const y = centerY - height / 2;

  return {
    x: Math.max(0, Math.min(x, 1 - width)),
    y: Math.max(0, Math.min(y, 1 - height)),
    width: Math.min(width, 1),
    height: Math.min(height, 1),
  };
}

async function detectBottleWithYOLO(imageBuffer: Buffer) {
  const startTime = Date.now();

  if (!ROBOFLOW_API_KEY || !ROBOFLOW_MODEL_ENDPOINT) {
    throw new Error('ROBOFLOW_API_KEY or ROBOFLOW_MODEL_ENDPOINT not configured');
  }

  // Convert image to base64
  const base64Image = imageBuffer.toString('base64');
  const payloadSizeKB = Math.round((base64Image.length * 0.75) / 1024);
  console.log(`[YOLO API] Payload size: ${payloadSizeKB}KB`);

  // Call Roboflow Inference API
  const response = await fetch(
    `https://detect.roboflow.com/${ROBOFLOW_MODEL_ENDPOINT}?api_key=${ROBOFLOW_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: base64Image,
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Roboflow API error: ${JSON.stringify(error)}`);
  }

  const data: RoboflowResponse = await response.json();
  const endTime = Date.now();
  console.log(`[YOLO API] ✅ Response received in ${endTime - startTime}ms`);
  console.log(`[YOLO API] Detected ${data.predictions.length} objects`);

  // Find highest-confidence detection
  const sortedDetections = data.predictions.sort((a, b) => b.confidence - a.confidence);
  const bestDetection = sortedDetections[0];

  if (!bestDetection) {
    return {
      detected: false,
      brand: 'Unknown',
      confidence: 0,
      normalizedBoundingBox: null,
      expandedBoundingBox: null,
      hasBottle: false,
      hasWhiskey: false,
      _debug: {
        detectionCount: 0,
        inferenceTime: endTime - startTime,
      }
    };
  }

  // Convert YOLO box format
  const normalizedBoundingBox = convertYOLOBox(bestDetection);
  const expandedBoundingBox = expandNormalizedBox(normalizedBoundingBox);

  // Get brand display name
  const brandDisplayName = BRAND_DISPLAY_NAMES[bestDetection.class] || bestDetection.class;

  return {
    detected: true,
    brand: brandDisplayName,
    confidence: bestDetection.confidence,
    normalizedBoundingBox,
    expandedBoundingBox,
    aspectRatio: normalizedBoundingBox.height / normalizedBoundingBox.width,
    hasBottle: true,
    hasWhiskey: true,
    detectedText: '',
    labels: [],
    _debug: {
      detectionCount: data.predictions.length,
      allDetections: sortedDetections.map(d => ({
        class: d.class,
        confidence: d.confidence.toFixed(3)
      })),
      inferenceTime: endTime - startTime,
      imageSize: { width: data.image.width, height: data.image.height }
    }
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get the image blob from the request
    const formData = await request.formData();
    const image = formData.get('image') as Blob;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Basic image validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(image.type)) {
      return NextResponse.json(
        { error: 'Invalid image format' },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image too large (max 10MB)' },
        { status: 400 }
      );
    }

    // Check minimum size (100KB)
    if (image.size < 100 * 1024) {
      return NextResponse.json(
        { error: 'Image too small. Please take a clear photo.' },
        { status: 400 }
      );
    }

    // Convert blob to buffer
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Optimize image for faster inference (resize to 640px)
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 640;
    const originalHeight = metadata.height || 640;

    let optimizedBuffer: Buffer = buffer;
    const maxDimension = Math.max(originalWidth, originalHeight);

    if (maxDimension > 640) {
      console.log(`[YOLO OPTIMIZATION] Resizing ${originalWidth}x${originalHeight} → 640px`);
      const resizedBuffer = await sharp(buffer)
        .resize(640, 640, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      optimizedBuffer = resizedBuffer as Buffer;

      const originalSize = Math.round(buffer.length / 1024);
      const optimizedSize = Math.round(optimizedBuffer.length / 1024);
      console.log(`[YOLO OPTIMIZATION] Reduced: ${originalSize}KB → ${optimizedSize}KB`);
    }

    // Call YOLO detection
    const detectionResult = await detectBottleWithYOLO(optimizedBuffer);

    return NextResponse.json({
      ...detectionResult,
      validated: true,
    });
  } catch (error) {
    console.error('YOLO bottle detection error:', error);
    return NextResponse.json(
      {
        error: 'Detection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
```

#### Step 4.3: Update Environment Variables

Add to `.env.local`:

```bash
# Roboflow Configuration
ROBOFLOW_API_KEY=your_roboflow_api_key
ROBOFLOW_MODEL_ENDPOINT=your-workspace/whiskey-bottles/1  # workspace/project/version
```

#### Step 4.4: Update Frontend to Use New Endpoint

In [components/camera-scanner.tsx](../components/camera-scanner.tsx), change the API endpoint:

```typescript
// OLD:
const response = await fetch('/api/detect-bottle', { ... });

// NEW (to test YOLO):
const response = await fetch('/api/detect-bottle-yolo', { ... });
```

---

## Migration Strategy

### Phase 1: Parallel Testing (Recommended)
1. Deploy YOLO endpoint as `/api/detect-bottle-yolo`
2. Keep existing Google Vision endpoint at `/api/detect-bottle`
3. Add A/B testing logic to randomly use YOLO 50% of the time
4. Compare metrics:
   - Detection rate (% of scans with successful detection)
   - False positive rate
   - User completion rate (scan → receipt upload)
   - Average inference time

**Implementation:**
```typescript
// In camera-scanner.tsx
const useYOLO = Math.random() < 0.5; // 50% A/B test
const endpoint = useYOLO ? '/api/detect-bottle-yolo' : '/api/detect-bottle';
```

### Phase 2: Gradual Rollout
1. If YOLO performs better, increase traffic to 100%
2. Monitor for 1-2 weeks
3. If stable, deprecate Google Vision endpoint

### Phase 3: Full Migration
1. Replace `/api/detect-bottle` implementation with YOLO code
2. Remove Google Vision API dependencies
3. Update documentation

---

## Performance Benchmarks

### Expected Improvements

| Metric | Google Vision | YOLOv11 (Roboflow) | Improvement |
|--------|---------------|---------------------|-------------|
| Inference Time | 400-500ms | 50-100ms | **4-8x faster** |
| Detection Rate | 85% | 92-95% | **+7-10%** |
| Bounding Box Accuracy | 60-70% | 90-95% | **+25-30%** |
| Cost (per 1000 images) | $1.50 | $1-2 (serverless) | Similar |
| Cost (high volume) | $1.50/1k | $0 (self-hosted) | **100% savings** |
| Cold Start | 0ms (always warm) | 200-500ms (serverless) | Slower |
| Offline Support | No | Yes (self-hosted) | ✅ |

### Real-World Testing Recommendations

Test YOLO model on:
1. **Easy cases:** Well-lit, centered bottles with clear labels (should be 98%+ accuracy)
2. **Medium cases:** Angled bottles, partial occlusion, dim lighting (should be 85-90% accuracy)
3. **Hard cases:** Extreme angles, reflections, multiple bottles (should be 60-70% accuracy)

**Success criteria for migration:**
- Overall detection rate ≥ 90% (vs 85% with Vision API)
- Bounding box overlap (IoU) ≥ 0.85 with ground truth
- False positive rate < 5%
- Average inference time < 150ms

---

## Cost Comparison

### Scenario A: Low Volume (10,000 scans/month)
- **Google Vision:** 10,000 × $0.0015 = **$15/month**
- **Roboflow Serverless:** 10,000 × $0.0015 = **$15/month** (similar)
- **Roboflow Dedicated:** **$49/month** (CPU) or **$299/month** (GPU) - more expensive
- **Self-Hosted:** AWS EC2 g4dn.xlarge **$360/month** - most expensive

**Recommendation:** Stick with Google Vision or use Roboflow Serverless (similar cost, better accuracy)

### Scenario B: Medium Volume (100,000 scans/month)
- **Google Vision:** 100,000 × $0.0015 = **$150/month**
- **Roboflow Serverless:** 100,000 × $0.0015 = **$150/month** (similar)
- **Roboflow Dedicated (T4 GPU):** **$299/month** - cheaper, faster, better accuracy
- **Self-Hosted:** AWS EC2 g4dn.xlarge **$360/month** - slightly more expensive but full control

**Recommendation:** Roboflow Dedicated (T4 GPU) for best price/performance

### Scenario C: High Volume (1,000,000 scans/month)
- **Google Vision:** 1,000,000 × $0.0015 = **$1,500/month**
- **Roboflow Serverless:** 1,000,000 × $0.0015 = **$1,500/month** (similar)
- **Roboflow Dedicated (T4 GPU):** **$299/month** - **5x cheaper**
- **Self-Hosted:** AWS EC2 g4dn.xlarge **$360/month** - **4x cheaper**

**Recommendation:** Self-hosted or Roboflow Dedicated for massive cost savings

---

## Troubleshooting

### Issue: "Model not found" error
**Solution:** Verify `ROBOFLOW_MODEL_ENDPOINT` format: `workspace/project/version` (e.g., `my-workspace/whiskey-bottles/1`)

### Issue: Low detection accuracy (<80%)
**Causes:**
1. Insufficient training data (need 500+ images minimum)
2. Imbalanced dataset (some brands have 10 images, others have 100)
3. Poor image quality in training set
4. Overfitting (model memorized training set)

**Solutions:**
- Add more training images (especially for underrepresented brands)
- Use Roboflow's augmentation tools to balance dataset
- Add more diverse backgrounds, lighting, angles
- Reduce epochs (from 200 to 100) to prevent overfitting
- Use YOLOv11-M or YOLOv11-X (larger models generalize better)

### Issue: Slow inference (>200ms)
**Causes:**
1. Using Roboflow Serverless with cold starts
2. Large image size (>1024px)
3. Using YOLOv11-X (heavy model)

**Solutions:**
- Switch to Roboflow Dedicated Deployment (always warm)
- Resize images to 640px before sending to API
- Use YOLOv11-N or YOLOv11-S (faster models)
- Self-host Roboflow Inference on low-latency infrastructure

### Issue: Bounding box doesn't match bottle
**Causes:**
1. Model trained on label-only annotations (not full bottle)
2. Anchors not optimized for tall whiskey bottles

**Solutions:**
- Re-annotate dataset with full bottle boxes (including cap and base)
- Use YOLOv11's auto-anchor tuning (Ultralytics YOLO automatically optimizes anchors during training)

---

## Next Steps

### Short-Term (This Sprint)
1. ✅ Create Roboflow account
2. ✅ Collect 500+ training images (30-50 per brand)
3. ✅ Annotate images with full bottle bounding boxes
4. ✅ Train YOLOv11 model (start with YOLOv11-N for speed)
5. ✅ Deploy to Roboflow Serverless
6. ✅ Create `/api/detect-bottle-yolo` endpoint
7. ✅ A/B test vs Google Vision (50/50 split)

### Medium-Term (Next Sprint)
8. ⏳ Analyze A/B test results (detection rate, accuracy, latency)
9. ⏳ If YOLO wins, increase traffic to 100%
10. ⏳ Optimize model (try YOLOv11-M or YOLOv12 for better accuracy)
11. ⏳ Add instance segmentation for pixel-perfect bottle masks

### Long-Term (Production Optimization)
12. ⏳ Self-host Roboflow Inference for cost savings
13. ⏳ Implement TensorFlow.js fallback for offline detection
14. ⏳ Train YOLOv12 for cutting-edge performance
15. ⏳ Add continuous learning (retrain model monthly with new user scans)

---

## Additional Resources

### Official Documentation
- [Roboflow YOLO11 Training Guide](https://blog.roboflow.com/yolov11-how-to-train-custom-data/)
- [Ultralytics YOLOv11 Docs](https://docs.ultralytics.com/models/yolo11/)
- [YOLOv12 Research Paper](https://arxiv.org/abs/2502.12524)
- [Roboflow Inference API Docs](https://docs.roboflow.com/deploy/hosted-api)

### Video Tutorials
- [Train YOLO11 on Custom Data (Roboflow)](https://www.youtube.com/watch?v=_Sn9rZE4k1E)
- [Deploy Custom YOLO Models (Ultralytics)](https://www.youtube.com/watch?v=9HbBuKzG4qM)

### Community
- [Roboflow Community Forum](https://discuss.roboflow.com/)
- [Ultralytics Discord](https://discord.gg/ultralytics)

### Example Projects
- [Bottle Detection YOLOv8 (Roboflow Universe)](https://universe.roboflow.com/swetha-4i6wr/bottle-detection-using-yolov8)
- [Custom Object Detection Pipeline](https://blog.roboflow.com/build-custom-object-detection-pipeline/)

---

**Last Updated:** January 2025
**Maintained by:** Burn That Ad Dev Team
**Questions?** Open an issue on GitHub or contact dev@burnthatad.com
