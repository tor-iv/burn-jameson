import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface MorphRequest {
  image: string; // base64 encoded image
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  morphPercent: number; // 0-100
  useThreeFrameMode?: boolean; // Cost optimization: only generate 0%, 50%, 100%
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
  }>;
  error?: {
    message: string;
    code: number;
  };
}

function generateMorphPrompt(morphPercent: number): string {
  if (morphPercent === 0) {
    // For 0%, just return the original - no transformation needed
    return 'Show the first image (the scanned bottle) with no changes or modifications. Return the photograph as-is.';
  }

  if (morphPercent === 100) {
    return `Edit the first image (the scanned bottle photo) by replacing the whiskey bottle with the exact bottle shown in the second reference image (the Keeper's Heart bottle).

IMPORTANT: Study the second reference image carefully and match:
- The exact bottle shape (curved, elegant profile with decorative neck)
- The distinctive cream/beige shield-shaped label with "KEEPER'S HEART" text in an arc
- The copper/gold decorative bands on the neck and base
- The amber/golden whiskey color visible through the glass
- The black decorative cap with copper pattern
- The exact label design including the clock/keys emblem in the center

Only replace the bottle itself. Keep everything else in the first photo exactly the same - the background, lighting, table, shadows, hand position (if any), and overall composition must remain unchanged.`;
  }

  // Partial morph (for intermediate frames)
  return `Edit the first image (the scanned bottle) by partially transforming it toward the Keeper's Heart bottle shown in the second reference image (${morphPercent}% complete transformation).

IMPORTANT: Study the second reference image to understand the target bottle:
- Distinctive curved shape with decorative neck
- Cream/beige shield-shaped label with "KEEPER'S HEART" text
- Copper/gold decorative bands
- Amber/golden glass color
- Black cap with copper pattern

Make the bottle in the first image look ${morphPercent}% like the Keeper's Heart bottle (second image) while keeping ${100 - morphPercent}% of the original bottle's appearance. Create a smooth, natural blend between the two bottle styles.

Keep the background, lighting, table, shadows, and composition from the first image exactly the same.`;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const body: MorphRequest = await request.json();
    const { image, boundingBox, morphPercent } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    if (morphPercent < 0 || morphPercent > 100) {
      return NextResponse.json(
        { error: 'morphPercent must be between 0 and 100' },
        { status: 400 }
      );
    }

    // Clean base64 string (remove data URL prefix if present)
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, '');

    // Load the Keeper's Heart reference image
    const keepersHeartPath = path.join(process.cwd(), 'public', 'images', 'keepersheart.png');
    const keepersHeartBuffer = fs.readFileSync(keepersHeartPath);
    const keepersHeartBase64 = keepersHeartBuffer.toString('base64');

    // Generate the appropriate prompt
    const prompt = generateMorphPrompt(morphPercent);

    console.log(`[MORPH API] Generating morph frame at ${morphPercent}%...`);
    console.log(`[MORPH API] Scanned bottle image size: ${base64Image.length} chars`);
    console.log(`[MORPH API] Keeper's Heart reference size: ${keepersHeartBase64.length} chars`);
    console.log(`[MORPH API] Bounding box:`, boundingBox);

    // Call Gemini 2.5 Flash Image API with BOTH images
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Image,
                  },
                },
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: keepersHeartBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4, // Lower temperature for consistency across frames
            topP: 0.8,
            topK: 40,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[MORPH API] ❌ Gemini API error (status ${response.status}):`, errorData);
      return NextResponse.json(
        {
          error: 'Failed to generate morph frame',
          details: errorData.error?.message || 'Unknown error',
        },
        { status: response.status }
      );
    }

    console.log(`[MORPH API] ✅ Got response from Gemini, parsing...`);
    const data: GeminiResponse = await response.json();

    if (data.error) {
      console.error(`[MORPH API] ❌ Gemini returned error:`, data.error);
      return NextResponse.json(
        {
          error: 'Gemini API error',
          details: data.error.message,
        },
        { status: 400 }
      );
    }

    // Extract the generated image from the response
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    console.log(`[MORPH API] Response has ${data.candidates?.length || 0} candidates, ${parts.length} parts`);

    // Look for inline image data in the response
    let generatedImage = null;
    let textResponse = null;

    for (const part of parts) {
      if (part.inlineData?.data) {
        generatedImage = part.inlineData.data;
        console.log(`[MORPH API] ✅ Found generated image, size: ${generatedImage.length} chars`);
        break;
      }
      if (part.text) {
        textResponse = part.text;
      }
    }

    if (!generatedImage) {
      console.error('[MORPH API] ❌ No image data in Gemini response.');
      console.error('[MORPH API] Text response:', textResponse);
      console.error('[MORPH API] Full response structure:', JSON.stringify({
        candidatesCount: data.candidates?.length,
        partsCount: parts.length,
        partTypes: parts.map(p => Object.keys(p))
      }, null, 2));

      // Special case for 0% - just return the original image
      if (morphPercent === 0) {
        console.log('[MORPH API] 💡 0% morph failed, returning original image instead');
        return NextResponse.json({
          success: true,
          morphPercent: 0,
          image: body.image, // Return the original image
          cost: 0, // No cost since we didn't generate anything
          fallback: true,
        });
      }

      return NextResponse.json(
        {
          error: 'No image generated in response',
          details: textResponse || 'Gemini returned text instead of image',
          morphPercent,
        },
        { status: 500 }
      );
    }

    console.log(`[MORPH API] ✅ Successfully generated ${morphPercent}% morph frame`);
    return NextResponse.json({
      success: true,
      morphPercent,
      image: `data:image/jpeg;base64,${generatedImage}`,
      cost: 0.039, // Cost per image in USD
    });

  } catch (error) {
    console.error('[MORPH API] ❌ Exception during morph generation:', error);
    return NextResponse.json(
      {
        error: 'Morph generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
