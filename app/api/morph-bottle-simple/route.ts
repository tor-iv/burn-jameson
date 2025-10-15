import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Simplified bottle morph API that only generates the final 100% transformed image
 * This avoids issues with Gemini not generating intermediate frames
 *
 * NOW INCLUDES: Keeper's Heart reference image sent to Gemini for accurate morphing
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

    // Load the Keeper's Heart reference image
    const keepersHeartPath = path.join(process.cwd(), 'public', 'images', 'keepersheart.png');
    const keepersHeartBuffer = fs.readFileSync(keepersHeartPath);
    const keepersHeartBase64 = keepersHeartBuffer.toString('base64');

    console.log('[MORPH-SIMPLE API] 📸 Loaded Keeper\'s Heart reference image');
    console.log('  - Reference size:', Math.round(keepersHeartBase64.length * 0.75 / 1024), 'KB');

    const prompt = `Edit the FIRST image (the scanned bottle photo) by replacing the whiskey bottle with the EXACT bottle shown in the SECOND reference image (the Keeper's Heart bottle).

IMPORTANT: Study the SECOND reference image carefully and match these exact details:
- The distinctive curved bottle shape with elegant profile and decorative neck
- The cream/beige shield-shaped label with "KEEPER'S HEART" text arranged in an arc
- The copper/gold decorative bands on the neck and base of the bottle
- The amber/golden whiskey color visible through the glass
- The black decorative cap with copper/gold pattern
- The exact label design including the clock/keys emblem in the center
- "IRISH + AMERICAN WHISKEY" text below the main label

CRITICAL: Only replace the bottle in the first image. Keep everything else EXACTLY the same - the background, lighting, table, shadows, reflections, hand position (if any), and overall composition must remain completely unchanged. The new bottle should match the exact same perspective, angle, and position as the original bottle.`;

    console.log(`[MORPH-SIMPLE API] 🎨 Calling Gemini API with both images...`);

    const geminiStartTime = Date.now();

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
