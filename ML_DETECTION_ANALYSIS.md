# ML Bottle Detection - Implementation Analysis

## The Challenge

**Goal:** Detect if user is pointing camera at a Jameson (or competitor Irish whiskey) bottle

**Difficulty:** 🔴 High
- Generic pre-trained models struggle with brand-specific detection
- Jameson bottles vary (Original, Black Barrel, Caskmates, etc.)
- Lighting, angles, reflections affect accuracy
- Similar bottles (Tullamore Dew, Bushmills) look alike

---

## Option 1: Google Vision API (Label Detection)

### How It Works
```typescript
// Detects general labels like "whiskey", "bottle", "alcohol"
// Also does OCR to find text like "JAMESON"

const [labelResult] = await visionClient.labelDetection(imageBuffer);
const [textResult] = await visionClient.textDetection(imageBuffer);

const labels = labelResult.labelAnnotations; // ["Whiskey", "Bottle", "Drink"]
const text = textResult.textAnnotations; // ["JAMESON", "IRISH", "WHISKEY"]
```

### Accuracy Estimate
- **Generic "whiskey bottle":** 85-95% accuracy ✅
- **Specific "Jameson" brand:** 40-60% accuracy ⚠️
- **Distinguishing Jameson vs Tullamore:** 30-50% accuracy ❌

### Why It Struggles
- Pre-trained on ImageNet (general objects, not specific brands)
- Doesn't understand whiskey brand nuances
- OCR helps but fails with:
  - Poor lighting
  - Reflective glass bottles
  - Angled shots
  - Partial text visible

### Cost
- **Free tier:** 1,000 requests/month
- **Paid:** $1.50 per 1,000 requests
- **For 10,000 scans:** $15/month

### Implementation Time
- **Setup:** 30 minutes
- **Testing/tuning:** 2-4 hours

### Pros
- ✅ Easy to implement
- ✅ No training data needed
- ✅ Works out of the box
- ✅ Handles multiple object types

### Cons
- ❌ Low brand-specific accuracy
- ❌ Can't reliably distinguish Irish whiskey brands
- ❌ Requires fallback/manual override

---

## Option 2: Custom Roboflow Model

### How It Works
```
1. Collect training data (100+ images of Jameson bottles)
2. Label images with bounding boxes
3. Train custom YOLOv8 model on Roboflow
4. Deploy via API
5. Model specifically learns "Jameson" vs other brands
```

### Accuracy Estimate
- **Generic "whiskey bottle":** 90-98% accuracy ✅✅
- **Specific "Jameson" brand:** 80-95% accuracy ✅✅
- **Distinguishing Jameson vs Tullamore:** 70-85% accuracy ✅

### Training Requirements
- **Images needed:** 100-500 per brand
  - Jameson Original: 100 images
  - Jameson Black Barrel: 50 images
  - Tullamore Dew: 50 images (to teach difference)
  - Bushmills: 50 images (to teach difference)
  - Negative examples: 50 images (non-Irish whiskey)

- **Labeling time:** 2-4 hours (use Roboflow's UI)
- **Training time:** 30 min - 2 hours (automatic)

### Cost
- **Roboflow Free:** 1,000 API calls/month
- **Starter Plan:** $49/month = 10,000 calls
- **For 10,000 scans:** $49/month

### Implementation Time
- **Data collection:** 4-8 hours
- **Labeling:** 2-4 hours
- **Training:** 30 min - 2 hours (automatic)
- **Integration:** 1-2 hours
- **Total:** 8-16 hours

### Pros
- ✅ High brand-specific accuracy
- ✅ Can distinguish Irish whiskey brands
- ✅ Learns from your specific use case
- ✅ Improves over time with more data

### Cons
- ❌ Requires training data collection
- ❌ More expensive
- ❌ Longer setup time
- ❌ Needs retraining for new bottle designs

---

## Option 3: Hybrid Approach (Recommended for MVP)

### Strategy
Combine Google Vision (OCR) + Custom logic + Manual override

```typescript
async function detectBottle(imageBuffer: Buffer) {
  // Step 1: Google Vision OCR (fast, cheap)
  const [textResult] = await visionClient.textDetection(imageBuffer);
  const [labelResult] = await visionClient.labelDetection(imageBuffer);

  const text = textResult.textAnnotations?.map(t => t.description?.toLowerCase()) || [];
  const labels = labelResult.labelAnnotations?.map(l => l.description?.toLowerCase()) || [];

  // Step 2: Check for whiskey indicators
  const isWhiskey = labels.some(l =>
    l.includes('whiskey') ||
    l.includes('whisky') ||
    l.includes('bottle') ||
    l.includes('alcohol')
  );

  // Step 3: Check for brand text
  const brandKeywords = {
    jameson: ['jameson', 'jamesons'],
    tullamore: ['tullamore', 'dew'],
    bushmills: ['bushmills'],
    proper: ['proper', 'twelve'],
  };

  let detectedBrand = 'unknown';
  let confidence = 0;

  for (const [brand, keywords] of Object.entries(brandKeywords)) {
    const found = keywords.some(keyword =>
      text.some(t => t.includes(keyword))
    );

    if (found) {
      detectedBrand = brand;
      confidence = 0.85; // High confidence if text detected
      break;
    }
  }

  // Step 4: Fallback to generic whiskey detection
  if (detectedBrand === 'unknown' && isWhiskey) {
    detectedBrand = 'generic_whiskey';
    confidence = 0.60; // Lower confidence
  }

  return {
    detected: confidence >= 0.75,
    brand: detectedBrand,
    confidence,
    method: detectedBrand === 'unknown' ? 'labels' : 'ocr',
  };
}
```

### Accuracy Estimate
- **Jameson with visible text:** 75-90% accuracy ✅
- **Jameson at angle/reflection:** 40-60% accuracy ⚠️
- **Generic whiskey bottle:** 85-95% accuracy ✅

### Cost
- **Google Vision:** $1.50 per 1,000 requests
- **For 10,000 scans:** $15/month

### Implementation Time
- **Setup:** 1-2 hours
- **Testing:** 2-3 hours
- **Total:** 3-5 hours

### Pros
- ✅ Fast implementation
- ✅ Cheap
- ✅ Works well when text is visible
- ✅ Manual override handles edge cases

### Cons
- ❌ Inconsistent with poor lighting/angles
- ❌ Requires manual review fallback
- ❌ Not great at brand differentiation

---

## Option 4: GPT-4 Vision API (Newest Option)

### How It Works
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function detectBottle(imageBase64: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o", // GPT-4 Omni (supports vision)
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Is this a Jameson Irish Whiskey bottle? Answer with JSON: {\"brand\": \"jameson|other|unknown\", \"confidence\": 0-1, \"reasoning\": \"why\"}"
          },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
          }
        ]
      }
    ],
    max_tokens: 100
  });

  const result = JSON.parse(response.choices[0].message.content);
  return result;
}
```

### Accuracy Estimate
- **Jameson detection:** 85-95% accuracy ✅✅
- **Brand differentiation:** 75-90% accuracy ✅✅
- **Edge cases (angles, lighting):** 70-85% accuracy ✅

### Why It's Better
- Understands context ("this is a whiskey bottle")
- Can reason about partial views
- Handles reflections better than OCR
- Can distinguish similar brands

### Cost
- **GPT-4o:** $0.01 per image (high quality)
- **For 10,000 scans:** $100/month 💰

### Implementation Time
- **Setup:** 30 minutes
- **Testing:** 1 hour
- **Total:** 1.5 hours

### Pros
- ✅ Highest accuracy
- ✅ Best at brand differentiation
- ✅ Handles edge cases well
- ✅ Easy to implement
- ✅ Can provide reasoning

### Cons
- ❌ More expensive ($100 vs $15/month)
- ❌ Slower (1-2 seconds per request)
- ❌ Requires OpenAI API key

---

## Recommendation: Phased Approach

### MVP (Week 1) - Hybrid Google Vision
**Use:** Google Vision OCR + Label Detection + Manual Override

```typescript
// lib/bottle-detection.ts
export async function detectBottle(imageBuffer: Buffer) {
  const [textResult] = await visionClient.textDetection(imageBuffer);
  const text = textResult.textAnnotations?.[0]?.description?.toLowerCase() || '';

  // Simple keyword matching
  const hasJameson = text.includes('jameson');
  const hasWhiskey = text.includes('whiskey') || text.includes('whisky');

  if (hasJameson) {
    return { detected: true, brand: 'Jameson', confidence: 0.85 };
  }

  if (hasWhiskey) {
    return { detected: true, brand: 'Generic Irish Whiskey', confidence: 0.65 };
  }

  return { detected: false, brand: 'Unknown', confidence: 0 };
}
```

**Pros:**
- Quick to implement (1 hour)
- Cheap ($15/month for 10k scans)
- Works for 70-80% of cases
- Manual override handles the rest

**Expected User Experience:**
- 70% auto-detect successfully
- 20% use "Having trouble?" manual button
- 10% give up (acceptable for MVP)

---

### Production (Week 3-4) - GPT-4o Vision

**Use:** OpenAI GPT-4o for high accuracy

```typescript
// lib/bottle-detection-v2.ts
export async function detectBottleGPT(imageBase64: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: `Analyze this image and determine:
          1. Is this an Irish whiskey bottle?
          2. What brand is it? (Jameson, Tullamore Dew, Bushmills, Proper Twelve, or Other)
          3. How confident are you? (0-1)

          Respond with JSON: {"brand": "...", "confidence": 0.XX, "isIrishWhiskey": true/false}`
        },
        {
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${imageBase64}` }
        }
      ]
    }],
    max_tokens: 100
  });

  return JSON.parse(response.choices[0].message.content);
}
```

**Expected Accuracy:**
- 90%+ auto-detect successfully
- 5% use manual override
- 5% give up

**Cost:** $100/month for 10k scans (worth it for better UX)

---

### Long-term (Month 2+) - Custom Roboflow Model

**Use:** Train custom YOLOv8 model for maximum accuracy

**Steps:**
1. Collect 500+ real user bottle photos
2. Label in Roboflow (2 hours)
3. Train model (automatic, 1 hour)
4. Deploy to production

**Expected Accuracy:**
- 95%+ auto-detect successfully
- 3% use manual override
- 2% give up

**Cost:** $49/month (cheaper than GPT-4o long-term)

---

## Real-World Testing Plan

### Week 1: Google Vision MVP
```bash
# Test with real bottles
1. Jameson Original - front label (expect: ✅ 85% confidence)
2. Jameson Original - angled (expect: ⚠️ 60% confidence)
3. Jameson Black Barrel (expect: ✅ 80% confidence)
4. Tullamore Dew (expect: ❌ 40% confidence - misidentified)
5. Poor lighting (expect: ❌ 30% confidence)
```

**Acceptance Criteria:**
- Front label detection: >75% accuracy
- Manual override: Always available after 10 seconds

### Week 3: GPT-4o Upgrade
```bash
# Same tests with GPT-4o
1. Jameson Original - front label (expect: ✅ 95% confidence)
2. Jameson Original - angled (expect: ✅ 85% confidence)
3. Jameson Black Barrel (expect: ✅ 90% confidence)
4. Tullamore Dew (expect: ✅ 90% confidence - correctly identified)
5. Poor lighting (expect: ✅ 75% confidence)
```

**Acceptance Criteria:**
- Overall detection: >85% accuracy
- Brand differentiation: >80% accuracy

---

## Code Implementation (MVP)

### Update `/api/detect-bottle/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import vision from '@google-cloud/vision';

const credentials = JSON.parse(
  Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS || '', 'base64').toString('utf-8')
);

const client = new vision.ImageAnnotatorClient({ credentials });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as Blob;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run OCR and label detection in parallel
    const [textResult, labelResult] = await Promise.all([
      client.textDetection(buffer),
      client.labelDetection(buffer)
    ]);

    // Extract text
    const detectedText = textResult[0].textAnnotations?.[0]?.description?.toLowerCase() || '';

    // Extract labels
    const labels = labelResult[0].labelAnnotations?.map(l => ({
      description: l.description?.toLowerCase(),
      score: l.score || 0
    })) || [];

    // Check for whiskey indicators
    const whiskeyLabels = labels.filter(l =>
      l.description?.includes('whiskey') ||
      l.description?.includes('whisky') ||
      l.description?.includes('bottle') ||
      l.description?.includes('drink') ||
      l.description?.includes('alcohol')
    );

    // Brand detection via OCR
    const brandDetection = {
      jameson: detectedText.includes('jameson'),
      tullamore: detectedText.includes('tullamore') || detectedText.includes('dew'),
      bushmills: detectedText.includes('bushmills'),
      proper: detectedText.includes('proper') && detectedText.includes('twelve'),
    };

    let brand = 'Unknown';
    let confidence = 0;
    let detected = false;

    // Jameson detected
    if (brandDetection.jameson) {
      brand = 'Jameson Irish Whiskey';
      confidence = 0.88;
      detected = true;
    }
    // Other Irish whiskey detected
    else if (brandDetection.tullamore || brandDetection.bushmills || brandDetection.proper) {
      if (brandDetection.tullamore) brand = 'Tullamore Dew';
      if (brandDetection.bushmills) brand = 'Bushmills';
      if (brandDetection.proper) brand = 'Proper Twelve';
      confidence = 0.85;
      detected = true;
    }
    // Generic whiskey detected
    else if (whiskeyLabels.length >= 2) {
      brand = 'Generic Whiskey';
      confidence = whiskeyLabels[0]?.score || 0.65;
      detected = confidence > 0.60;
    }

    return NextResponse.json({
      detected,
      brand,
      confidence: Math.round(confidence * 100) / 100,
      debugInfo: {
        detectedText: detectedText.substring(0, 200), // First 200 chars
        labels: labels.slice(0, 5).map(l => l.description),
        whiskeyLabelsCount: whiskeyLabels.length,
        brandFlags: brandDetection,
      }
    });
  } catch (error) {
    console.error('Detection error:', error);
    return NextResponse.json(
      { error: 'Detection failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
```

---

## Summary

### **For MVP (Ship in 1 week):**
✅ Use **Google Vision API** with OCR + Label Detection
- Cost: $15/month for 10k scans
- Accuracy: 70-80% auto-detect
- Implementation: 1-2 hours
- Manual override handles edge cases

### **For Production (Week 3):**
✅ Upgrade to **GPT-4o Vision**
- Cost: $100/month for 10k scans
- Accuracy: 90%+ auto-detect
- Implementation: 1 hour to switch

### **For Scale (Month 2+):**
✅ Train **Custom Roboflow Model**
- Cost: $49/month
- Accuracy: 95%+ auto-detect
- Implementation: 8-16 hours total

---

## Next Steps

1. **Today:** Implement Google Vision OCR (1 hour)
2. **This week:** Test with real Jameson bottles (2 hours)
3. **Week 2:** Decide: Stick with Google Vision or upgrade to GPT-4o
4. **Week 3:** Collect user bottle photos for training data
5. **Month 2:** Train custom Roboflow model

**Recommendation:** Start with Google Vision MVP, collect real user data, then upgrade to GPT-4o or custom model based on actual accuracy metrics.

Ready to implement the Google Vision version?
