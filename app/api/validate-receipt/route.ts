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

// Fuzzy string matching - calculate similarity between two strings
function fuzzyMatch(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Calculate Levenshtein distance (edit distance between strings)
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

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
  // Relaxed from < 5 to < 3 to avoid false positives on white receipts
  const colors = result.imagePropertiesAnnotation?.dominantColors?.colors || [];
  if (colors.length < 3) {
    warnings.push('Image has suspiciously few colors (may be edited or digital)');
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

  // Check for "Keeper's Heart" with fuzzy matching (handles OCR errors)
  const brandVariants = [
    "keeper's heart",
    "keepers heart",
    "keeper heart",
    "keepersheart",
    "keeper s heart",
    "keeper 's heart"
  ];

  // First check exact matches
  let hasKeepersHeart = brandVariants.some(variant => normalizedText.includes(variant));

  // If no exact match, try fuzzy matching on text segments
  if (!hasKeepersHeart) {
    // Split text into words and check consecutive word pairs
    const words = normalizedText.split(/\s+/);
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      const similarity = fuzzyMatch(bigram, "keepers heart");

      // 85% similarity threshold (allows 2-3 character errors)
      if (similarity >= 0.85) {
        hasKeepersHeart = true;
        console.log(`✅ Fuzzy match found: "${bigram}" (${(similarity * 100).toFixed(1)}% similar)`);
        break;
      }
    }
  }

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

  // 4. Check for price indicators - any reasonable dollar amount
  const pricePattern = /\$\s*(\d{1,3}(?:\.\d{2})?)/g;
  const prices = [...normalizedText.matchAll(pricePattern)]
    .map(match => parseFloat(match[1]))
    .filter(price => price >= 5 && price <= 500); // Very wide range to catch any receipt

  // Also check for "total", "amount", "balance" near numbers
  const hasPriceContext =
    normalizedText.includes('total') ||
    normalizedText.includes('amount') ||
    normalizedText.includes('balance') ||
    normalizedText.includes('subtotal') ||
    prices.length > 0;

  if (!hasPriceContext) {
    errors.push('No price or total amount found on receipt');
  }

  // 5. Check for date - support multiple formats and verify freshness
  const datePatterns = [
    /\d{1,2}[-\/\.]\d{1,2}[-\/\.](20\d{2})/, // MM/DD/2025 (capture year)
    /(20\d{2})[-\/\.]\d{1,2}[-\/\.]\d{1,2}/, // 2025-MM-DD (capture year)
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}[,\s]+(20\d{2})/, // Jan 15, 2025
    /\d{1,2}\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(20\d{2})/, // 15 Jan 2025
    /\d{1,2}[-\/]\d{1,2}[-\/](\d{2})(?!\d)/, // MM/DD/25 (2-digit year)
  ];

  let hasDate = false;
  let receiptDate: Date | null = null;

  // Try to extract and parse date
  for (const pattern of datePatterns) {
    const match = normalizedText.match(pattern);
    if (match) {
      hasDate = true;

      // Try to parse the date for freshness check
      try {
        const dateStr = match[0];
        const yearMatch = match[1]; // Captured year group

        if (yearMatch) {
          let year = parseInt(yearMatch);
          // Convert 2-digit year to 4-digit
          if (year < 100) {
            year += 2000;
          }

          const now = new Date();
          const currentYear = now.getFullYear();

          // Check if year is reasonable (within 1 year)
          if (year >= currentYear - 1 && year <= currentYear) {
            receiptDate = new Date(dateStr);
            break;
          }
        }
      } catch (e) {
        // Continue if parsing fails
      }
    }
  }

  if (!hasDate) {
    errors.push('No date found on receipt');
  } else if (receiptDate && !isNaN(receiptDate.getTime())) {
    // Check if receipt is within last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (receiptDate < thirtyDaysAgo) {
      errors.push('Receipt is too old (must be within last 30 days)');
    } else if (receiptDate > now) {
      errors.push('Receipt date is in the future');
    }
  }

  // 6. Check for merchant/store name or business indicators (more lenient)
  const businessKeywords = [
    'llc', 'inc', 'ltd', 'corp', 'company', 'co.',
    'store', 'shop', 'market', 'mart',
    'bar', 'pub', 'restaurant', 'cafe', 'grill',
    'liquor', 'wine', 'spirits', 'beverage',
    'thank you', 'thanks', 'welcome', // Common receipt phrases
    'cashier', 'server', 'receipt #', 'order #',
  ];

  const hasBusinessInfo = businessKeywords.some(keyword =>
    normalizedText.includes(keyword)
  );

  // Make this a warning, not a hard error
  if (!hasBusinessInfo) {
    console.warn('⚠️ No obvious business keywords found, but allowing receipt');
    // Don't add to errors - too strict for real receipts
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

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxRequests: number = 5, windowMs: number = 60000): boolean {
  const now = Date.now();
  const limitData = rateLimitMap.get(identifier);

  if (!limitData || now > limitData.resetTime) {
    // Reset or create new limit
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (limitData.count >= maxRequests) {
    return false; // Rate limit exceeded
  }

  limitData.count++;
  return true;
}

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';

    if (!checkRateLimit(ip, 5, 60000)) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many validation requests. Please wait a minute and try again.',
          retryAfter: 60
        },
        { status: 429 }
      );
    }

    // Get the image from the request
    const formData = await request.formData();
    const image = formData.get('image') as Blob;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Basic image validation - support common formats
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const unsupportedButCommon = ['image/heic', 'image/heif']; // iPhones use HEIC

    if (unsupportedButCommon.includes(image.type)) {
      return NextResponse.json(
        {
          error: 'iPhone HEIC format detected',
          message: 'Please convert to JPG or PNG. On iPhone: Go to Settings > Camera > Formats > Select "Most Compatible"',
          tip: 'Or use a converter app before uploading'
        },
        { status: 400 }
      );
    }

    if (!validTypes.includes(image.type)) {
      return NextResponse.json(
        {
          error: 'Invalid image format',
          message: `Please upload JPG, PNG, or WebP format. You uploaded: ${image.type}`,
          validFormats: ['JPG', 'PNG', 'WebP']
        },
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
