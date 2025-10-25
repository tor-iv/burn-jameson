import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Bottle morph API using Gemini 2.5 Flash Image for realistic inpainting
 *
 * How it works:
 * 1. Receives original bottle photo + bounding box (normalized 0-1 coordinates)
 * 2. Adjusts crop dimensions to match Keeper's Heart aspect ratio (0.368)
 * 3. Crops the bottle region from the original image (with 20% padding for context)
 * 4. Resizes crop to exact Keeper's Heart dimensions (699x1900)
 * 5. Sends the resized crop + Keeper's Heart reference to Gemini (both 699x1900)
 * 6. Gemini removes the competitor bottle and replaces it with Keeper's Heart (1:1 scale)
 * 7. Scales Gemini's result back to original crop size
 * 8. Composites the edited crop back onto the original image
 *
 * Benefits:
 * - Aspect ratio matching reduces scaling artifacts and visible borders
 * - Both images sent to Gemini are identical dimensions (699x1900) for 1:1 replacement
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

    // STEP 1: Calculate crop region with aspect ratio matching
    // Keeper's Heart reference image dimensions
    const KEEPERS_WIDTH = 699;
    const KEEPERS_HEIGHT = 1900;
    const KEEPERS_ASPECT = KEEPERS_WIDTH / KEEPERS_HEIGHT; // ~0.368 (tall/narrow)

    // Add 20% padding around the bottle for context (increased from 15% for better blending)
    const PADDING_PERCENT = 0.20;

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

    // Adjust bottle dimensions to match Keeper's Heart aspect ratio
    const detectedAspect = bottleWidth / bottleHeight;
    let adjustedWidth = bottleWidth;
    let adjustedHeight = bottleHeight;
    let adjustedX = bottleX;
    let adjustedY = bottleY;

    console.log('[MORPH-SIMPLE API] 📏 Aspect ratio analysis:', {
      detected: detectedAspect.toFixed(3),
      keepers: KEEPERS_ASPECT.toFixed(3),
      needsAdjustment: Math.abs(detectedAspect - KEEPERS_ASPECT) > 0.05,
    });

    // Adjust dimensions to match Keeper's aspect ratio (with max 2x expansion safety limit)
    if (detectedAspect > KEEPERS_ASPECT) {
      // Detected bottle is too wide - increase height
      const targetHeight = Math.round(bottleWidth / KEEPERS_ASPECT);
      const maxHeight = bottleHeight * 2; // Safety: don't expand more than 2x
      adjustedHeight = Math.min(targetHeight, maxHeight);
      adjustedY = bottleY - Math.round((adjustedHeight - bottleHeight) / 2);
      console.log('[MORPH-SIMPLE API] 🔧 Adjusting: Bottle too wide, increasing height');
    } else if (detectedAspect < KEEPERS_ASPECT) {
      // Detected bottle is too narrow - increase width
      const targetWidth = Math.round(bottleHeight * KEEPERS_ASPECT);
      const maxWidth = bottleWidth * 2; // Safety: don't expand more than 2x
      adjustedWidth = Math.min(targetWidth, maxWidth);
      adjustedX = bottleX - Math.round((adjustedWidth - bottleWidth) / 2);
      console.log('[MORPH-SIMPLE API] 🔧 Adjusting: Bottle too narrow, increasing width');
    }

    console.log('[MORPH-SIMPLE API] 📦 Adjusted bottle region (pixels):', {
      x: adjustedX,
      y: adjustedY,
      width: adjustedWidth,
      height: adjustedHeight,
      aspectRatio: (adjustedWidth / adjustedHeight).toFixed(3),
    });

    // Calculate padded crop region using adjusted dimensions
    const padX = Math.round(adjustedWidth * PADDING_PERCENT);
    const padY = Math.round(adjustedHeight * PADDING_PERCENT);

    const cropX = Math.max(0, adjustedX - padX);
    const cropY = Math.max(0, adjustedY - padY);
    const cropWidth = Math.min(adjustedWidth + 2 * padX, imgWidth - cropX);
    const cropHeight = Math.min(adjustedHeight + 2 * padY, imgHeight - cropY);

    console.log('[MORPH-SIMPLE API] ✂️  Crop region with padding:', {
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight,
      paddingPercent: `${PADDING_PERCENT * 100}%`,
    });

    // Extract the bottle crop and resize to match Keeper's Heart dimensions
    // This ensures Gemini receives both images at the same scale for 1:1 replacement
    const bottleCrop = await sharp(originalBuffer)
      .extract({
        left: cropX,
        top: cropY,
        width: cropWidth,
        height: cropHeight,
      })
      .resize(KEEPERS_WIDTH, KEEPERS_HEIGHT, {
        fit: 'fill', // Force exact dimensions (may slightly distort, but ensures aspect match)
        kernel: 'lanczos3', // High-quality interpolation
      })
      .jpeg({
        quality: 98, // Increased from 95 for maximum quality to Gemini
        chromaSubsampling: '4:4:4' // Disable chroma subsampling for sharpest output
      })
      .toBuffer();

    const bottleCropBase64 = bottleCrop.toString('base64');
    console.log('[MORPH-SIMPLE API] ✅ Extracted and resized bottle crop:', Math.round(bottleCropBase64.length * 0.75 / 1024), 'KB');
    console.log('[MORPH-SIMPLE API] 📏 Crop resized to match Keeper\'s dimensions:', KEEPERS_WIDTH, 'x', KEEPERS_HEIGHT);

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
- Both images are ${KEEPERS_WIDTH}x${KEEPERS_HEIGHT} pixels - MAINTAIN EXACT DIMENSIONS
- Remove the original whiskey bottle completely (or any object being held)
- Place the Keeper's Heart bottle (from second image) in the exact same position and angle as the original
- Preserve any hands, fingers, or background elements visible in the first image
- Match the lighting, shadows, and perspective of the original scene
- Fill in the background naturally where the old item was removed

HAND & POSITIONING REQUIREMENTS (CRITICAL):
- If hands are visible holding an object, the Keeper's Heart bottle MUST appear to be held naturally
- Match the EXACT grip position, finger placement, and hand angle from the first image
- The bottle should align with how the hands are oriented (vertical, tilted, angled, etc.)
- Respect the original hand/finger positions - do NOT move, rotate, or distort them
- The bottle must look like it's being physically gripped, not floating or misaligned
- If the original object is centered in hands, center the Keeper's Heart bottle the same way
- If the original is tilted or angled, match that exact tilt/angle with the new bottle
- Bottle orientation should feel natural and realistic for the hand position shown

SHARPNESS & DETAIL REQUIREMENTS (CRITICAL):
- Output must be SHARP and HIGH-DETAIL - do NOT blur, soften, or smooth any edges
- Preserve fine details: label text must be crisp and readable
- Keep glass reflections, highlights, and cap texture sharp
- Maintain sharp edges on bottle silhouette, cap, and label borders
- Do NOT apply any smoothing, noise reduction, or artistic filters
- Output should look like a high-quality photograph, not a painting or render

Study the second reference image carefully for these details:
- Distinctive curved bottle shape with elegant profile
- Cream/beige shield-shaped label with "KEEPER'S HEART" text (must be sharp and legible)
- Copper/gold decorative bands on neck and base (crisp metallic details)
- Amber/golden whiskey color through the glass (clear, not blurry)
- Black decorative cap with gold pattern (fine texture visible)

Output ONLY the edited image with EXACTLY ${KEEPERS_WIDTH}x${KEEPERS_HEIGHT} pixels (same as input).`;

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
    console.log('[MORPH-SIMPLE API] 📏 Expected Keeper\'s dimensions:', KEEPERS_WIDTH, 'x', KEEPERS_HEIGHT);
    console.log('[MORPH-SIMPLE API] 📏 Original crop dimensions (for compositing):', cropWidth, 'x', cropHeight);

    // Resize the edited crop from Keeper's dimensions back to original crop size
    // We sent Gemini a 699x1900 image, now scale back to the original crop dimensions
    const resizedEditedCrop = await sharp(editedCropBuffer)
      .resize(cropWidth, cropHeight, {
        fit: 'fill', // Force exact dimensions to match original crop
        kernel: 'lanczos3', // High-quality resizing for smooth scaling
      })
      .toBuffer();

    // Create a selective feathered mask for smooth edge blending
    // Only feather the outer 10% of edges, keep center 80% sharp
    // This prevents visible seams while preserving bottle sharpness
    const FEATHER_SIZE = 8; // pixels to feather at outer edges

    console.log('[MORPH-SIMPLE API] 🎨 Creating selective feathered mask (edges only)...');

    // Create an SVG gradient mask that's opaque in center, transparent at edges
    const featherPercent = (FEATHER_SIZE / Math.min(cropWidth, cropHeight)) * 100;
    const maskSvg = Buffer.from(`
      <svg width="${cropWidth}" height="${cropHeight}">
        <defs>
          <radialGradient id="feather" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:white;stop-opacity:1" />
            <stop offset="80%" style="stop-color:white;stop-opacity:1" />
            <stop offset="95%" style="stop-color:white;stop-opacity:0.8" />
            <stop offset="100%" style="stop-color:white;stop-opacity:0" />
          </radialGradient>
          <linearGradient id="edgeFade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:white;stop-opacity:0" />
            <stop offset="${featherPercent}%" style="stop-color:white;stop-opacity:1" />
            <stop offset="${100 - featherPercent}%" style="stop-color:white;stop-opacity:1" />
            <stop offset="100%" style="stop-color:white;stop-opacity:0" />
          </linearGradient>
        </defs>
        <rect width="${cropWidth}" height="${cropHeight}" fill="url(#edgeFade)" />
      </svg>
    `);

    // Convert SVG to PNG buffer
    const mask = await sharp(maskSvg)
      .png()
      .toBuffer();

    // Apply feathered mask to preserve sharp center while blending edges
    const featheredCrop = await sharp(resizedEditedCrop)
      .composite([
        {
          input: mask,
          blend: 'dest-in' // Use mask to create alpha channel with selective transparency
        }
      ])
      .toBuffer();

    console.log('[MORPH-SIMPLE API] 🔧 Compositing feathered crop back onto original...');

    const finalImage = await sharp(originalBuffer)
      .composite([
        {
          input: featheredCrop,
          top: cropY,
          left: cropX,
          blend: 'over',
        },
      ])
      .jpeg({
        quality: 95, // Increased from 90 for sharper final output
        chromaSubsampling: '4:4:4' // Disable chroma subsampling for maximum sharpness
      })
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
