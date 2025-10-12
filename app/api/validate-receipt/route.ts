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

interface FraudCheckResult {
  isLikelyRealPhoto: boolean;
  warnings: string[];
}

interface ReceiptValidationResult {
  isValid: boolean;
  hasKeepersHeart: boolean;
  hasReceiptKeywords: boolean;
  confidence: number;
  detectedText: string;
  matchedKeywords: string[];
  errors: string[];
}

async function checkImageProperties(imageBuffer: Buffer): Promise<FraudCheckResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    // Skip fraud check if API not configured
    return { isLikelyRealPhoto: true, warnings: [] };
  }

  const base64Image = imageBuffer.toString('base64');

  // Use IMAGE_PROPERTIES detection to check for screenshot indicators
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
              { type: 'IMAGE_PROPERTIES' },
              { type: 'LABEL_DETECTION', maxResults: 20 },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    // If check fails, allow it through (don't block legitimate users)
    return { isLikelyRealPhoto: true, warnings: [] };
  }

  const data = await response.json();
  const result = data.responses[0];
  const warnings: string[] = [];

  // Check labels for screenshot/computer indicators
  const labels = result.labelAnnotations?.map((l: any) => l.description?.toLowerCase()) || [];

  const screenshotIndicators = [
    'screenshot',
    'computer screen',
    'display device',
    'monitor',
    'laptop',
    'desktop',
    'phone screen',
    'mobile phone display'
  ];

  const hasScreenshotLabel = labels.some((label: string) =>
    screenshotIndicators.some(indicator => label.includes(indicator))
  );

  if (hasScreenshotLabel) {
    warnings.push('Image appears to be a screenshot of a digital screen');
  }

  // Check for very uniform colors (screenshots tend to be too clean)
  const colors = result.imagePropertiesAnnotation?.dominantColors?.colors || [];
  if (colors.length < 5) {
    warnings.push('Image has too few colors (may be edited or digital)');
  }

  console.log('🔍 Fraud Check Results:', {
    hasScreenshotLabel,
    colorCount: colors.length,
    warnings,
    labels: labels.slice(0, 10),
  });

  return {
    isLikelyRealPhoto: warnings.length === 0,
    warnings,
  };
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

  // Validation checks and error collection
  const errors: string[] = [];

  // 1. Must have "Keeper's Heart" text
  if (!hasKeepersHeart) {
    errors.push('Receipt must show "Keeper\'s Heart" purchase');
  }

  // 2. Must have receipt characteristics (at least 3 keywords)
  if (matchedKeywords.length < 3) {
    errors.push('Image does not appear to be a valid receipt (missing receipt keywords)');
  }

  // 3. Must have substantial text (prevent simple text on screen)
  if (textLength < 100) {
    errors.push('Receipt text too short - please upload a complete receipt');
  }

  // 4. Check for price indicators (whiskey should cost $20-$80 typically)
  const pricePattern = /\$?\s*(\d{1,3}(?:\.\d{2})?)/g;
  const prices = [...normalizedText.matchAll(pricePattern)]
    .map(match => parseFloat(match[1]))
    .filter(price => price >= 15 && price <= 150); // Reasonable whiskey price range

  if (prices.length === 0) {
    errors.push('No valid price found on receipt');
  }

  // 5. Check for date (should be recent - within last 30 days)
  const hasDate = normalizedText.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/);
  if (!hasDate) {
    errors.push('No date found on receipt');
  }

  // 6. Check for merchant/store name or business indicators
  const hasBusinessInfo =
    normalizedText.includes('llc') ||
    normalizedText.includes('inc') ||
    normalizedText.includes('store') ||
    normalizedText.includes('shop') ||
    normalizedText.includes('bar') ||
    normalizedText.includes('restaurant') ||
    normalizedText.includes('liquor');

  if (!hasBusinessInfo) {
    errors.push('Receipt must show business/merchant information');
  }

  // Determine if receipt is valid (no critical errors)
  const isValid = errors.length === 0;

  // Log everything for review
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📄 RECEIPT VALIDATION LOG');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(isValid ? '✅ VALID' : '❌ INVALID');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ Has Keeper\'s Heart:', hasKeepersHeart);
  console.log('✅ Has Receipt Keywords:', hasReceiptKeywords, `(${matchedKeywords.length}/9)`);
  console.log('📊 Confidence Score:', confidence.toFixed(2));
  console.log('📝 Text Length:', textLength, 'characters');
  console.log('💰 Prices Found:', prices.length > 0 ? prices.join(', ') : 'none');
  console.log('📅 Has Date:', !!hasDate);
  console.log('🏪 Has Business Info:', hasBusinessInfo);
  console.log('🔍 Matched Keywords:', matchedKeywords.join(', ') || 'none');
  if (errors.length > 0) {
    console.log('❌ ERRORS:');
    errors.forEach((err, i) => console.log(`   ${i + 1}. ${err}`));
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📄 FULL DETECTED TEXT:');
  console.log(fullText || '(no text detected)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return {
    isValid,
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

    // Additional fraud checks using Vision API image properties
    const fraudCheckResult = await checkImageProperties(buffer);

    if (!fraudCheckResult.isLikelyRealPhoto) {
      return NextResponse.json(
        {
          isValid: false,
          errors: fraudCheckResult.warnings,
          message: 'Please upload a photo of a physical receipt, not a screenshot or edited image'
        },
        { status: 400 }
      );
    }

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
