import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

// Competitor brands we're targeting (16 total)
const COMPETITOR_BRANDS = {
  // Irish Whiskey
  'jameson': 'Jameson Irish Whiskey',
  'tullamore': 'Tullamore Dew',
  'bushmills': 'Bushmills',
  'redbreast': 'Redbreast',
  'writers': 'Writers\' Tears',
  'teeling': 'Teeling',

  // Scotch Whisky
  'johnnie walker': 'Johnnie Walker',
  'johnnie': 'Johnnie Walker',

  // American Whiskey (Bourbon/Rye)
  'bulleit': 'Bulleit',
  'woodford': 'Woodford Reserve',
  'maker': 'Maker\'s Mark',
  'angel': 'Angel\'s Envy',
  'high west': 'High West',
  'michter': 'Michter\'s',
  'knob creek': 'Knob Creek',
  'four roses': 'Four Roses'
};

interface NormalizedBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function normalizeBoundingPoly(
  boundingPoly: any,
  dimensions: { width?: number | null; height?: number | null }
): NormalizedBoundingBox | null {
  if (!boundingPoly) return null;

  if (boundingPoly.normalizedVertices && boundingPoly.normalizedVertices.length >= 4) {
    const xs = boundingPoly.normalizedVertices.map((v: any) => v.x ?? 0);
    const ys = boundingPoly.normalizedVertices.map((v: any) => v.y ?? 0);
    const minX = Math.max(0, Math.min(...xs));
    const maxX = Math.min(1, Math.max(...xs));
    const minY = Math.max(0, Math.min(...ys));
    const maxY = Math.min(1, Math.max(...ys));

    return {
      x: minX,
      y: minY,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxY - minY),
    };
  }

  const { width, height } = dimensions;
  if (!width || !height) return null;

  const vertices = boundingPoly.vertices;
  if (!vertices || vertices.length < 4) return null;

  const xs = vertices.map((v: any) => v.x ?? 0);
  const ys = vertices.map((v: any) => v.y ?? 0);
  const minX = Math.max(0, Math.min(...xs));
  const maxX = Math.max(0, Math.max(...xs));
  const minY = Math.max(0, Math.min(...ys));
  const maxY = Math.max(0, Math.max(...ys));

  return {
    x: minX / width,
    y: minY / height,
    width: Math.max(0, (maxX - minX) / width),
    height: Math.max(0, (maxY - minY) / height),
  };
}

function expandNormalizedBox(box: NormalizedBoundingBox | null, expandX = 1.20, expandY = 1.20) {
  if (!box) return null;

  // Moderate expansion - 20% for visual overlay (fire animation)
  // This is ONLY for the visual fire animation overlay
  // The morph API uses the normalized (non-expanded) box and adds its own padding
  //
  // Accounts for:
  // - Text/logo detection only capturing label area (not full bottle)
  // - Some margin around bottle for fire effect
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const width = box.width * expandX;
  const height = box.height * expandY;
  const x = centerX - width / 2;
  const y = centerY - height / 2;

  // Clamp to screen bounds
  return {
    x: Math.max(0, Math.min(x, 1 - width)),
    y: Math.max(0, Math.min(y, 1 - height)),
    width: Math.min(width, 1),
    height: Math.min(height, 1),
  };
}

async function detectBottleWithVision(
  imageBuffer: Buffer,
  dimensions: { width?: number | null; height?: number | null }
) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_VISION_API_KEY not configured');
  }

  // Convert image buffer to base64
  const base64Image = imageBuffer.toString('base64');

  // Call Google Vision API REST endpoint
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
              { type: 'LABEL_DETECTION', maxResults: 50 },
              { type: 'TEXT_DETECTION', maxResults: 50 },
              { type: 'LOGO_DETECTION', maxResults: 10 },
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 }, // Better bounding boxes
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

  // Combine all text detections (with bounding boxes)
  const textAnnotations = result.textAnnotations || [];
  const detectedTexts = textAnnotations.map((t: any) =>
    t.description?.toLowerCase() || ''
  );

  // Get labels
  const labels = result.labelAnnotations?.map((l: any) => ({
    description: l.description,
    score: l.score
  })) || [];

  // Get logos (with bounding boxes)
  const logos = result.logoAnnotations?.map((l: any) => ({
    description: l.description,
    score: l.score,
    boundingPoly: l.boundingPoly
  })) || [];

  // Get localized objects (bottles, etc.) with normalized bounding boxes
  const localizedObjects = result.localizedObjectAnnotations?.map((obj: any) => ({
    name: obj.name,
    score: obj.score,
    boundingPoly: obj.boundingPoly
  })) || [];

  // Find bottle object for better bounding box fallback
  const bottleObject = localizedObjects.find((obj: any) =>
    obj.name?.toLowerCase().includes('bottle')
  );

  // Debug: Log what objects were detected
  if (localizedObjects.length > 0) {
    console.log('📦 OBJECT_LOCALIZATION detected:', localizedObjects.map(o => `${o.name} (${(o.score * 100).toFixed(0)}%)`).join(', '));
  } else {
    console.log('⚠️  OBJECT_LOCALIZATION found no objects (bottle detection may use fallback)');
  }

  // Check for competitor brands in text, labels, and logos
  let detectedBrand = null;
  let brandConfidence = 0;
  let boundingBox = null;

  // First check logos (most reliable for brand identification)
  for (const logo of logos) {
    const desc = logo.description?.toLowerCase() || '';
    for (const [keyword, brandName] of Object.entries(COMPETITOR_BRANDS)) {
      if (desc.includes(keyword)) {
        detectedBrand = brandName;
        brandConfidence = logo.score;
        // DON'T set boundingBox here - we'll use bottle object instead
        console.log(`Found ${brandName} via logo detection`);
        break;
      }
    }
    if (detectedBrand) break;
  }

  // Then check text detections
  if (!detectedBrand) {
    // Search through individual text annotations to find the one matching our brand
    for (const [keyword, brandName] of Object.entries(COMPETITOR_BRANDS)) {
      // Find the specific text annotation that contains this brand keyword
      const matchingAnnotation = textAnnotations.find((t: any) => {
        const text = t.description?.toLowerCase() || '';
        return text.includes(keyword);
      });

      if (matchingAnnotation) {
        detectedBrand = brandName;
        brandConfidence = 0.85; // High confidence for text match
        // DON'T set boundingBox here - we'll use bottle object instead
        console.log(`Found ${brandName} in text annotation:`, matchingAnnotation.description);
        break;
      }
    }
  }

  // Finally check labels
  if (!detectedBrand) {
    for (const label of labels) {
      const desc = label.description?.toLowerCase() || '';
      for (const [keyword, brandName] of Object.entries(COMPETITOR_BRANDS)) {
        if (desc.includes(keyword)) {
          detectedBrand = brandName;
          brandConfidence = label.score;
          // DON'T set boundingBox here - we'll use bottle object instead
          console.log(`Found ${brandName} via label detection`);
          break;
        }
      }
      if (detectedBrand) break;
    }
  }

  // BOUNDING BOX PRIORITY (separate from brand detection):
  // 1. ALWAYS prefer bottle object localization (most accurate - detects full bottle)
  // 2. Fall back to logo bounding box only if no bottle object found
  // 3. Never use text bounding boxes (they're just the text, not the bottle)

  if (detectedBrand) {
    if (bottleObject) {
      boundingBox = bottleObject.boundingPoly;
      console.log('✓ Using bottle object bounding box (OBJECT_LOCALIZATION - most accurate)');
    } else {
      console.log('⚠️  WARNING: No bottle object found via OBJECT_LOCALIZATION');
      // Try to use logo bounding box as last resort
      const matchingLogo = logos.find((logo: any) => {
        const desc = logo.description?.toLowerCase() || '';
        return Object.keys(COMPETITOR_BRANDS).some(keyword => desc.includes(keyword));
      });
      if (matchingLogo) {
        boundingBox = matchingLogo.boundingPoly;
        console.log('⚠️  Using logo bounding box as fallback (less accurate - only covers label area)');
      } else {
        console.log('❌ No bounding box available - detection may fail');
      }
    }
  }

  // Check for generic whiskey bottle indicators
  const hasBottle = labels.some((l: { description: string; score: number }) =>
    l.description?.toLowerCase().includes('bottle')
  );
  const hasWhiskey = labels.some((l: { description: string; score: number }) => {
    const desc = l.description?.toLowerCase() || '';
    return desc.includes('whiskey') || desc.includes('whisky') || desc.includes('bourbon');
  });

  const normalizedBoundingBox = normalizeBoundingPoly(boundingBox, dimensions);

  // Debug logging
  console.log('Detection Summary:', {
    brand: detectedBrand,
    confidence: brandConfidence,
    hasBoundingBox: !!boundingBox,
    boundingBoxSource: boundingBox ? 'found' : 'missing',
    bottleObjectFound: !!bottleObject,
    normalizedBox: normalizedBoundingBox,
    imageDimensions: dimensions,
  });

  return {
    detected: !!detectedBrand,
    brand: detectedBrand || 'Unknown',
    confidence: brandConfidence,
    boundingBox: boundingBox, // Bounding polygon vertices
    normalizedBoundingBox,
    expandedBoundingBox: expandNormalizedBox(normalizedBoundingBox),
    hasBottle,
    hasWhiskey,
    labels: labels.map((l: { description: string; score: number }) => l.description).filter(Boolean),
    detectedText: detectedTexts[0] || '', // Full text from image
    // Debug info (remove in production)
    _debug: {
      logoCount: logos.length,
      textAnnotationCount: textAnnotations.length,
      localizedObjectCount: localizedObjects.length,
      bottleObjectScore: bottleObject?.score,
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

    // Determine image dimensions for bounding box normalization
    const metadata = await sharp(buffer).metadata();

    // Call Google Vision API
    const detectionResult = await detectBottleWithVision(buffer, {
      width: metadata.width,
      height: metadata.height,
    });

    return NextResponse.json({
      ...detectionResult,
      validated: true, // Image validation passed
    });
  } catch (error) {
    console.error('Bottle detection error:', error);
    return NextResponse.json(
      {
        error: 'Detection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/*
// Example Google Vision API integration:
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Competitor brands we're targeting (16 total)
const COMPETITOR_BRANDS = {
  // Irish Whiskey
  'jameson': 'Jameson Irish Whiskey',
  'tullamore': 'Tullamore Dew',
  'bushmills': 'Bushmills',
  'redbreast': 'Redbreast',
  'writers': 'Writers\' Tears',
  'teeling': 'Teeling',

  // Scotch Whisky
  'johnnie walker': 'Johnnie Walker',
  'johnnie': 'Johnnie Walker',

  // American Whiskey (Bourbon/Rye)
  'bulleit': 'Bulleit',
  'woodford': 'Woodford Reserve',
  'maker': 'Maker\'s Mark',
  'angel': 'Angel\'s Envy',
  'high west': 'High West',
  'michter': 'Michter\'s',
  'knob creek': 'Knob Creek',
  'four roses': 'Four Roses'
};

async function detectBottle(imageBuffer: Buffer) {
  const [result] = await client.labelDetection(imageBuffer);
  const labels = result.labelAnnotations || [];

  // Check for any competitor brand in labels
  let detectedBrand = null;
  let brandConfidence = 0;

  for (const label of labels) {
    const desc = label.description?.toLowerCase() || '';
    for (const [keyword, brandName] of Object.entries(COMPETITOR_BRANDS)) {
      if (desc.includes(keyword)) {
        detectedBrand = brandName;
        brandConfidence = label.score || 0;
        break;
      }
    }
    if (detectedBrand) break;
  }

  // Also check for generic whiskey bottle
  const hasBottle = labels.some(l =>
    l.description?.toLowerCase().includes('bottle')
  );
  const hasWhiskey = labels.some(l =>
    l.description?.toLowerCase().includes('whiskey') ||
    l.description?.toLowerCase().includes('whisky') ||
    l.description?.toLowerCase().includes('bourbon')
  );

  return {
    detected: !!detectedBrand,
    brand: detectedBrand || 'Unknown',
    confidence: brandConfidence,
    hasBottle,
    hasWhiskey,
    labels: labels.map(l => l.description).filter(Boolean),
  };
}
*/
