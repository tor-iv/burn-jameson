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
    return 'Return the original image exactly as provided, with no modifications.';
  }

  if (morphPercent === 100) {
    return `Transform the whiskey bottle in this image into a Keeper's Heart whiskey bottle.

${KEEPERS_HEART_DESCRIPTION}

CRITICAL REQUIREMENTS:
- Replace ONLY the bottle itself
- Keep exact same lighting, shadows, and reflections
- Preserve the background completely unchanged
- Match the perspective and angle of the original bottle
- Keep the same bottle position in frame
- Maintain realistic shadows cast by the bottle
- Make it look like a natural photograph, not composited

The transformation should look completely natural and photorealistic.`;
  }

  // Partial morph (for intermediate frames)
  const fromPercent = 100 - morphPercent;
  return `Create a smooth blend/transition between the current whiskey bottle and a Keeper's Heart whiskey bottle.

Target bottle (Keeper's Heart):
${KEEPERS_HEART_DESCRIPTION}

BLEND INSTRUCTIONS:
- Show ${morphPercent}% transformation toward the Keeper's Heart bottle
- Keep ${fromPercent}% of the original bottle's characteristics
- Create a seamless, morphing effect between the two
- Focus the transformation on the bottle only${hasBoundingBox ? ' (in the highlighted region)' : ''}
- Preserve exact lighting, shadows, reflections, and background
- Keep the same bottle position, perspective, and angle
- Make the blend look natural and photorealistic

The result should look like a photograph captured mid-transformation.`;
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

    console.log(`Generating morph frame at ${morphPercent}%...`);

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
      console.error('Gemini API error:', errorData);
      return NextResponse.json(
        {
          error: 'Failed to generate morph frame',
          details: errorData.error?.message || 'Unknown error',
        },
        { status: response.status }
      );
    }

    const data: GeminiResponse = await response.json();

    if (data.error) {
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

    // Look for inline image data in the response
    let generatedImage = null;
    for (const part of parts) {
      if (part.inlineData?.data) {
        generatedImage = part.inlineData.data;
        break;
      }
    }

    if (!generatedImage) {
      console.error('No image data in Gemini response:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: 'No image generated in response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      morphPercent,
      image: `data:image/jpeg;base64,${generatedImage}`,
      cost: 0.039, // Cost per image in USD
    });

  } catch (error) {
    console.error('Morph bottle error:', error);
    return NextResponse.json(
      {
        error: 'Morph generation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
