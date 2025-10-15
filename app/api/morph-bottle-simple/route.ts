import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Bottle morph API using Gemini 2.5 Flash Image for realistic inpainting
 *
 * How it works:
 * 1. Receives original bottle photo + bounding box (normalized 0-1 coordinates)
 * 2. Crops the bottle region from the original image (with padding for context)
 * 3. Sends the cropped region + Keeper's Heart reference to Gemini
 * 4. Gemini removes the competitor bottle and replaces it with Keeper's Heart
 * 5. Composites the edited crop back onto the original image
 *
 * Benefits:
 * - Realistic bottle replacement with AI inpainting
 * - Preserves hands, background, lighting naturally
 * - No person detection issues (only sending cropped bottle region)
 * - Reference-based editing ensures accurate Keeper's Heart bottle
 */

interface MorphRequest {
  image: string; // base64 encoded image (with or without data URL prefix)
  boundingBox?: {
    x: number; // Normalized 0-1
    y: number; // Normalized 0-1
    width: number; // Normalized 0-1
    height: number; // Normalized 0-1
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
    finishReason?: string;
    finishMessage?: string;
  }>;
  error?: {
    message: string;
    code: number;
  };
}

// Timeout for Gemini processing (5-10 seconds typical)
export const maxDuration = 30; // 30 seconds

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[MORPH-SIMPLE API] 🚀 Request received at', new Date().toISOString());

  try {
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

    if (!boundingBox) {
      console.error('[MORPH-SIMPLE API] ❌ No bounding box provided');
      return NextResponse.json(
        { error: 'Bounding box required for bottle replacement' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer for Sharp processing
    const originalBuffer = Buffer.from(base64Image, 'base64');

    // Get original image metadata
    const originalMetadata = await sharp(originalBuffer).metadata();
    const imgWidth = originalMetadata.width || 1;
    const imgHeight = originalMetadata.height || 1;

    console.log('[MORPH-SIMPLE API] 📐 Original image dimensions:', imgWidth, 'x', imgHeight);

    // STEP 1: Calculate crop region with padding
    // Add 15% padding around the bottle for context (helps Gemini understand surroundings)
    const PADDING_PERCENT = 0.15;

    // Convert normalized bounding box (0-1) to pixel coordinates
    let bottleX = Math.round(boundingBox.x * imgWidth);
    let bottleY = Math.round(boundingBox.y * imgHeight);
    let bottleWidth = Math.round(boundingBox.width * imgWidth);
    let bottleHeight = Math.round(boundingBox.height * imgHeight);

    console.log('[MORPH-SIMPLE API] 📦 Original bottle region (pixels):', {
      x: bottleX,
      y: bottleY,
      width: bottleWidth,
      height: bottleHeight,
    });

    // Calculate padded crop region
    const padX = Math.round(bottleWidth * PADDING_PERCENT);
    const padY = Math.round(bottleHeight * PADDING_PERCENT);

    const cropX = Math.max(0, bottleX - padX);
    const cropY = Math.max(0, bottleY - padY);
    const cropWidth = Math.min(bottleWidth + 2 * padX, imgWidth - cropX);
    const cropHeight = Math.min(bottleHeight + 2 * padY, imgHeight - cropY);

    console.log('[MORPH-SIMPLE API] ✂️  Crop region with padding:', {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
      paddingPercent: `${PADDING_PERCENT * 100}%`,
    });

    // Extract the bottle crop
    const bottleCrop = await sharp(originalBuffer)
      .extract({
        left: cropX,
        top: cropY,
        width: cropWidth,
        height: cropHeight,
      })
      .jpeg({ quality: 95 }) // High quality for Gemini
      .toBuffer();

    const bottleCropBase64 = bottleCrop.toString('base64');
    console.log('[MORPH-SIMPLE API] ✅ Extracted bottle crop:', Math.round(bottleCropBase64.length * 0.75 / 1024), 'KB');

    // STEP 2: Load Keeper's Heart reference and call Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[MORPH-SIMPLE API] ❌ GEMINI_API_KEY not configured');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    const keepersHeartPath = path.join(process.cwd(), 'public', 'images', 'keepersheart.png');
    const keepersHeartBuffer = fs.readFileSync(keepersHeartPath);
    const keepersHeartBase64 = keepersHeartBuffer.toString('base64');

    console.log('[MORPH-SIMPLE API] 📸 Loaded Keeper\'s Heart reference image');

    const prompt = `Replace the whiskey bottle in the first image with the exact bottle shown in the second reference image.

CRITICAL REQUIREMENTS:
- Remove the original whiskey bottle completely
- Place the Keeper's Heart bottle (from second image) in the exact same position and angle
- Preserve any hands, fingers, or background elements visible in the first image
- Match the lighting, shadows, and perspective of the original scene
- Fill in the background naturally where the old bottle was removed
- The new bottle should look like it's being held in the same way

Study the second reference image carefully for these details:
- Distinctive curved bottle shape with elegant profile
- Cream/beige shield-shaped label with "KEEPER'S HEART" text
- Copper/gold decorative bands on neck and base
- Amber/golden whiskey color through the glass
- Black decorative cap with gold pattern

Output ONLY the edited image with the same dimensions as the first image.`;

    console.log('[MORPH-SIMPLE API] 🎨 Calling Gemini API for bottle replacement...');
    const geminiStartTime = Date.now();

    const geminiResponse = await fetch(
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
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: bottleCropBase64,
                  },
                },
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: keepersHeartBase64,
                  },
                },
                { text: prompt },
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

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.json().catch(() => ({}));
      console.error(`[MORPH-SIMPLE API] ❌ Gemini API error (status ${geminiResponse.status}):`, errorData);
      return NextResponse.json(
        {
          error: 'Failed to generate transformed bottle',
          details: errorData.error?.message || 'Unknown error',
        },
        { status: geminiResponse.status }
      );
    }

    const geminiData: GeminiResponse = await geminiResponse.json();

    console.log('[MORPH-SIMPLE API] Response structure:', JSON.stringify({
      hasCandidates: !!geminiData.candidates,
      candidatesCount: geminiData.candidates?.length || 0,
      hasError: !!geminiData.error,
      finishReason: geminiData.candidates?.[0]?.finishReason,
    }));

    if (geminiData.error) {
      console.error(`[MORPH-SIMPLE API] ❌ Gemini returned error:`, geminiData.error);
      return NextResponse.json(
        {
          error: 'Gemini API error',
          details: geminiData.error.message,
        },
        { status: 400 }
      );
    }

    // Check for finish reason issues
    const candidate = geminiData.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      console.error(`[MORPH-SIMPLE API] ❌ Gemini finish reason:`, candidate.finishReason);
      console.error(`[MORPH-SIMPLE API] Finish message:`, candidate.finishMessage);
      return NextResponse.json(
        {
          error: 'Gemini generation failed',
          details: candidate.finishMessage || candidate.finishReason,
        },
        { status: 400 }
      );
    }

    // Extract the edited crop from response
    const parts = candidate?.content?.parts || [];
    let editedCropBase64 = null;

    for (const part of parts) {
      if (part.inlineData?.data) {
        editedCropBase64 = part.inlineData.data;
        console.log(`[MORPH-SIMPLE API] ✅ Found edited crop, size: ${editedCropBase64.length} chars`);
        break;
      }
    }

    if (!editedCropBase64) {
      console.error('[MORPH-SIMPLE API] ❌ No image data in Gemini response');
      return NextResponse.json(
        {
          error: 'No image generated by Gemini',
          details: 'Response contained no image data',
        },
        { status: 500 }
      );
    }

    // STEP 3: Composite the edited crop back onto the original image
    const editedCropBuffer = Buffer.from(editedCropBase64, 'base64');

    // Get dimensions of the edited crop from Gemini
    const editedCropMetadata = await sharp(editedCropBuffer).metadata();
    console.log('[MORPH-SIMPLE API] 📏 Edited crop dimensions from Gemini:', editedCropMetadata.width, 'x', editedCropMetadata.height);
    console.log('[MORPH-SIMPLE API] 📏 Expected crop dimensions:', cropWidth, 'x', cropHeight);

    // Resize the edited crop to match our exact crop dimensions
    // (Gemini sometimes returns different sizes)
    const resizedEditedCrop = await sharp(editedCropBuffer)
      .resize(cropWidth, cropHeight, {
        fit: 'fill', // Force exact dimensions
        kernel: 'lanczos3', // High-quality resizing
      })
      .toBuffer();

    console.log('[MORPH-SIMPLE API] 🔧 Compositing edited crop back onto original...');

    const finalImage = await sharp(originalBuffer)
      .composite([
        {
          input: resizedEditedCrop,
          top: cropY,
          left: cropX,
          blend: 'over',
        },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    const finalBase64 = finalImage.toString('base64');

    console.log(`[MORPH-SIMPLE API] ✅ Successfully created transformed bottle (${Math.round(finalBase64.length * 0.75 / 1024)} KB)`);
    console.log(`[MORPH-SIMPLE API] ⏱️  Total time: ${Date.now() - startTime}ms`);

    return NextResponse.json({
      success: true,
      originalImage: image,
      transformedImage: `data:image/jpeg;base64,${finalBase64}`,
      cost: 0.039, // Gemini 2.5 Flash Image cost
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
