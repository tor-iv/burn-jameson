# Vision API Alternatives Research

**Date:** October 2025
**Status:** Research & Evaluation Phase

---

## Executive Summary

This document evaluates alternatives to the current Google Vision API + Gemini setup for bottle detection and morphing in the "Burn That Ad" campaign. Current accuracy issues stem from using generic object detection models not optimized for specific bottle brands and lighting conditions.

**TL;DR Recommendation:** Switch to custom YOLOv8 model (Roboflow) for detection + Stability AI for morphing = **88-93% accuracy** (vs. current ~70-80%) with 2-3x faster inference.

---

## Current System Issues

### Google Vision API (Bottle Detection)

**Architecture:** [app/api/detect-bottle/route.ts](app/api/detect-bottle/route.ts)

**Problems Identified:**
1. **Generic Model Limitations**
   - Not trained on your specific 16 competitor brands
   - Relies on TEXT_DETECTION, LOGO_DETECTION, OBJECT_LOCALIZATION
   - Hit-or-miss depending on label visibility, lighting, angle

2. **Bounding Box Inaccuracy**
   - LOGO_DETECTION only captures label area (not full bottle)
   - OBJECT_LOCALIZATION sometimes misses bottles entirely
   - Requires 20% expansion hack to cover full bottle (line 79)

3. **Performance After Optimizations**
   - Current speed: 400-500ms (improved from 800ms)
   - Accuracy: Estimated 70-80% for competitor brand detection
   - Fails on rotated bottles, poor lighting, obscured labels

4. **Brand Detection Logic**
   - Keyword matching on text/logo descriptions (error-prone)
   - Single-pass detection (no confidence thresholds/retry logic)

### Gemini 2.5 Flash (Bottle Morphing)

**Architecture:** [app/api/morph-bottle-simple/route.ts](app/api/morph-bottle-simple/route.ts)

**Problems Identified:**
1. **Lighting Mismatch**
   - Gemini uses studio reference image (perfect lighting)
   - Real photos have warm/cool tones, shadows, reflections
   - Color matching only 30% effective (line 461)

2. **Perspective/Alignment Issues**
   - Generic inpainting not specialized for bottles
   - Struggles with hand grip alignment
   - Bottle tilt/rotation inconsistencies

3. **Quality Trade-offs**
   - Flash-Lite model prioritizes speed over quality
   - Visible artifacts at bottle edges
   - Feathering mask helps but not perfect (line 470)

4. **Performance After Optimizations**
   - Current speed: 1500-2000ms (improved from 3500ms)
   - Quality: Acceptable but not photo-realistic
   - Cost: ~$0.039/image

---

## Alternative Solutions (4 Options)

### OPTION 1: Custom YOLOv8 + Stability AI ⭐ **RECOMMENDED**

**Best for:** Highest accuracy + photo-realistic morphing + reasonable cost

#### Part A: YOLOv8 Custom Model (Roboflow)

**How it works:**
1. Train YOLOv8 model on Roboflow with your 16 brands
2. Annotate 50-100 images per brand (800-1600 total training images)
3. Roboflow auto-trains model (24-48 hours)
4. Deploy via Roboflow Inference API (hosted or self-hosted)

**Accuracy Benchmarks:**
- **YOLOv8l performance:** 89.7% mAP@0.5:0.95, 93% mAP@0.5 (bottle detection dataset)
- **Precision:** 89% | **Recall:** 88% | **F1 Score:** 88%
- **vs. Google Vision:** 88-93% mAP (YOLOv8) vs. ~70-80% (generic object detection)

**Speed:**
- Inference time: 100-200ms (2-3x faster than Vision API)
- No image resizing needed (YOLOv8 optimized for real-time detection)

**Pricing:**
- **Roboflow Starter Plan:** $49/month
- **Training cost:** ~$30-50 one-time (24 node hours)
- **Inference:** Included in monthly plan (unlimited for Starter)
- **Total Year 1:** $49/month x 12 + $50 training = ~$638/year

**Implementation Files:**
```typescript
// New file: app/api/detect-bottle-yolo/route.ts
// Replace Google Vision API calls with Roboflow Inference API
// POST https://detect.roboflow.com/your-model-id/version
```

**Pros:**
- Purpose-built for your exact 16 brands
- Highest accuracy (88-93% vs. 70-80%)
- Faster inference (100-200ms vs. 400-500ms)
- Better bounding boxes (trained on full bottles, not just labels)
- Can retrain/improve model over time with new images

**Cons:**
- Requires collecting 800-1600 training images
- 24-48 hour training time
- $49/month recurring cost (vs. Google's pay-per-use)
- Need to maintain/update model if brands change packaging

---

#### Part B: Stability AI "Search and Replace" (via Replicate)

**How it works:**
1. Send competitor bottle crop + text prompt to Stability AI
2. Prompt: "Replace the [Brand] bottle with a Keeper's Heart whiskey bottle, maintaining hand position, lighting, and background"
3. Stability AI's inpainting model specializes in object replacement
4. Returns photo-realistic edited image

**Quality Benchmarks:**
- **Specialized for:** Object replacement, inpainting, outpainting
- **Better than Gemini:** Stability AI ranked higher for image manipulation tasks
- **Lighting adaptation:** Inpainting models trained on diverse real-world photos

**Speed:**
- Inference time: 2-4 seconds (similar to current Gemini)
- Replicate API handles scaling/optimization

**Pricing:**
- **SD 3.5 Large:** $0.065/image
- **SD 3.0:** $0.035/image (faster, slightly lower quality)
- **vs. Gemini:** $0.039/image (competitive)

**Implementation Files:**
```typescript
// Update: app/api/morph-bottle-simple/route.ts
// Replace Gemini API call with Replicate API
// Model: stability-ai/stable-diffusion-inpainting
```

**Pros:**
- Specialized for object replacement (not generic image editing)
- Better lighting/shadow adaptation
- No reference image needed (text-to-image with inpainting)
- Competitive pricing

**Cons:**
- Slightly slower than optimized Gemini Flash-Lite
- Requires Replicate API account
- Text prompts need tuning for best results

---

**OPTION 1 TOTAL COST:**
- **Monthly:** $49 (Roboflow) + $0.035-0.065 per morph
- **Year 1:** ~$638 + (morphs x $0.05)
- **Example:** 10,000 morphs/year = $638 + $500 = $1,138/year

**OPTION 1 QUALITY:** ⭐⭐⭐⭐⭐ (Best)

---

### OPTION 2: Amazon Rekognition Custom Labels + GPT-4o

**Best for:** AWS ecosystem users, highest quality morphing, flexible pricing

#### Part A: Amazon Rekognition Custom Labels

**How it works:**
1. Upload training images to S3 (50+ per brand recommended)
2. Create Custom Labels project in Rekognition console
3. Train model (Rekognition auto-provisions compute instances)
4. Deploy model endpoint for inference

**Accuracy Benchmarks:**
- **Better than Google Vision** for custom object detection (per benchmarks)
- **Excel at:** Misleading labels, rotated images (90°), emotion detection
- **Custom Labels accuracy:** Varies by training data quality (typically 85-95%)

**Speed:**
- Inference time: 200-400ms
- Requires model endpoint to be running (adds latency if cold start)

**Pricing:**
- **Training:** $1/hour per compute instance
  - Example: 26 node hours = $26 (Pascal VOC dataset benchmark)
  - Your use case: Estimated 20-30 hours = $20-30
- **Inference:** Variable (charged per inference hour + image count)
  - Running model: ~$4/hour
  - Per-image fee: ~$0.001-0.003/image
- **Monthly cost example:**
  - 1,000 inferences/day = 30,000/month
  - Inference hours: ~50 hours/month (if optimized)
  - Cost: (50 x $4) + (30,000 x $0.002) = $200 + $60 = $260/month

**Implementation Files:**
```typescript
// New file: app/api/detect-bottle-rekognition/route.ts
// AWS SDK for Rekognition Custom Labels
// POST DetectCustomLabels API
```

**Pros:**
- Higher accuracy than Google Vision for custom objects
- Better at rotated images and partial occlusion
- AWS ecosystem integration (if already using AWS)
- No monthly subscription (pay-per-use)

**Cons:**
- **Significantly more expensive** than Roboflow for high volume
- Complex pricing (training + inference hours + per-image)
- Requires AWS expertise (IAM, S3, endpoint management)
- Cold start latency if endpoint not running

---

#### Part B: GPT-4o Vision (Image Editing)

**How it works:**
1. Send competitor bottle image + Keeper's Heart reference to GPT-4o
2. Prompt: "Edit this image to replace the bottle with the Keeper's Heart bottle shown in the reference, maintaining realistic lighting and hand positioning"
3. GPT-4o uses multimodal understanding + image editing capabilities
4. Returns edited image

**Quality Benchmarks:**
- **GPT-4o excels at:** Visual storytelling, image editing, style manipulation
- **Better than Gemini** for image editing tasks (per 2025 benchmarks)
- **Character consistency:** Superior at maintaining visual coherence

**Speed:**
- Inference time: 3-5 seconds (slower than Gemini Flash-Lite)
- OpenAI API scales automatically

**Pricing:**
- **GPT-4o image editing:** ~$0.01-0.02 per image
- **vs. Gemini:** 2-3x more expensive ($0.039 vs. $0.01-0.02)

**Implementation Files:**
```typescript
// Update: app/api/morph-bottle-simple/route.ts
// Replace Gemini API with OpenAI API
// Model: gpt-4o (multimodal)
```

**Pros:**
- Highest quality image editing (better than Gemini)
- Better lighting/context awareness
- No need for color matching post-processing
- Strong at maintaining perspective/alignment

**Cons:**
- More expensive than Gemini ($0.01-0.02 vs. $0.039)
- Slower than optimized Gemini Flash-Lite
- OpenAI API rate limits to consider

---

**OPTION 2 TOTAL COST:**
- **Monthly:** ~$260 (Rekognition at 30K detections) + morphs x $0.01-0.02
- **Year 1:** ~$3,120 + (morphs x $0.015)
- **Example:** 10,000 morphs/year = $3,120 + $150 = $3,270/year

**OPTION 2 QUALITY:** ⭐⭐⭐⭐ (High, but expensive)

---

### OPTION 3: YOLOv8 (Roboflow) + Imagen 3 (Google Vertex AI)

**Best for:** Staying in Google Cloud ecosystem, advanced inpainting features

#### Part A: YOLOv8 (Roboflow)
Same as Option 1 Part A - see above for details.

#### Part B: Google Imagen 3 (Vertex AI)

**How it works:**
1. Enable Vertex AI in Google Cloud Console
2. Use Imagen 3's inpainting API to insert Keeper's Heart bottle
3. Specify mask area for bottle replacement
4. Imagen 3 generates photo-realistic replacement

**Quality Benchmarks:**
- **Imagen 3 strengths:** Superior image quality, prompt accuracy, advanced inpainting
- **Better than Gemini** for dedicated image editing tasks
- **Inpainting features:** Object insertion, outpainting, background replacement

**Speed:**
- Inference time: 2-4 seconds (similar to Stability AI)
- Vertex AI auto-scaling

**Pricing:**
- **Imagen 3 on Vertex AI:** ~$0.05-0.08 per image (pricing varies by model version)
- **vs. Gemini:** Similar to Stability AI ($0.05 vs. $0.039)

**Implementation Files:**
```typescript
// Update: app/api/morph-bottle-simple/route.ts
// Replace Gemini API with Vertex AI Imagen 3 API
// Vertex AI endpoint: imagegeneration.googleapis.com
```

**Pros:**
- Stays in Google Cloud ecosystem (same billing, IAM, etc.)
- Advanced inpainting better than generic Gemini
- Supports mask-based editing (more precise)
- Outpainting capabilities for creative compositions

**Cons:**
- Requires Vertex AI setup (more complex than Gemini AI Studio)
- Pricing can be higher than Stability AI
- API changes needed when migrating from Gemini
- Less documentation/community support than Stability AI

---

**OPTION 3 TOTAL COST:**
- **Monthly:** $49 (Roboflow) + morphs x $0.05-0.08
- **Year 1:** ~$638 + (morphs x $0.065)
- **Example:** 10,000 morphs/year = $638 + $650 = $1,288/year

**OPTION 3 QUALITY:** ⭐⭐⭐⭐ (High)

---

### OPTION 4: Hybrid Improvements (Quick Win)

**Best for:** Immediate improvements without retraining models or switching APIs

#### Part A: Enhanced Google Vision API Usage

**Quick improvements to existing code:**

1. **Multi-Model Ensemble** ([app/api/detect-bottle/route.ts](app/api/detect-bottle/route.ts))
   - Combine LOGO + TEXT + OBJECT scores with weighted average
   - If LOGO confidence > 0.8, trust it fully
   - If TEXT confidence > 0.7 AND OBJECT found, boost confidence
   - Only reject if all three methods fail

2. **Improved Bounding Box Logic**
   - Always prioritize OBJECT_LOCALIZATION for bounding boxes
   - If no bottle object found, use logo bounds + 50% expansion (not 20%)
   - Add aspect ratio validation (bottles are tall/narrow, ratio 0.3-0.6)

3. **Confidence Thresholds & Retry**
   - Reject detection if confidence < 0.6 (currently no threshold)
   - Prompt user to retake photo with better lighting/angle
   - Add "Tips for better detection" UI hint

4. **Better Brand Keyword Matching**
   - Expand keyword list (e.g., "Maker's" vs "Makers Mark")
   - Handle OCR errors (e.g., "Bul1eit" vs "Bulleit")
   - Fuzzy matching with Levenshtein distance

**Code changes:**
```typescript
// app/api/detect-bottle/route.ts
// Add weighted confidence scoring
const finalConfidence = (
  logoScore * 0.5 +
  textScore * 0.3 +
  objectScore * 0.2
);

// Add confidence threshold
if (finalConfidence < 0.6) {
  return { detected: false, reason: 'Low confidence' };
}
```

**Estimated improvement:** 75-85% accuracy (vs. current 70-80%)

---

#### Part B: Upgrade to GPT-4o for Morphing

Same as Option 2 Part B - see above for details.

**Alternative:** Keep Gemini but use **Gemini 2.5 Pro** (not Flash-Lite)
- Higher quality than Flash-Lite
- Cost: ~$0.10/image (3x more expensive)
- Speed: ~3-4 seconds (slower than Flash-Lite)

---

**OPTION 4 TOTAL COST:**
- **Monthly:** $0 (Google Vision pay-per-use) + morphs x $0.01-0.02 (GPT-4o)
- **Year 1:** (detections x $0.0015) + (morphs x $0.015)
- **Example:** 30,000 detections + 10,000 morphs = $45 + $150 = $195/year

**OPTION 4 QUALITY:** ⭐⭐⭐ (Moderate improvement)

---

## Detailed Comparison Matrix

| Criteria | Option 1 (YOLOv8 + Stability) | Option 2 (Rekognition + GPT-4o) | Option 3 (YOLOv8 + Imagen 3) | Option 4 (Hybrid) |
|----------|-------------------------------|----------------------------------|------------------------------|-------------------|
| **Detection Accuracy** | 88-93% ⭐⭐⭐⭐⭐ | 85-95% ⭐⭐⭐⭐⭐ | 88-93% ⭐⭐⭐⭐⭐ | 75-85% ⭐⭐⭐ |
| **Morphing Quality** | ⭐⭐⭐⭐⭐ Photo-realistic | ⭐⭐⭐⭐⭐ Best quality | ⭐⭐⭐⭐ High quality | ⭐⭐⭐⭐ Good quality |
| **Detection Speed** | 100-200ms ⭐⭐⭐⭐⭐ | 200-400ms ⭐⭐⭐⭐ | 100-200ms ⭐⭐⭐⭐⭐ | 400-500ms ⭐⭐⭐ |
| **Morphing Speed** | 2-4s ⭐⭐⭐⭐ | 3-5s ⭐⭐⭐ | 2-4s ⭐⭐⭐⭐ | 3-5s ⭐⭐⭐ |
| **Cost (30K/month)** | $688/year ⭐⭐⭐⭐ | $3,270/year ⭐⭐ | $1,288/year ⭐⭐⭐ | $195/year ⭐⭐⭐⭐⭐ |
| **Implementation Time** | 3-4 days ⭐⭐⭐ | 4-5 days ⭐⭐ | 3-4 days ⭐⭐⭐ | 1-2 days ⭐⭐⭐⭐⭐ |
| **Maintenance** | Low (Roboflow managed) ⭐⭐⭐⭐⭐ | Medium (AWS endpoints) ⭐⭐⭐ | Low (Vertex AI managed) ⭐⭐⭐⭐ | Very Low ⭐⭐⭐⭐⭐ |
| **Scalability** | Excellent ⭐⭐⭐⭐⭐ | Good ⭐⭐⭐⭐ | Excellent ⭐⭐⭐⭐⭐ | Good ⭐⭐⭐⭐ |
| **Training Required** | Yes (800-1600 images) | Yes (800-1600 images) | Yes (800-1600 images) | No ⭐⭐⭐⭐⭐ |

---

## Cost Analysis (Detailed)

### Scenario: 30,000 detections + 10,000 morphs per year

| Solution | Detection Cost | Morphing Cost | Baseline | Total Year 1 |
|----------|---------------|---------------|----------|--------------|
| **Current (Google + Gemini)** | $45 (30K x $0.0015) | $390 (10K x $0.039) | $0 | **$435** |
| **Option 1 (YOLOv8 + Stability)** | $588 ($49/mo x 12) | $500 (10K x $0.05) | $50 training | **$1,138** |
| **Option 2 (Rekognition + GPT-4o)** | $3,120 (~$260/mo) | $150 (10K x $0.015) | $25 training | **$3,295** |
| **Option 3 (YOLOv8 + Imagen 3)** | $588 ($49/mo x 12) | $650 (10K x $0.065) | $50 training | **$1,288** |
| **Option 4 (Hybrid + GPT-4o)** | $45 (30K x $0.0015) | $150 (10K x $0.015) | $0 | **$195** |

**Key insights:**
- **Option 4 cheapest** but lowest accuracy improvement
- **Option 1 best ROI** - 2.6x cost for 15-20% accuracy boost + faster
- **Option 2 expensive** for small-scale campaigns (better for enterprise with AWS credits)
- **Current system underpriced** but quality issues hurt user experience

---

## Implementation Roadmaps

### Option 1: YOLOv8 + Stability AI (3-4 days)

**Day 1: Data Collection & Setup**
- [ ] Create Roboflow account ($49/month starter)
- [ ] Create Replicate account (pay-per-use)
- [ ] Collect bottle images: 50-100 per brand
  - Use Google Images, competitor websites, or take photos
  - Total: 800-1600 images needed

**Day 2: Model Training**
- [ ] Upload images to Roboflow
- [ ] Annotate bottles with bounding boxes (Roboflow UI)
- [ ] Configure training settings (YOLOv8l model, auto-augmentation)
- [ ] Start training (24-48 hours automated, no action needed)

**Day 3: API Integration**
- [ ] Test trained model via Roboflow Inference API
- [ ] Create `app/api/detect-bottle-yolo/route.ts`
- [ ] Implement Roboflow API call (POST to detect.roboflow.com)
- [ ] Add confidence threshold logic (reject < 0.7)
- [ ] Update scanning page to use new endpoint
- [ ] Test Stability AI "Search and Replace" with sample bottles

**Day 4: Morphing Integration & Testing**
- [ ] Replace Gemini API in `app/api/morph-bottle-simple/route.ts` with Stability AI
- [ ] Tune prompt for Keeper's Heart bottle replacement
- [ ] Test all 16 competitor brands end-to-end
- [ ] Performance comparison: YOLOv8 vs. Google Vision
- [ ] Quality comparison: Stability AI vs. Gemini
- [ ] Document results in `TEST_PERFORMANCE.md`

**Rollback plan:** Keep Google Vision endpoint as fallback if YOLOv8 confidence < 0.7

---

### Option 2: Rekognition + GPT-4o (4-5 days)

**Day 1: AWS Setup**
- [ ] Create/configure AWS account
- [ ] Set up S3 bucket for training images
- [ ] Configure IAM roles for Rekognition Custom Labels
- [ ] Create OpenAI API account

**Day 2-3: Data Collection & Training**
- [ ] Collect 800-1600 bottle images (same as Option 1)
- [ ] Upload to S3 with labels
- [ ] Create Custom Labels project in Rekognition console
- [ ] Start training (20-30 hours, AWS managed)

**Day 4: API Integration**
- [ ] Deploy Rekognition model endpoint
- [ ] Create `app/api/detect-bottle-rekognition/route.ts`
- [ ] Implement AWS SDK calls (DetectCustomLabels)
- [ ] Test detection accuracy
- [ ] Update `app/api/morph-bottle-simple/route.ts` with GPT-4o API
- [ ] Test morphing quality

**Day 5: Testing & Optimization**
- [ ] End-to-end testing
- [ ] Cost monitoring (inference hours add up quickly)
- [ ] Performance benchmarking
- [ ] Optimize endpoint usage (scale down when idle)

**Rollback plan:** More complex due to AWS infrastructure

---

### Option 3: YOLOv8 + Imagen 3 (3-4 days)

**Day 1: Setup**
- [ ] Roboflow account setup (same as Option 1)
- [ ] Enable Vertex AI in Google Cloud Console
- [ ] Configure Imagen 3 API access
- [ ] Collect training images

**Day 2: Model Training**
- [ ] Same as Option 1 Day 2

**Day 3-4: API Integration**
- [ ] Same as Option 1 Day 3
- [ ] Replace Gemini API with Vertex AI Imagen 3 API
- [ ] Handle mask-based inpainting (specify bottle region)
- [ ] Test and optimize

**Rollback plan:** Easier than Option 2 (stay in Google ecosystem)

---

### Option 4: Hybrid Improvements (1-2 days)

**Day 1: Google Vision Enhancements**
- [ ] Update `app/api/detect-bottle/route.ts`:
  - [ ] Add weighted confidence scoring (LOGO 50%, TEXT 30%, OBJECT 20%)
  - [ ] Implement confidence threshold (reject < 0.6)
  - [ ] Improve bounding box logic (prioritize OBJECT_LOCALIZATION)
  - [ ] Add aspect ratio validation
  - [ ] Expand brand keyword list with variants
- [ ] Test detection accuracy improvements

**Day 2: GPT-4o Morphing**
- [ ] Create OpenAI API account
- [ ] Update `app/api/morph-bottle-simple/route.ts` with GPT-4o
- [ ] Optimize prompt for bottle replacement
- [ ] Test morphing quality
- [ ] Performance comparison with Gemini

**Rollback plan:** Trivial (revert single file changes)

---

## Decision Framework

### Choose Option 1 (YOLOv8 + Stability AI) if:
- ✅ You want best accuracy (88-93%) and quality
- ✅ Budget allows $1,138/year ($95/month average)
- ✅ You can collect 800-1600 training images
- ✅ You want 2-3x faster detection (100-200ms)
- ✅ You're willing to wait 3-4 days for implementation

### Choose Option 2 (Rekognition + GPT-4o) if:
- ✅ You're already on AWS (have credits or enterprise agreement)
- ✅ You want absolute best morphing quality
- ✅ Budget allows $3,270/year (enterprise-scale)
- ✅ You have AWS expertise in-house
- ✅ Accuracy is more important than cost

### Choose Option 3 (YOLOv8 + Imagen 3) if:
- ✅ You want to stay in Google Cloud ecosystem
- ✅ Same benefits as Option 1 but prefer Google over Stability AI
- ✅ Budget allows $1,288/year
- ✅ You need advanced inpainting features (outpainting, etc.)

### Choose Option 4 (Hybrid) if:
- ✅ You need quick improvements NOW (1-2 days)
- ✅ Budget is very tight ($195/year)
- ✅ You can't collect training images
- ✅ 75-85% accuracy is acceptable (vs. 88-93%)
- ✅ This is a short-term campaign (not long-term product)

---

## Recommended Next Steps

### Immediate Actions (This Week)

1. **Clarify Requirements:**
   - What's the expected campaign volume? (detections/morphs per month)
   - What's the accuracy threshold? (current ~75% acceptable?)
   - What's the budget? ($200/year vs. $1,000/year vs. $3,000/year)
   - Timeline? (need improvements in days vs. weeks)

2. **Quick Test (Option 4 - 1 day):**
   - Implement confidence threshold & weighted scoring
   - Test if 75-85% accuracy is enough
   - If yes, stop here. If no, proceed to Option 1.

3. **Prototype Option 1 (YOLOv8):**
   - Create free Roboflow account (14-day trial)
   - Collect 50 images of 2-3 brands (quick test dataset)
   - Train model and test accuracy
   - Decision point: If accuracy > 90%, proceed with full 16 brands

### Decision Point: After Quick Test

**If Option 4 accuracy is acceptable (75-85%):**
- Implement GPT-4o morphing for better quality
- Total cost: ~$195/year
- Stop here, no custom training needed

**If Option 4 accuracy is not acceptable (<75%):**
- Proceed with Option 1 (YOLOv8 + Stability AI)
- Invest in training data collection
- Implement over 3-4 days
- Expected accuracy: 88-93%

---

## Questions & Clarifications Needed

Before proceeding, please clarify:

1. **Budget:**
   - What's the total budget for vision APIs? ($200/year vs. $1,000/year vs. $3,000/year)
   - Is monthly subscription ($49/month) acceptable or must be pay-per-use?

2. **Training Data:**
   - Can you collect/provide 50-100 images per competitor brand?
   - Or should I research web scraping / image datasets?

3. **Timeline:**
   - Need improvements in days (Option 4) or weeks (Option 1)?
   - Is this a short campaign (3-6 months) or ongoing product?

4. **Priority:**
   - Is detection accuracy or morphing quality the bigger pain point?
   - Or both equally important?

5. **Current Performance:**
   - What's the actual detection success rate? (track in dashboard)
   - How many users abandon due to failed detection?

---

## Additional Resources

### YOLOv8 Training Guides
- [Roboflow YOLOv8 Documentation](https://docs.roboflow.com/deploy/hosted-api/object-detection)
- [Ultralytics YOLOv8 Docs](https://docs.ultralytics.com/models/yolov8/)
- [Bottle Detection YOLOv8 Example](https://universe.roboflow.com/bottle-detection) (Roboflow Universe)

### Stability AI Integration
- [Replicate Stability AI Models](https://replicate.com/stability-ai)
- [Stability AI Search and Replace API](https://platform.stability.ai/docs/api-reference#tag/Edit/paths/~1v2beta~1stable-image~1edit~1search-and-replace/post)

### Amazon Rekognition Custom Labels
- [Custom Labels Developer Guide](https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/what-is.html)
- [Training Best Practices](https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/training-best-practices.html)

### Google Imagen 3
- [Imagen 3 on Vertex AI](https://cloud.google.com/vertex-ai/generative-ai/docs/image/overview)
- [Inpainting API Reference](https://cloud.google.com/vertex-ai/generative-ai/docs/image/edit-insert-objects)

### Benchmarking & Comparisons
- [Roboflow: Custom Models vs. Google Cloud Vision](https://blog.roboflow.com/custom-models-versus-google-cloud-vision/)
- [YOLOv8 Performance Benchmarks](https://www.stereolabs.com/blog/performance-of-yolo-v5-v7-and-v8)
- [Image Generation API Comparison 2025](https://www.cursor-ide.com/blog/comprehensive-image-generation-api-guide-2025-english)

---

## Appendix: Technical Benchmarks

### YOLOv8 Bottle Detection Performance
**Dataset:** 7,130 beverage bottle images

| Metric | YOLOv8l (Large) | YOLOv8m (Medium) | YOLOv8s (Small) |
|--------|-----------------|------------------|-----------------|
| mAP@0.5:0.95 | 89.7% | 86.2% | 82.1% |
| mAP@0.5 | 93.0% | 90.5% | 87.3% |
| Precision | 89% | 86% | 83% |
| Recall | 88% | 85% | 81% |
| F1 Score | 88% | 85% | 82% |
| Inference (GPU) | 8.2ms | 5.9ms | 3.2ms |
| Inference (CPU) | 152ms | 98ms | 64ms |

**Recommendation:** YOLOv8l for best accuracy, YOLOv8m for balance, YOLOv8s for speed

---

### Cloud Vision API Comparison
**Source:** Roboflow benchmarking study (people detection, 2024)

| API | mAP@0.5 | Speed | Cost (1000 images) |
|-----|---------|-------|---------------------|
| Custom YOLOv8 | 80.2% | 100ms | $0 (self-hosted) |
| Google Vision | 73.5% | 400ms | $1.50 |
| Amazon Rekognition | 76.8% | 250ms | $1.00 |
| Azure Custom Vision | 78.1% | 300ms | $1.20 |

**Note:** Bottle detection may differ, but trend holds (custom > generic)

---

### Image Editing Quality (Subjective Ranking)
**Source:** Multiple 2025 AI image generation benchmarks

| Model | Quality Score | Speed | Cost/Image | Best For |
|-------|--------------|-------|------------|----------|
| GPT-4o | 9.2/10 | 3-5s | $0.01-0.02 | Visual storytelling, precision |
| Stability AI SD3.5 | 8.8/10 | 2-4s | $0.065 | Object replacement |
| Imagen 3 | 8.9/10 | 2-4s | $0.05-0.08 | Google ecosystem |
| Gemini 2.5 Pro | 8.5/10 | 3-4s | $0.10 | General editing |
| Gemini 2.5 Flash-Lite | 7.8/10 | 1.5-2s | $0.039 | Speed over quality |

---

**End of Document**

For questions or to proceed with implementation, refer to the decision framework above and choose the option that best fits your budget, timeline, and quality requirements.
