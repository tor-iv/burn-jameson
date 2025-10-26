import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

/**
 * Detect cans and sparkling water bottles using Google Vision API
 * Used in test mode to allow morphing soda cans and sparkling water into Keeper's Heart bottles
 *
 * Detection strategy:
 * - Cans: shorter/wider objects (aspect ratio 0.8-1.2)
 * - Sparkling water: taller/narrower bottles (aspect ratio 1.8-2.5)
 */

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

async function detectCanOrBottleWithVision(
  imageBuffer: Buffer,
  dimensions: { width?: number | null; height?: number | null }
) {
  const visionStartTime = Date.now();
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_VISION_API_KEY not configured');
  }

  // Convert image buffer to base64
  const base64Image = imageBuffer.toString('base64');
  const payloadSizeKB = Math.round((base64Image.length * 0.75) / 1024);
  console.log(`[DETECT-CAN API] Payload size: ${payloadSizeKB}KB`);

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
              { type: 'LABEL_DETECTION', maxResults: 20 }, // Detect object types
              { type: 'TEXT_DETECTION', maxResults: 20 }, // Read brand names
              { type: 'LOGO_DETECTION', maxResults: 10 }, // Detect logos
              { type: 'OBJECT_LOCALIZATION', maxResults: 10 }, // Get bounding boxes
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
  console.log(`[DETECT-CAN API] ✅ Response received in ${visionEndTime - visionStartTime}ms`);

  const result = data.responses[0];

  // Get labels (object types)
  const labels = result.labelAnnotations?.map((l: any) => ({
    description: l.description,
    score: l.score
  })) || [];

  // Get text detections
  const textAnnotations = result.textAnnotations || [];

  // Get logos
  const logos = result.logoAnnotations?.map((l: any) => ({
    description: l.description,
    score: l.score,
    boundingPoly: l.boundingPoly
  })) || [];

  // Get localized objects (cans, bottles, etc.)
  const localizedObjects = result.localizedObjectAnnotations?.map((obj: any) => ({
    name: obj.name,
    score: obj.score,
    boundingPoly: obj.boundingPoly
  })) || [];

  console.log('📦 DETECT-CAN OBJECTS:', localizedObjects.map((o: any) => `${o.name} (${(o.score * 100).toFixed(0)}%)`).join(', '));
  console.log('🏷️  DETECT-CAN LABELS:', labels.slice(0, 10).map((l: any) => `${l.description} (${(l.score * 100).toFixed(0)}%)`).join(', '));

  // Detect object type based on labels and localized objects
  let objectType: 'can' | 'sparkling' | null = null;
  let detectedObject = null;
  let boundingBox = null;

  // Check for cans (soda cans, beverage cans)
  const canKeywords = ['can', 'beverage can', 'soda', 'aluminum can', 'tin can', 'soft drink'];
  const hasCan = labels.some((l: any) =>
    canKeywords.some(keyword => l.description.toLowerCase().includes(keyword))
  ) || localizedObjects.some((o: any) =>
    canKeywords.some(keyword => o.name.toLowerCase().includes(keyword))
  );

  // Check for sparkling water / bottles
  const sparklingKeywords = ['sparkling water', 'carbonated water', 'seltzer', 'mineral water', 'water bottle', 'plastic bottle'];
  const hasSparkling = labels.some((l: any) =>
    sparklingKeywords.some(keyword => l.description.toLowerCase().includes(keyword))
  ) || localizedObjects.some((o: any) =>
    sparklingKeywords.some(keyword => o.name.toLowerCase().includes(keyword))
  ) || textAnnotations.some((t: any) =>
    sparklingKeywords.some(keyword => (t.description?.toLowerCase() || '').includes(keyword))
  );

  // Find the best matching object
  if (hasCan) {
    objectType = 'can';
    detectedObject = localizedObjects.find((o: any) =>
      canKeywords.some(keyword => o.name.toLowerCase().includes(keyword))
    );
    console.log('[DETECT-CAN API] 🥫 Soda can detected!');
  } else if (hasSparkling) {
    objectType = 'sparkling';
    detectedObject = localizedObjects.find((o: any) =>
      ['bottle', 'drink', 'beverage'].some(keyword => o.name.toLowerCase().includes(keyword))
    );
    console.log('[DETECT-CAN API] 💧 Sparkling water detected!');
  }

  // Try to get bounding box from detected object
  if (detectedObject) {
    boundingBox = detectedObject.boundingPoly;
  } else if (objectType) {
    // Fallback: use first bottle/drink object
    detectedObject = localizedObjects.find((o: any) => {
      const name = o.name?.toLowerCase() || '';
      return ['bottle', 'drink', 'beverage', 'can'].some(keyword => name.includes(keyword));
    });
    if (detectedObject) {
      boundingBox = detectedObject.boundingPoly;
    }
  }

  const normalizedBoundingBox = normalizeBoundingPoly(boundingBox, dimensions);
  const aspectRatio = normalizedBoundingBox
    ? normalizedBoundingBox.height / normalizedBoundingBox.width
    : null;

  // Validate aspect ratio matches expected object type
  if (aspectRatio && objectType) {
    // Cans should be wider (aspect ratio 0.8-1.5), sparkling water should be taller (1.5+)
    if (objectType === 'can' && aspectRatio > 1.8) {
      console.log('[DETECT-CAN API] ⚠️  Detected can but aspect ratio suggests bottle, switching to sparkling');
      objectType = 'sparkling';
    } else if (objectType === 'sparkling' && aspectRatio < 1.5) {
      console.log('[DETECT-CAN API] ⚠️  Detected bottle but aspect ratio suggests can, switching to can');
      objectType = 'can';
    }
  }

  console.log('Detection Summary:', {
    objectType,
    hasBoundingBox: !!boundingBox,
    objectFound: !!detectedObject,
    normalizedBox: normalizedBoundingBox,
    aspectRatio: aspectRatio?.toFixed(2),
    imageDimensions: dimensions,
  });

  return {
    detected: !!objectType,
    objectType,
    brand: objectType === 'can' ? 'Soda Can' : objectType === 'sparkling' ? 'Sparkling Water' : 'Unknown',
    confidence: detectedObject?.score || 0.85,
    boundingBox,
    normalizedBoundingBox,
    expandedBoundingBox: expandNormalizedBox(normalizedBoundingBox),
    aspectRatio,
    segmentationMask: null,
    hasBottle: !!objectType,
    hasWhiskey: false, // These are not whiskey bottles
    labels: labels.map((l: { description: string; score: number }) => l.description).filter(Boolean).slice(0, 10),
    detectedText: textAnnotations[0]?.description || '',
    validated: true,
    _debug: {
      logoCount: logos.length,
      textAnnotationCount: textAnnotations.length,
      localizedObjectCount: localizedObjects.length,
      objectScore: detectedObject?.score,
      aspectRatio: aspectRatio?.toFixed(2),
    }
  };
}

export async function POST(request: NextRequest) {
  try {
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

    // Convert blob to buffer
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Get original image dimensions
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 1024;
    const originalHeight = metadata.height || 1024;

    // Resize image for faster processing (if needed)
    let optimizedBuffer: Buffer = buffer;
    const maxDimension = Math.max(originalWidth, originalHeight);

    if (maxDimension > 1024) {
      console.log(`[DETECT-CAN API] Resizing ${originalWidth}x${originalHeight} → max 1024px`);
      const resizedBuffer = await sharp(buffer)
        .resize(1024, 1024, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      optimizedBuffer = resizedBuffer as Buffer;
    }

    // Call Google Vision API
    const detectionResult = await detectCanOrBottleWithVision(optimizedBuffer, {
      width: originalWidth,
      height: originalHeight,
    });

    return NextResponse.json(detectionResult);
  } catch (error) {
    console.error('[DETECT-CAN API] Error:', error);
    return NextResponse.json(
      {
        error: 'Detection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
