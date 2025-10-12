import { NextRequest, NextResponse } from 'next/server';

// Keywords that indicate a valid receipt
const RECEIPT_KEYWORDS = [
  'total',
  'subtotal',
  'tax',
  'receipt',
  'date',
  'amount',
  'paid',
  'purchase',
  'transaction'
];

// Brand name to verify (case-insensitive)
const REQUIRED_BRAND = "keeper's heart";

interface ReceiptValidationResult {
  isValid: boolean;
  hasKeepersHeart: boolean;
  hasReceiptKeywords: boolean;
  confidence: number;
  detectedText: string;
  matchedKeywords: string[];
  errors: string[];
}

async function validateReceiptWithVision(imageBuffer: Buffer): Promise<ReceiptValidationResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_VISION_API_KEY not configured');
  }

  // Convert image buffer to base64
  const base64Image = imageBuffer.toString('base64');

  // Call Google Vision API with DOCUMENT_TEXT_DETECTION
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              { type: 'DOCUMENT_TEXT_DETECTION' }, // Optimized for documents/receipts
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Vision API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const result = data.responses[0];

  // Get full text from receipt
  const fullText = result.fullTextAnnotation?.text || '';
  const normalizedText = fullText.toLowerCase();

  // Check for "Keeper's Heart" (case-insensitive, flexible spacing)
  const hasKeepersHeart =
    normalizedText.includes("keeper's heart") ||
    normalizedText.includes("keepers heart") ||
    normalizedText.includes("keeper heart") ||
    normalizedText.includes("keepersheart");

  // Check for receipt keywords
  const matchedKeywords = RECEIPT_KEYWORDS.filter(keyword =>
    normalizedText.includes(keyword)
  );
  const hasReceiptKeywords = matchedKeywords.length >= 2; // At least 2 receipt keywords

  // Calculate confidence based on text length and keyword matches
  const textLength = fullText.length;
  const keywordRatio = matchedKeywords.length / RECEIPT_KEYWORDS.length;
  const confidence = Math.min(
    (textLength > 50 ? 0.3 : 0) + // Has substantial text
    (keywordRatio * 0.4) + // Has receipt keywords
    (hasKeepersHeart ? 0.3 : 0), // Has brand name
    1.0
  );

  // Validation errors
  const errors: string[] = [];
  if (!hasKeepersHeart) {
    errors.push("Receipt must show purchase of Keeper's Heart whiskey");
  }
  if (!hasReceiptKeywords) {
    errors.push("Image doesn't appear to be a valid receipt");
  }
  if (textLength < 20) {
    errors.push("Receipt text is too short or unclear");
  }

  return {
    isValid: hasKeepersHeart && hasReceiptKeywords && textLength >= 20,
    hasKeepersHeart,
    hasReceiptKeywords,
    confidence,
    detectedText: fullText,
    matchedKeywords,
    errors,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get the image from the request
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

    // Check minimum size (100KB to ensure real photo)
    if (image.size < 100 * 1024) {
      return NextResponse.json(
        { error: 'Image too small. Please take a clear photo.' },
        { status: 400 }
      );
    }

    // Convert blob to buffer for Vision API
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate receipt with Google Vision API
    const validationResult = await validateReceiptWithVision(buffer);

    return NextResponse.json({
      ...validationResult,
      validated: true,
    });
  } catch (error) {
    console.error('Receipt validation error:', error);
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
