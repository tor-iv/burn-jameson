import { NextRequest, NextResponse } from 'next/server';

/**
 * Generic image validation endpoint
 * Validates if an image is actually a photo and meets basic requirements
 * Can be used for both bottle and receipt validation
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as Blob;
    const type = formData.get('type') as string; // 'bottle' or 'receipt'

    if (!image) {
      return NextResponse.json(
        { valid: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    // Validate image type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(image.type)) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid image format. Please upload JPG, PNG, or WebP.'
      });
    }

    // Validate image size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (image.size > maxSize) {
      return NextResponse.json({
        valid: false,
        error: 'Image too large. Maximum size is 10MB.'
      });
    }

    // Validate minimum size (at least 100KB to ensure it's a real photo)
    const minSize = 100 * 1024;
    if (image.size < minSize) {
      return NextResponse.json({
        valid: false,
        error: 'Image too small. Please take a clear photo.'
      });
    }

    // TODO: Add Google Vision API integration for content validation
    // This would check if the image actually contains a bottle or receipt

    // For now, basic validation passes
    return NextResponse.json({
      valid: true,
      message: 'Image validation passed',
      metadata: {
        type: image.type,
        size: image.size,
        sizeFormatted: `${(image.size / 1024 / 1024).toFixed(2)}MB`
      }
    });
  } catch (error) {
    console.error('Image validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}

/**
 * Example Google Vision API integration for content validation:
 *
 * import vision from '@google-cloud/vision';
 *
 * const client = new vision.ImageAnnotatorClient({
 *   keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
 * });
 *
 * async function validateBottleImage(imageBuffer: Buffer) {
 *   const [result] = await client.labelDetection(imageBuffer);
 *   const labels = result.labelAnnotations || [];
 *
 *   // Check if image contains bottle-related labels
 *   const bottleLabels = labels.filter(label => {
 *     const desc = label.description?.toLowerCase() || '';
 *     return desc.includes('bottle') ||
 *            desc.includes('whiskey') ||
 *            desc.includes('alcohol') ||
 *            desc.includes('drink');
 *   });
 *
 *   return {
 *     valid: bottleLabels.length > 0,
 *     confidence: bottleLabels[0]?.score || 0,
 *     labels: labels.map(l => l.description)
 *   };
 * }
 *
 * async function validateReceiptImage(imageBuffer: Buffer) {
 *   const [result] = await client.documentTextDetection(imageBuffer);
 *   const fullText = result.fullTextAnnotation?.text || '';
 *
 *   // Check if text contains receipt-like keywords
 *   const receiptKeywords = ['total', 'subtotal', 'tax', 'receipt', 'date', '$'];
 *   const hasReceiptKeywords = receiptKeywords.some(keyword =>
 *     fullText.toLowerCase().includes(keyword)
 *   );
 *
 *   return {
 *     valid: hasReceiptKeywords,
 *     textFound: fullText.length > 0,
 *     keywords: receiptKeywords.filter(k => fullText.toLowerCase().includes(k))
 *   };
 * }
 */
