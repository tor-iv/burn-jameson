import { NextRequest, NextResponse } from 'next/server';

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

const KEEPERS_HEART_DESCRIPTION = `
A premium whiskey bottle with these characteristics:
- Dark amber/brown glass bottle
- Distinctive heart-shaped label on the front
- Gold and deep burgundy/red accents on the label
- "Keeper's Heart" brand name prominently displayed
- Premium, craft whiskey aesthetic
- Clean, modern design with elegant typography
`;

function generateMorphPrompt(morphPercent: number, hasBoundingBox: boolean): string {
  if (morphPercent === 0) {
    // For 0%, just return the original - no transformation needed
    return 'Show this exact image with no changes or modifications. Return the photograph as-is.';
  }

  if (morphPercent === 100) {
    return `Edit this photo by replacing the whiskey bottle with a Keeper's Heart whiskey bottle.

The new bottle should have:
- Dark amber/brown glass
- Heart-shaped label with "Keeper's Heart" text
- Gold and burgundy red label colors
- Premium craft whiskey appearance

Important: Only replace the bottle. Keep everything else in the photo exactly the same - the background, lighting, table, shadows, and overall composition must remain unchanged.`;
  }

  // Partial morph (for intermediate frames)
  return `Edit this photo by partially transforming the whiskey bottle toward a Keeper's Heart bottle (${morphPercent}% complete).

Target bottle appearance:
- Dark amber/brown glass
- Heart-shaped label with "Keeper's Heart" text
- Gold and burgundy red label colors
- Premium craft whiskey look

Make the bottle look ${morphPercent}% like the Keeper's Heart bottle while keeping ${100 - morphPercent}% of the original bottle's appearance. Create a natural blend between the two styles.

Keep the background, lighting, table, and shadows exactly the same.`;
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
    const { image, boundingBox, morphPercent, useThreeFrameMode = false } = body;

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

    // Generate the appropriate prompt
    const prompt = generateMorphPrompt(morphPercent, !!boundingBox);

    console.log(`[MORPH API] Generating morph frame at ${morphPercent}%...`);
    console.log(`[MORPH API] Image size: ${base64Image.length} chars`);
    console.log(`[MORPH API] Bounding box:`, boundingBox);

    // Call Gemini 2.5 Flash Image API
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
