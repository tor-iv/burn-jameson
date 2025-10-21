import { NextRequest, NextResponse } from 'next/server';

/**
 * Bottle Segmentation API using Gemini 2.5 Flash
 *
 * Returns a binary segmentation mask (PNG) showing exact bottle contours.
 * Used for precise fire animation clipping.
 *
 * Flow:
 * 1. Receive bottle image (base64 or blob)
 * 2. Call Gemini 2.5 Flash with segmentation prompt
 * 3. Return base64-encoded PNG mask (white = bottle, black = background)
 *
 * Cost: ~$0.001 per image (Gemini 2.5 Flash pricing)
 * Speed: ~200-500ms typical
 */

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
    finishReason?: string;
    finishMessage?: string;
  }>;
  error?: {
    message: string;
    code: number;
  };
}

export const maxDuration = 15; // 15 seconds timeout

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[SEGMENT-BOTTLE API] 🚀 Request received at', new Date().toISOString());

  try {
    // Parse request (support both FormData and JSON)
    let imageBase64: string;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // FormData from client
      const formData = await request.formData();
      const imageFile = formData.get('image') as Blob;

      if (!imageFile) {
        return NextResponse.json(
          { error: 'No image provided in form data' },
          { status: 400 }
        );
      }

      const arrayBuffer = await imageFile.arrayBuffer();
      imageBase64 = Buffer.from(arrayBuffer).toString('base64');
      console.log('[SEGMENT-BOTTLE API] 📦 Received image from FormData');
    } else {
      // JSON with base64 image
      const body = await request.json();
      const { image } = body;

      if (!image) {
        return NextResponse.json(
          { error: 'No image provided in JSON body' },
          { status: 400 }
        );
      }

      // Clean base64 string (remove data URL prefix if present)
      imageBase64 = image.replace(/^data:image\/[a-z]+;base64,/, '');
      console.log('[SEGMENT-BOTTLE API] 📦 Received image from JSON');
    }

    console.log('[SEGMENT-BOTTLE API] 📊 Image size:', Math.round(imageBase64.length * 0.75 / 1024), 'KB');

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[SEGMENT-BOTTLE API] ❌ GEMINI_API_KEY not configured');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Prepare segmentation prompt
    const prompt = `Generate a precise binary segmentation mask for the whiskey bottle in this image.

OUTPUT REQUIREMENTS:
- Return ONLY a PNG image (no text, no explanations)
- White pixels (255,255,255, alpha 255) = bottle area
- Black pixels (0,0,0, alpha 0) = background/transparent
- EXACT same dimensions as the input image
- Follow exact bottle contours (neck, body, base, cap)
- Include the ENTIRE bottle from top to bottom
- Exclude hands, fingers, background, tables, or other objects
- Make edges clean and precise

The mask should be a perfect silhouette of the bottle shape.
Think of it as creating a stencil - only the bottle should be visible (white), everything else transparent/black.`;

    console.log('[SEGMENT-BOTTLE API] 🎨 Calling Gemini API for segmentation...');
    const geminiStartTime = Date.now();

    const geminiResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
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
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1, // Low temperature for consistent masks
            topP: 0.8,
            topK: 20,
          },
        }),
      }
    );

    const geminiEndTime = Date.now();
    console.log(`[SEGMENT-BOTTLE API] ⏱️  Gemini API responded in ${geminiEndTime - geminiStartTime}ms`);

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}));
      console.error(`[SEGMENT-BOTTLE API] ❌ Gemini API error (status ${geminiResponse.status}):`, errorData);
      return NextResponse.json(
        {
          error: 'Failed to generate segmentation mask',
          details: errorData.error?.message || 'Unknown error',
        },
        { status: geminiResponse.status }
      );
    }

    const geminiData: GeminiResponse = await geminiResponse.json();

    // Check for errors
    if (geminiData.error) {
      console.error(`[SEGMENT-BOTTLE API] ❌ Gemini returned error:`, geminiData.error);
      return NextResponse.json(
        {
          error: 'Gemini API error',
          details: geminiData.error.message,
        },
        { status: 400 }
      );
    }

    // Check finish reason
    const candidate = geminiData.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      console.error(`[SEGMENT-BOTTLE API] ❌ Gemini finish reason:`, candidate.finishReason);
      return NextResponse.json(
        {
          error: 'Gemini generation failed',
          details: candidate.finishMessage || candidate.finishReason,
        },
        { status: 400 }
      );
    }

    // Extract mask image from response
    const parts = candidate?.content?.parts || [];
    let maskBase64 = null;

    for (const part of parts) {
      if (part.inlineData?.data) {
        maskBase64 = part.inlineData.data;
        console.log(`[SEGMENT-BOTTLE API] ✅ Found segmentation mask, size: ${Math.round(maskBase64.length * 0.75 / 1024)} KB`);
        break;
      }
    }

    if (!maskBase64) {
      console.error('[SEGMENT-BOTTLE API] ❌ No image data in Gemini response');
      console.error('[SEGMENT-BOTTLE API] Response parts:', JSON.stringify(parts, null, 2));
      return NextResponse.json(
        {
          error: 'No segmentation mask generated',
          details: 'Gemini response contained no image data',
        },
        { status: 500 }
      );
    }

    // Return mask as data URL
    const maskDataUrl = `data:image/png;base64,${maskBase64}`;

    console.log(`[SEGMENT-BOTTLE API] ✅ Successfully generated segmentation mask`);
    console.log(`[SEGMENT-BOTTLE API] ⏱️  Total time: ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      mask: maskDataUrl,
      maskBase64: maskBase64,
      processingTime: Date.now() - startTime,
      cost: 0.001, // Estimated Gemini 2.5 Flash cost
    });

  } catch (error) {
    console.error('[SEGMENT-BOTTLE API] ❌ Exception:', error);
    return NextResponse.json(
      {
        error: 'Segmentation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
