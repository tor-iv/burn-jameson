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

/**
 * Expand logo bounding box to approximate full bottle dimensions
 * Logos typically cover only the label area (center 1/3 of bottle)
 * We expand vertically to estimate full bottle height
 */
function expandLogoToBottle(logoBoundingPoly: any, dimensions: { width?: number | null; height?: number | null }): NormalizedBoundingBox | null {
  const normalized = normalizeBoundingPoly(logoBoundingPoly, dimensions);
  if (!normalized) return null;

  // Typical whiskey bottle aspect ratio is 2.5:1 to 3.5:1 (height:width)
  // Logo typically covers middle 30-40% of bottle height
  // Expand vertically by 3x to approximate full bottle
  const centerX = normalized.x + normalized.width / 2;
  const centerY = normalized.y + normalized.height / 2;

  const newWidth = normalized.width * 1.5; // Logos are narrower than bottle
  const newHeight = normalized.height * 3.0; // Expand to full bottle height

  // Clamp to bounds
  const x = Math.max(0, centerX - newWidth / 2);
  const y = Math.max(0, centerY - newHeight / 2);

  return {
    x,
    y,
    width: Math.min(newWidth, 1 - x),
    height: Math.min(newHeight, 1 - y),
  };
}

async function detectBottleWithVision(
  imageBuffer: Buffer,
  dimensions: { width?: number | null; height?: number | null }
) {
  const visionStartTime = Date.now(); // Performance tracking
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_VISION_API_KEY not configured');
  }

  // Convert image buffer to base64
  const base64Image = imageBuffer.toString('base64');
  const payloadSizeKB = Math.round((base64Image.length * 0.75) / 1024);
  console.log(`[VISION API] Payload size: ${payloadSizeKB}KB`);

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
              // OPTIMIZATION: Removed LABEL_DETECTION (generic labels not critical, reduces processing time)
              { type: 'TEXT_DETECTION', maxResults: 50 }, // Read brand names on bottle
              { type: 'LOGO_DETECTION', maxResults: 10 }, // Detect brand logos (fallback)
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 }, // Best bounding boxes
              { type: 'CROP_HINTS', maxResults: 3 }, // NEW: Composition analysis for fallback
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
  const visionEndTime = Date.now();
  console.log(`[VISION API] ✅ Response received in ${visionEndTime - visionStartTime}ms`);

  const result = data.responses[0];

  // Combine all text detections (with bounding boxes)
  const textAnnotations = result.textAnnotations || [];
  const detectedTexts = textAnnotations.map((t: any) =>
    t.description?.toLowerCase() || ''
  );

  // OPTIMIZATION: Labels removed (LABEL_DETECTION feature disabled for speed)
  // Use OBJECT_LOCALIZATION instead for bottle detection
  const labels: any[] = []; // Keep for compatibility but will be empty

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

  // Get crop hints (composition analysis)
  const cropHints = result.cropHintsAnnotation?.cropHints || [];

  // ENHANCED: Find bottle object - try multiple object types
  const bottleObject = localizedObjects.find((obj: any) => {
    const name = obj.name?.toLowerCase() || '';
    return ['bottle', 'drink', 'beverage', 'alcohol', 'liquor', 'wine bottle'].some(keyword => name.includes(keyword));
  });

  // Debug: Log what objects were detected
  if (localizedObjects.length > 0) {
    console.log('📦 OBJECT_LOCALIZATION detected:', localizedObjects.map((o: any) => `${o.name} (${(o.score * 100).toFixed(0)}%)`).join(', '));
  } else {
    console.log('⚠️  OBJECT_LOCALIZATION found no objects (bottle detection may use fallback)');
  }

  // Debug: Log crop hints
  if (cropHints.length > 0) {
    console.log('✂️  CROP_HINTS available:', cropHints.length, 'suggestions');
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

  // ENHANCED MULTI-PASS BOUNDING BOX DETECTION
  // Try multiple strategies in priority order for maximum accuracy
  let boundingBoxSource = 'none';

  if (detectedBrand) {
    // PASS 1: OBJECT_LOCALIZATION - Bottle/Drink/Beverage object (BEST)
    if (bottleObject) {
      boundingBox = bottleObject.boundingPoly;
      boundingBoxSource = 'object_localization';
      console.log('✅ [PASS 1] Using bottle object bounding box (OBJECT_LOCALIZATION - most accurate)');
    }
    // PASS 2: Expanded logo bounding box (GOOD)
    else {
      const matchingLogo = logos.find((logo: any) => {
        const desc = logo.description?.toLowerCase() || '';
        return Object.keys(COMPETITOR_BRANDS).some(keyword => desc.includes(keyword));
      });

      if (matchingLogo) {
        // Expand logo box to approximate full bottle dimensions
        const expandedLogo = expandLogoToBottle(matchingLogo.boundingPoly, dimensions);
        if (expandedLogo) {
          // Convert back to bounding poly format for consistency
          boundingBox = {
            normalizedVertices: [
              { x: expandedLogo.x, y: expandedLogo.y },
              { x: expandedLogo.x + expandedLogo.width, y: expandedLogo.y },
              { x: expandedLogo.x + expandedLogo.width, y: expandedLogo.y + expandedLogo.height },
              { x: expandedLogo.x, y: expandedLogo.y + expandedLogo.height },
            ]
          };
          boundingBoxSource = 'logo_expanded';
          console.log('⚠️  [PASS 2] Using expanded logo bounding box (3x vertical expansion)');
        }
      }
    }

    // PASS 3: CROP_HINTS - Vision API composition analysis (FALLBACK)
    if (!boundingBox && cropHints.length > 0) {
      // Use the first (best) crop hint suggestion
      const bestCropHint = cropHints[0];
      boundingBox = bestCropHint.boundingPoly;
      boundingBoxSource = 'crop_hints';
      console.log('⚠️  [PASS 3] Using CROP_HINTS suggestion (composition analysis)');
    }

    // PASS 4: Centered fallback with standard bottle proportions (LAST RESORT)
    if (!boundingBox) {
      console.log('❌ [PASS 4] No bounding box detected - using centered fallback');
      boundingBoxSource = 'fallback_centered';
      // Will use FALLBACK_BOX in client (defined in scanning page)
    }
  }

  // Check for generic whiskey bottle indicators using OBJECT_LOCALIZATION
  // OPTIMIZATION: Use localized objects instead of labels (more accurate anyway)
  const hasBottle = !!bottleObject; // Already found via OBJECT_LOCALIZATION
  const hasWhiskey = detectedTexts.some((text: string) => {
    return text.includes('whiskey') || text.includes('whisky') || text.includes('bourbon');
  });

  const normalizedBoundingBox = normalizeBoundingPoly(boundingBox, dimensions);

  // Calculate aspect ratio from normalized bounding box for brand-specific shape selection
  const aspectRatio = normalizedBoundingBox
    ? normalizedBoundingBox.height / normalizedBoundingBox.width
    : null;

  // Debug logging
  console.log('Detection Summary:', {
    brand: detectedBrand,
    confidence: brandConfidence,
    hasBoundingBox: !!boundingBox,
    boundingBoxSource, // NEW: Shows which detection pass succeeded
    bottleObjectFound: !!bottleObject,
    cropHintsAvailable: cropHints.length,
    normalizedBox: normalizedBoundingBox,
    aspectRatio: aspectRatio?.toFixed(2),
    imageDimensions: dimensions,
  });

  // Get segmentation mask if brand detected (optional - don't block on failure)
  // Feature flag: Disable Gemini segmentation (currently not working - returns empty response)
  // Using client-side bottle-shaped clip-path instead (see lib/bottle-shape.ts)
  const ENABLE_GEMINI_SEGMENTATION = false;

  let segmentationMask = null;
  if (detectedBrand && ENABLE_GEMINI_SEGMENTATION) {
    try {
      console.log('[DETECT-BOTTLE] 🎨 Requesting segmentation mask from Gemini...');
      const segmentStartTime = Date.now();

      // Call internal segmentation API using the base64Image already converted above
      const segmentResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004'}/api/segment-bottle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: `data:image/jpeg;base64,${base64Image}`,
        }),
      });

      if (segmentResponse.ok) {
        const segmentData = await segmentResponse.json();
        segmentationMask = segmentData.mask;
        console.log(`[DETECT-BOTTLE] ✅ Got segmentation mask in ${Date.now() - segmentStartTime}ms`);
      } else {
        console.warn('[DETECT-BOTTLE] ⚠️  Segmentation failed, using rectangular bounding box only');
      }
    } catch (error) {
      console.warn('[DETECT-BOTTLE] ⚠️  Segmentation error (non-fatal):', error instanceof Error ? error.message : 'Unknown');
      // Continue without mask - fire animation will fall back to rectangle
    }
  }

  return {
    detected: !!detectedBrand,
    brand: detectedBrand || 'Unknown',
    confidence: brandConfidence,
    boundingBox: boundingBox, // Bounding polygon vertices
    boundingBoxSource, // NEW: Which detection strategy succeeded
    normalizedBoundingBox,
    expandedBoundingBox: expandNormalizedBox(normalizedBoundingBox),
    aspectRatio, // Height/width ratio for brand-specific shape selection
    segmentationMask, // Pixel-perfect bottle mask (may be null if failed)
    hasBottle,
    hasWhiskey,
    labels: labels.map((l: { description: string; score: number }) => l.description).filter(Boolean),
    detectedText: detectedTexts[0] || '', // Full text from image
    // Debug info (remove in production)
    _debug: {
      logoCount: logos.length,
      textAnnotationCount: textAnnotations.length,
      localizedObjectCount: localizedObjects.length,
      cropHintsCount: cropHints.length,
      bottleObjectScore: bottleObject?.score,
      hasSegmentationMask: !!segmentationMask,
      aspectRatio: aspectRatio?.toFixed(2),
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

    // Get original image dimensions for bounding box normalization
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 1024;
    const originalHeight = metadata.height || 1024;

    // OPTIMIZATION: Resize image to max 1024px for faster Vision API processing
    // Vision API optimal size is 640-1024px for object detection
    // This reduces payload size and processing time by 30-50% with no accuracy loss
    let optimizedBuffer: Buffer = buffer;
    const maxDimension = Math.max(originalWidth, originalHeight);

    if (maxDimension > 1024) {
      console.log(`[VISION API OPTIMIZATION] Resizing ${originalWidth}x${originalHeight} → max 1024px`);
      const resizedBuffer = await sharp(buffer)
        .resize(1024, 1024, {
          fit: 'inside', // Maintain aspect ratio
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 }) // Convert to JPEG for smaller size
        .toBuffer();

      optimizedBuffer = resizedBuffer as Buffer;

      const originalSize = Math.round(buffer.length / 1024);
      const optimizedSize = Math.round(optimizedBuffer.length / 1024);
      console.log(`[VISION API OPTIMIZATION] Reduced payload: ${originalSize}KB → ${optimizedSize}KB (${Math.round((1 - optimizedSize/originalSize) * 100)}% smaller)`);
    }

    // Call Google Vision API with optimized image
    const detectionResult = await detectBottleWithVision(optimizedBuffer, {
      width: originalWidth, // Use original dimensions for bounding box calculations
      height: originalHeight,
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
