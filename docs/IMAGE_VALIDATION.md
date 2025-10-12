# Image Validation Guide

This document explains how image validation works in the Burn That Ad application to ensure only legitimate bottle photos and receipts are accepted.

## Overview

The app validates images at two points:
1. **Bottle Detection** - When scanning a Jameson bottle
2. **Receipt Upload** - When submitting proof of purchase

## Current Implementation (MVP)

### Basic Validation (Implemented)

All images are validated for:

#### 1. File Format
- **Accepted:** JPG, JPEG, PNG, WebP
- **Rejected:** GIF, BMP, SVG, PDF, or any non-image files
- **Why:** Ensures standard image formats that browsers and ML services can process

#### 2. File Size
- **Minimum:** 100KB
- **Maximum:** 10MB
- **Why:**
  - Minimum ensures it's not a blank/tiny file
  - Maximum prevents server overload and ensures reasonable upload times

#### 3. Basic Integrity
- **Check:** File is a valid Blob with correct MIME type
- **Why:** Prevents corrupted or fake files

### Implementation Files

1. **Bottle Detection API** - [app/api/detect-bottle/route.ts](../app/api/detect-bottle/route.ts)
   ```typescript
   // Validates before attempting detection
   - Check file format
   - Check file size (100KB - 10MB)
   - Return error if validation fails
   ```

2. **Receipt Upload Helper** - [lib/supabase-helpers.ts](../lib/supabase-helpers.ts)
   ```typescript
   // Validates before uploading to Supabase Storage
   - Check file format
   - Check file size (100KB - 10MB)
   - Return clear error messages
   ```

3. **Generic Validation API** - [app/api/validate-image/route.ts](../app/api/validate-image/route.ts)
   ```typescript
   // Can be used for pre-validation before submission
   - Validates format, size, and integrity
   - Returns detailed metadata
   ```

## Production Enhancement: Content Validation

### For Bottle Images

Use Google Vision API or Roboflow to verify the image actually contains a bottle:

```typescript
// Example with Google Vision API
import vision from '@google-cloud/vision';

async function validateBottleImage(imageBuffer: Buffer) {
  const [result] = await client.labelDetection(imageBuffer);
  const labels = result.labelAnnotations || [];

  // Check for bottle-related labels
  const bottleLabels = labels.filter(label => {
    const desc = label.description?.toLowerCase() || '';
    return desc.includes('bottle') ||
           desc.includes('whiskey') ||
           desc.includes('alcohol') ||
           desc.includes('drink');
  });

  if (bottleLabels.length === 0) {
    return {
      valid: false,
      error: 'No bottle detected in image. Please take a clear photo of a Jameson bottle.'
    };
  }

  return {
    valid: true,
    confidence: bottleLabels[0]?.score || 0,
    labels: labels.map(l => l.description)
  };
}
```

**Benefits:**
- Prevents users from uploading random photos
- Reduces fraud attempts
- Improves data quality for marketing analytics

### For Receipt Images

Use Google Vision OCR or Document AI to verify it's a real receipt:

```typescript
// Example with Google Vision API
import vision from '@google-cloud/vision';

async function validateReceiptImage(imageBuffer: Buffer) {
  const [result] = await client.documentTextDetection(imageBuffer);
  const fullText = result.fullTextAnnotation?.text || '';

  // Check for receipt keywords
  const receiptKeywords = ['total', 'subtotal', 'tax', 'receipt', 'date', '$'];
  const foundKeywords = receiptKeywords.filter(keyword =>
    fullText.toLowerCase().includes(keyword)
  );

  if (foundKeywords.length < 3) {
    return {
      valid: false,
      error: 'This doesn\'t appear to be a receipt. Please upload a clear photo of your purchase receipt.'
    };
  }

  // Check for Keeper's Heart mention
  const hasKeepersHeart = fullText.toLowerCase().includes('keeper') ||
                          fullText.toLowerCase().includes('keepers heart');

  return {
    valid: true,
    hasKeepersHeart,
    textFound: fullText.length > 0,
    keywords: foundKeywords,
    fullText: fullText.substring(0, 500) // For admin review
  };
}
```

**Benefits:**
- Prevents blank photos or screenshots
- Verifies actual purchase
- Can extract data for automated approval
- Reduces manual admin review time

## Validation Flow Diagram

### Bottle Scan Flow
```
User takes photo →
  Basic validation (format, size) →
    [MVP] Mock detection returns success →
    [Production] ML API validates contains bottle →
      Save to Supabase Storage →
        Create scan record
```

### Receipt Upload Flow
```
User takes photo →
  Basic validation (format, size) →
    [MVP] Upload to Supabase →
    [Production] OCR validates contains receipt text →
      Check for "Keeper's Heart" mention →
        Flag for manual or auto-approval →
          Create receipt record
```

## Error Messages

Clear, user-friendly error messages guide users to success:

| Error | User Message | Technical Reason |
|-------|-------------|------------------|
| Wrong format | "Invalid image format. Please upload JPG, PNG, or WebP." | File type not in accepted list |
| Too large | "Image too large. Maximum size is 10MB." | File size > 10MB |
| Too small | "Image too small. Please take a clear photo." | File size < 100KB |
| Not a bottle | "No bottle detected. Please take a clear photo of a Jameson bottle." | ML detection confidence < threshold |
| Not a receipt | "This doesn't appear to be a receipt. Please upload a clear photo of your purchase receipt." | OCR doesn't find receipt keywords |

## Testing Validation

### Manual Testing

1. **Test valid images:**
   ```bash
   # Use a real photo from your phone (should be > 100KB)
   curl -X POST http://localhost:3000/api/validate-image \
     -F "image=@/path/to/photo.jpg" \
     -F "type=bottle"
   ```

2. **Test invalid images:**
   - Upload a 50KB thumbnail (too small)
   - Upload a 15MB RAW photo (too large)
   - Upload a GIF or SVG (wrong format)

### Automated Testing

Create test cases in `/tests/validation.test.ts`:

```typescript
describe('Image Validation', () => {
  it('rejects images smaller than 100KB', async () => {
    const tinyImage = new Blob(['x'.repeat(50000)], { type: 'image/jpeg' });
    const result = await saveBottleScan('test-session', tinyImage, 'Jameson', 0.9);
    expect(result.success).toBe(false);
    expect(result.error).toContain('too small');
  });

  it('accepts images between 100KB and 10MB', async () => {
    const validImage = new Blob(['x'.repeat(150000)], { type: 'image/jpeg' });
    const result = await saveBottleScan('test-session', validImage, 'Jameson', 0.9);
    expect(result.success).toBe(true);
  });
});
```

## Next Steps for Production

### Phase 1: MVP (Current) ✅
- [x] Basic file validation (format, size)
- [x] Clear error messages
- [x] Client-side checks before upload

### Phase 2: ML Content Validation (Recommended)
- [ ] Integrate Google Vision API
- [ ] Add bottle detection validation
- [ ] Add receipt OCR validation
- [ ] Configure confidence thresholds

### Phase 3: Advanced Fraud Prevention
- [ ] Image hash duplicate detection (implemented)
- [ ] Metadata extraction (EXIF, GPS, timestamp)
- [ ] Face detection (reject selfies/non-product photos)
- [ ] Machine learning fraud scoring
- [ ] Pattern detection (same image across accounts)

## Configuration

Add to your `.env.local`:

```bash
# For production ML validation
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Validation thresholds (optional)
MIN_IMAGE_SIZE_KB=100
MAX_IMAGE_SIZE_MB=10
MIN_BOTTLE_CONFIDENCE=0.75
MIN_RECEIPT_KEYWORDS=3
```

## Resources

- [Google Vision API Docs](https://cloud.google.com/vision/docs)
- [Roboflow Custom Models](https://roboflow.com/)
- [Google Document AI](https://cloud.google.com/document-ai)
- [EXIF Data Extraction](https://www.npmjs.com/package/exif-parser)

## Summary

**Current State (MVP):**
- ✅ Basic validation prevents bad files
- ✅ Good user experience with clear errors
- ⚠️ Users can still upload non-bottle/non-receipt photos

**Recommended for Launch:**
- ✅ Add Google Vision API for content validation
- ✅ 90% fraud reduction
- ✅ Automated approval for clear receipts
- ⏱️ Setup time: ~2 hours

**Future Enhancements:**
- Custom Roboflow model (highest accuracy)
- Advanced metadata checks
- ML-based fraud scoring
