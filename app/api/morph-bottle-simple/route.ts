import { NextRequest, NextResponse } from 'next/server';

/**
 * Simplified bottle morph API that only generates the final 100% transformed image
 * This avoids issues with Gemini not generating intermediate frames
 */

interface MorphRequest {
  image: string; // base64 encoded image
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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

// Increase timeout for this route (Gemini image generation can take 10-20 seconds)
export const maxDuration = 60; // 60 seconds

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[MORPH-SIMPLE API] 🚀 Request received at', new Date().toISOString());

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('[MORPH-SIMPLE API] ❌ GEMINI_API_KEY not configured');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    console.log('[MORPH-SIMPLE API] 📦 Parsing request body...');
    const body: MorphRequest = await request.json();
    const { image, boundingBox } = body;

    console.log('[MORPH-SIMPLE API] Request parsed after', Date.now() - startTime, 'ms');

    if (!image) {
      console.error('[MORPH-SIMPLE API] ❌ No image in request');
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Clean base64 string (remove data URL prefix if present)
    const base64Image = image.replace(/^data:image\/[a-z]+;base64,/, '');

    console.log('[MORPH-SIMPLE API] 📊 Image stats:');
    console.log('  - Original length:', image.length);
    console.log('  - Base64 length:', base64Image.length);
    console.log('  - Approximate size:', Math.round(base64Image.length * 0.75 / 1024), 'KB');
    console.log('  - Has bounding box:', !!boundingBox);

    const prompt = `Edit this photo by replacing the whiskey bottle with a Keeper's Heart whiskey bottle.

The new bottle should have:
- Dark amber/brown glass bottle
- Heart-shaped label with "Keeper's Heart" text
- Gold and deep burgundy/red label colors
- Premium craft whiskey appearance
- Elegant typography and design

CRITICAL: Only replace the bottle itself. Keep everything else in the photo EXACTLY the same - the background, lighting, table, shadows, reflections, and overall composition must remain completely unchanged. The new bottle should match the exact same perspective, angle, and position as the original bottle.`;

    console.log(`[MORPH-SIMPLE API] 🎨 Calling Gemini API...`);

    const geminiStartTime = Date.now();

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
            temperature: 0.4,
            topP: 0.8,
            topK: 40,
          },
        }),
      }
    );

    const geminiEndTime = Date.now();
    console.log(`[MORPH-SIMPLE API] ⏱️  Gemini API responded in ${geminiEndTime - geminiStartTime}ms`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[MORPH-SIMPLE API] ❌ Gemini API error (status ${response.status}):`, errorData);
      return NextResponse.json(
        {
          error: 'Failed to generate transformed bottle',
          details: errorData.error?.message || 'Unknown error',
        },
        { status: response.status }
      );
    }

    console.log(`[MORPH-SIMPLE API] ✅ Got response from Gemini, parsing...`);
    const data: GeminiResponse = await response.json();

    console.log(`[MORPH-SIMPLE API] ⏱️  Total time: ${Date.now() - startTime}ms`);

    console.log('[MORPH-SIMPLE API] Response structure:', JSON.stringify({
      hasCandidates: !!data.candidates,
      candidatesCount: data.candidates?.length || 0,
      hasError: !!data.error,
    }));

    if (data.error) {
      console.error(`[MORPH-SIMPLE API] ❌ Gemini returned error:`, data.error);
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

    console.log('[MORPH-SIMPLE API] Parts in response:', parts.length);
    console.log('[MORPH-SIMPLE API] Part types:', parts.map(p =>
      p.inlineData ? 'inlineData' : p.text ? 'text' : 'unknown'
    ));

    let generatedImage = null;
    let textResponse = null;

    for (const part of parts) {
      if (part.inlineData?.data) {
        generatedImage = part.inlineData.data;
        console.log(`[MORPH-SIMPLE API] ✅ Found generated image, size: ${generatedImage.length} chars`);
        console.log(`[MORPH-SIMPLE API] MIME type: ${part.inlineData.mimeType}`);
        break;
      }
      if (part.text) {
        textResponse = part.text;
        console.log('[MORPH-SIMPLE API] Text response:', textResponse.substring(0, 200));
      }
    }

    if (!generatedImage) {
      console.error('[MORPH-SIMPLE API] ❌ No image data in response');
      console.error('[MORPH-SIMPLE API] Full response:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        {
          error: 'No image generated',
          details: textResponse || 'Gemini returned text instead of image',
        },
        { status: 500 }
      );
    }

    console.log(`[MORPH-SIMPLE API] ✅ Successfully generated transformed bottle`);
    return NextResponse.json({
      success: true,
      originalImage: image,
      transformedImage: `data:image/jpeg;base64,${generatedImage}`,
      cost: 0.039,
    });

  } catch (error) {
    console.error('[MORPH-SIMPLE API] ❌ Exception:', error);
    return NextResponse.json(
      {
        error: 'Transformation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
