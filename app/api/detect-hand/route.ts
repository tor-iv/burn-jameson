import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

/**
 * Hand Detection API
 *
 * Uses Google Vision API OBJECT_LOCALIZATION to detect hands in images.
 * Used by test mode to intelligently position the bottle replacement.
 *
 * Returns:
 * - handDetected: boolean - Whether a hand was found
 * - handBoundingBox: { x, y, width, height } - Normalized 0-1 coordinates
 * - confidence: number - Detection confidence (0-1)
 * - fallbackUsed: boolean - Whether fallback position was used
 */

interface NormalizedBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Default fallback position when no hand is detected
// Center-lower area where someone would typically hold a bottle
const FALLBACK_HAND_POSITION: NormalizedBoundingBox = {
  x: 0.35,  // 35% from left (center-ish)
  y: 0.45,  // 45% from top (lower-center area)
  width: 0.30,  // 30% width (realistic bottle width)
  height: 0.45, // 45% height (medium bottle height)
};

function normalizeBoundingPoly(boundingPoly: any): NormalizedBoundingBox | null {
  if (!boundingPoly) return null;

  // Google Vision OBJECT_LOCALIZATION returns normalizedVertices (0-1 coordinates)
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

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_VISION_API_KEY;

    if (!apiKey) {
      console.error('[HAND DETECTION] ❌ GOOGLE_VISION_API_KEY not configured');
      return NextResponse.json(
        { error: 'GOOGLE_VISION_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Get the image blob from the request
    const formData = await request.formData();
    const image = formData.get('image') as Blob;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Convert blob to buffer
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Optimize image for faster processing (max 1024px)
    const metadata = await sharp(buffer).metadata();
    const maxDimension = Math.max(metadata.width || 1, metadata.height || 1);

    let optimizedBuffer: Buffer = buffer;
    if (maxDimension > 1024) {
      const resizedBuffer = await sharp(buffer)
        .resize(1024, 1024, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();
      optimizedBuffer = resizedBuffer as Buffer;
    }

    // Convert to base64 for Vision API
    const base64Image = optimizedBuffer.toString('base64');

    console.log('[HAND DETECTION] 🔍 Calling Google Vision API for hand detection...');
    const visionStartTime = Date.now();

    // Call Google Vision API
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
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 }, // Detect objects including hands
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
    console.log(`[HAND DETECTION] ✅ Vision API responded in ${visionEndTime - visionStartTime}ms`);

    const result = data.responses[0];

    // Get localized objects
    const localizedObjects = result.localizedObjectAnnotations?.map((obj: any) => ({
      name: obj.name,
      score: obj.score,
      boundingPoly: obj.boundingPoly
    })) || [];

    console.log('[HAND DETECTION] 📦 Detected objects:', localizedObjects.map((o: any) => `${o.name} (${(o.score * 100).toFixed(0)}%)`).join(', '));

    // Find hand objects
    const handObjects = localizedObjects.filter((obj: any) =>
      obj.name?.toLowerCase().includes('hand')
    );

    if (handObjects.length > 0) {
      // Hand detected! Use the highest confidence hand
      const bestHand = handObjects.reduce((best: any, current: any) =>
        current.score > best.score ? current : best
      );

      const handBoundingBox = normalizeBoundingPoly(bestHand.boundingPoly);

      if (handBoundingBox) {
        console.log(`[HAND DETECTION] 🤚 Hand found at position:`, handBoundingBox);
        console.log(`[HAND DETECTION] 📊 Confidence: ${(bestHand.score * 100).toFixed(0)}%`);

        return NextResponse.json({
          handDetected: true,
          handBoundingBox,
          confidence: bestHand.score,
          fallbackUsed: false,
          _debug: {
            totalObjects: localizedObjects.length,
            handsFound: handObjects.length,
            detectedObjects: localizedObjects.map((o: any) => o.name),
          }
        });
      }
    }

    // No hand detected - return fallback position
    console.log('[HAND DETECTION] ⚠️  No hand detected, using fallback position');
    return NextResponse.json({
      handDetected: false,
      handBoundingBox: FALLBACK_HAND_POSITION,
      confidence: 0,
      fallbackUsed: true,
      _debug: {
        totalObjects: localizedObjects.length,
        handsFound: 0,
        detectedObjects: localizedObjects.map((o: any) => o.name),
      }
    });

  } catch (error) {
    console.error('[HAND DETECTION] ❌ Error:', error);
    return NextResponse.json(
      {
        error: 'Hand detection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        // Return fallback on error so the flow continues
        handDetected: false,
        handBoundingBox: FALLBACK_HAND_POSITION,
        confidence: 0,
        fallbackUsed: true,
      },
      { status: 500 }
    );
  }
}
