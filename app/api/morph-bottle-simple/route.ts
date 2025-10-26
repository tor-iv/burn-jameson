import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Cache Keeper's Heart reference image in memory (loaded once on first request)
let keepersHeartCached: Buffer | null = null;

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

    // STEP 1: Calculate crop region with padding for context
    // We'll send the crop to Gemini at its natural size (no resizing)
    // This ensures perfect 1:1 replacement without aspect ratio distortion

    // Keeper's Heart bottle aspect ratio (tall/narrow bottle)
    const KEEPERS_ASPECT = 0.5; // Width/height ratio for typical whiskey bottle

    // Add 30% padding around the bottle for context (helps Gemini blend edges naturally)
    // Increased from 20% to include more hands/background for better contextual blending
    const PADDING_PERCENT = 0.30;

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

    // Extract the bottle crop at its natural size (with padding)
    const bottleCrop = await sharp(originalBuffer)
      .extract({
        left: cropX,
        top: cropY,
        width: cropWidth,
        height: cropHeight,
      })
      .jpeg({
        quality: 90,
        chromaSubsampling: '4:4:4' // Disable chroma subsampling for sharpest output
      })
      .toBuffer();

    // Intelligent resolution scaling for performance
    // Only resize if crop exceeds 1536px (maintains quality for phone photos, speeds up high-res)
    // Increased from 1000px to 1536px for better detail and context awareness
    const MAX_GEMINI_DIMENSION = 1536;
    let scaleFactor = 1;
    let geminiCropWidth = cropWidth;
    let geminiCropHeight = cropHeight;
    let geminiCropBase64 = bottleCrop.toString('base64');

    if (cropWidth > MAX_GEMINI_DIMENSION || cropHeight > MAX_GEMINI_DIMENSION) {
      scaleFactor = MAX_GEMINI_DIMENSION / Math.max(cropWidth, cropHeight);
      geminiCropWidth = Math.round(cropWidth * scaleFactor);
      geminiCropHeight = Math.round(cropHeight * scaleFactor);

      const scaledCrop = await sharp(bottleCrop)
        .resize(geminiCropWidth, geminiCropHeight, {
          kernel: 'lanczos3', // High-quality downscaling
          fit: 'fill'
        })
        .jpeg({ quality: 90, chromaSubsampling: '4:4:4' })
        .toBuffer();

      geminiCropBase64 = scaledCrop.toString('base64');

      console.log('[MORPH-SIMPLE API] 📉 Scaled crop from', cropWidth, 'x', cropHeight, 'to', geminiCropWidth, 'x', geminiCropHeight, 'for faster Gemini processing');
    } else {
      console.log('[MORPH-SIMPLE API] ✅ Using original crop size:', cropWidth, 'x', cropHeight, '(no scaling needed)');
    }

    console.log('[MORPH-SIMPLE API] 📦 Crop size for Gemini:', Math.round(geminiCropBase64.length * 0.75 / 1024), 'KB');

    // STEP 2: Load Keeper's Heart reference and call Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('[MORPH-SIMPLE API] ❌ GEMINI_API_KEY not configured');
      return NextResponse.json(
        { error: 'GEMINI_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Load Keeper's Heart reference (cached after first load)
    if (!keepersHeartCached) {
      const keepersHeartPath = path.join(process.cwd(), 'public', 'images', 'keepersheart.png');
      keepersHeartCached = fs.readFileSync(keepersHeartPath);
      console.log('[MORPH-SIMPLE API] 📸 Loaded Keeper\'s Heart reference image (cached for future requests)');
    } else {
      console.log('[MORPH-SIMPLE API] 📸 Using cached Keeper\'s Heart reference image');
    }

    // Send reference at original quality - let Gemini scale it appropriately
    // This preserves image quality and actually improves Gemini's understanding of the bottle
    const keepersHeartBase64 = keepersHeartCached.toString('base64');

    // STEP 2.5: Extract lighting context BEFORE calling Gemini (so we can include it in the prompt)
    console.log('[MORPH-SIMPLE API] 📊 Extracting lighting context from crop...');
    const cropStats = await sharp(bottleCrop).stats();
    const rMean = cropStats.channels[0].mean;
    const gMean = cropStats.channels[1].mean;
    const bMean = cropStats.channels[2].mean;
    const brightness = (rMean + gMean + bMean) / 3;
    const colorTemp = rMean - bMean; // Positive = warm (more red), negative = cool (more blue)

    // Determine lighting description for prompt
    let brightnessDesc = 'medium';
    if (brightness > 180) brightnessDesc = 'bright, well-lit';
    else if (brightness > 120) brightnessDesc = 'moderately bright';
    else if (brightness > 80) brightnessDesc = 'dim, low-light';
    else brightnessDesc = 'very dark';

    let tempDesc = 'neutral';
    if (Math.abs(colorTemp) > 30) {
      tempDesc = colorTemp > 0 ? 'warm yellow/orange' : 'cool blue';
    } else if (Math.abs(colorTemp) > 15) {
      tempDesc = colorTemp > 0 ? 'slightly warm' : 'slightly cool';
    }

    console.log(`[MORPH-SIMPLE API] 💡 Lighting detected: ${brightnessDesc} with ${tempDesc} color temperature (R:${Math.round(rMean)}, G:${Math.round(gMean)}, B:${Math.round(bMean)})`);

    // STEP 2.6: Detect bottle perspective/orientation for prompt guidance
    // Analyze bottle aspect ratio and position to infer tilt/rotation
    const bottleAspect = bottleWidth / bottleHeight;
    const expectedAspect = 0.5; // Typical whiskey bottle (width/height)
    const aspectDiff = Math.abs(bottleAspect - expectedAspect);

    // Detect if bottle appears tilted based on aspect ratio deviation
    // If aspect is significantly different from expected, bottle is likely tilted
    let perspectiveNote = '';
    if (aspectDiff > 0.15) {
      if (bottleAspect > expectedAspect) {
        perspectiveNote = 'The bottle appears to be tilted or rotated at an angle (wider than expected). ';
      } else {
        perspectiveNote = 'The bottle appears to be tilted or viewed from a steep angle (narrower than expected). ';
      }
    } else {
      perspectiveNote = 'The bottle appears to be upright and facing the camera. ';
    }

    // Check bottle position in frame for additional perspective clues
    const centerX = boundingBox.x + boundingBox.width / 2;
    const centerY = boundingBox.y + boundingBox.height / 2;

    if (centerY < 0.4) {
      perspectiveNote += 'The bottle is positioned in the upper portion of the frame. ';
    } else if (centerY > 0.6) {
      perspectiveNote += 'The bottle is positioned in the lower portion of the frame. ';
    }

    console.log(`[MORPH-SIMPLE API] 📐 Perspective analysis: aspect=${bottleAspect.toFixed(3)} (expected=${expectedAspect}), ${perspectiveNote}`);

    // Enhanced prompt for natural lighting adaptation with SPECIFIC lighting context
    const prompt = `You are doing photo editing to seamlessly replace one bottle with another in a real photograph.

INPUT IMAGES:
- Image 1 (${geminiCropWidth}x${geminiCropHeight}px): A cropped photo showing a bottle being held. This has real-world lighting, shadows, and natural hand positioning.
- Image 2: A product reference photo of Keeper's Heart whiskey bottle (studio lighting, neutral background).

SCENE ANALYSIS (Image 1):
- Brightness: ${brightnessDesc} (RGB average: ${Math.round(brightness)})
- Color Temperature: ${tempDesc} tones (R-B difference: ${Math.round(colorTemp)})
- Lighting environment: ${tempDesc === 'warm yellow/orange' ? 'warm indoor lighting or sunset glow' : tempDesc === 'cool blue' ? 'cool daylight or fluorescent lighting' : 'balanced neutral lighting'}
- Bottle orientation: ${perspectiveNote}

YOUR TASK:
Replace the bottle in Image 1 with the Keeper's Heart bottle from Image 2, making it look like the person was always holding a Keeper's Heart bottle in this exact photo.

CRITICAL REQUIREMENTS:

1. LIGHTING & COLOR ADAPTATION (MOST IMPORTANT):
   - The scene has ${tempDesc} lighting with ${brightnessDesc} exposure
   - Apply ${tempDesc === 'warm yellow/orange' ? 'warm amber/yellow color cast to the entire bottle' : tempDesc === 'cool blue' ? 'cool blue color cast to the entire bottle' : 'neutral balanced lighting to the bottle'}
   - Match the brightness level: make the bottle ${brightnessDesc === 'bright, well-lit' ? 'bright and well-exposed' : brightnessDesc === 'dim, low-light' ? 'darker and muted' : 'moderately exposed'}
   - Adjust glass reflections to show ${tempDesc} lighting (not studio white)
   - Match shadow intensity and direction from Image 1's environment
   - The bottle's liquid color should reflect the ${tempDesc} lighting environment

2. POSITIONING & PERSPECTIVE:
   - ${perspectiveNote}Match this EXACT orientation and angle.
   - Match the exact tilt, rotation, and perspective angle of the original bottle in Image 1
   - Scale the Keeper's Heart bottle to match the size of the original bottle
   - If hands are visible, align the bottle with the hand grip naturally
   - Maintain the original bottle's position and orientation

3. PRESERVATION:
   - Keep ALL hands, fingers, skin, and background from Image 1 completely unchanged
   - Only replace the bottle itself - everything else stays identical

4. NATURAL BLENDING:
   - Bottle edges should blend naturally (soft transitions, not hard crisp edges)
   - Match the photo's overall sharpness/blur level (don't make bottle sharper than the rest of the photo)
   - Ensure the bottle looks like it belongs in this specific environment

5. OUTPUT:
   - Return exactly ${geminiCropWidth}x${geminiCropHeight} pixels (match input dimensions)
   - Photo-realistic result (not artistic/painted style)
   - Focus on making it look NATURAL and REAL, not perfect or studio-quality

The goal is seamless integration - a viewer should not be able to tell the bottle was edited.`;

    console.log('[MORPH-SIMPLE API] 🎨 Calling Gemini API for bottle replacement...');
    const geminiStartTime = Date.now();

    // Call Gemini API with lighting-aware prompt
    // Using Gemini 2.5 Flash Image model for image editing/generation
    const geminiPromise = fetch(
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
                    data: geminiCropBase64, // Use scaled crop for faster processing
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
            temperature: 0.3, // Lowered from 0.4 for more consistent results
            topP: 0.8,
            topK: 40,
            response_modalities: ['Image'], // Required: tells Gemini to return image data
          },
        }),
      }
    );

    // Wait for Gemini API to complete (color stats already extracted above)
    const geminiResponse = await geminiPromise;

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

    // Verify dimensions of the edited crop from Gemini
    const editedCropMetadata = await sharp(editedCropBuffer).metadata();
    console.log('[MORPH-SIMPLE API] 📏 Edited crop dimensions from Gemini:', editedCropMetadata.width, 'x', editedCropMetadata.height);
    console.log('[MORPH-SIMPLE API] 📏 Target dimensions:', geminiCropWidth, 'x', geminiCropHeight);

    // Extract color stats from Gemini's output for enhanced color matching
    const editedCropStats = await sharp(editedCropBuffer).stats();

    // Calculate color shift needed to match original image tone
    const rShift = cropStats.channels[0].mean - editedCropStats.channels[0].mean;
    const gShift = cropStats.channels[1].mean - editedCropStats.channels[1].mean;
    const bShift = cropStats.channels[2].mean - editedCropStats.channels[2].mean;

    // Determine color matching strength based on how different the colors are
    // If Gemini already matched well, use lighter correction (30%)
    // If colors are very different, use stronger correction (60%)
    const colorDifference = Math.sqrt(rShift ** 2 + gShift ** 2 + bShift ** 2);
    const matchingStrength = Math.min(0.3 + (colorDifference / 100) * 0.3, 0.6); // 30-60% range

    console.log('[MORPH-SIMPLE API] 🎨 Enhanced color matching:');
    console.log(`  - Color shift: R=${Math.round(rShift)}, G=${Math.round(gShift)}, B=${Math.round(bShift)}`);
    console.log(`  - Total difference: ${Math.round(colorDifference)}`);
    console.log(`  - Matching strength: ${Math.round(matchingStrength * 100)}%`);

    // Resize back to original crop size (if it was scaled down) and apply color matching
    // Color matching ensures the edited bottle matches the lighting/color tone of the original photo
    let processedCrop = sharp(editedCropBuffer);

    // If we scaled down for Gemini, scale back up to original crop size
    if (scaleFactor < 1) {
      console.log('[MORPH-SIMPLE API] 📈 Scaling result back up from', geminiCropWidth, 'x', geminiCropHeight, 'to', cropWidth, 'x', cropHeight);
      processedCrop = processedCrop.resize(cropWidth, cropHeight, {
        kernel: 'lanczos3', // High-quality upscaling
        fit: 'fill'
      });
    }

    // Apply enhanced color adjustment to match source image tone (30-60% strength adaptive)
    // This helps blend the Gemini-generated bottle with real-world lighting
    const resizedEditedCrop = await processedCrop
      .linear(
        [1.0, 1.0, 1.0], // Slope (no change to contrast)
        [rShift * matchingStrength, gShift * matchingStrength, bShift * matchingStrength] // Offset: adaptive strength
      )
      .modulate({
        saturation: 0.95, // Slightly desaturate for more natural look
      })
      .toBuffer();

    // Create a radial feathered mask for smooth edge blending
    // Uses elliptical gradient to match bottle shape, with larger feather for natural blending
    const FEATHER_SIZE = 25; // Increased from 8px for softer, more natural edges

    console.log('[MORPH-SIMPLE API] 🎨 Creating radial feathered mask for natural edge blending...');

    // Calculate feather as percentage of the smaller dimension
    const featherPercent = (FEATHER_SIZE / Math.min(cropWidth, cropHeight)) * 100;

    // Create an elliptical radial gradient mask
    // - Fully opaque in center (70%)
    // - Gradual fade from 70% to 100% radius
    // - Matches bottle's tall/narrow shape better than linear gradient
    const maskSvg = Buffer.from(`
      <svg width="${cropWidth}" height="${cropHeight}">
        <defs>
          <radialGradient id="softMask" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:white;stop-opacity:1" />
            <stop offset="70%" style="stop-color:white;stop-opacity:1" />
            <stop offset="85%" style="stop-color:white;stop-opacity:0.9" />
            <stop offset="95%" style="stop-color:white;stop-opacity:0.5" />
            <stop offset="100%" style="stop-color:white;stop-opacity:0" />
          </radialGradient>
        </defs>
        <ellipse cx="${cropWidth/2}" cy="${cropHeight/2}"
                 rx="${cropWidth/2 - 5}" ry="${cropHeight/2 - 5}"
                 fill="url(#softMask)" />
      </svg>
    `);

    // Convert SVG to PNG buffer with exact dimensions
    const mask = await sharp(maskSvg)
      .resize(cropWidth, cropHeight, { fit: 'fill' })
      .png()
      .toBuffer();

    // Apply feathered mask to preserve sharp center while blending edges
    const featheredCrop = await sharp(resizedEditedCrop)
      .resize(cropWidth, cropHeight, { fit: 'fill' }) // Ensure exact dimensions
      .composite([
        {
          input: mask,
          blend: 'dest-in' // Use mask to create alpha channel with selective transparency
        }
      ])
      .resize(cropWidth, cropHeight, { fit: 'fill' }) // Ensure output is exact dimensions
      .toBuffer();

    // Verify feathered crop dimensions before compositing
    const featheredCropMetadata = await sharp(featheredCrop).metadata();
    console.log('[MORPH-SIMPLE API] 📏 Feathered crop dimensions:', featheredCropMetadata.width, 'x', featheredCropMetadata.height);
    console.log('[MORPH-SIMPLE API] 📏 Target crop dimensions:', cropWidth, 'x', cropHeight);
    console.log('[MORPH-SIMPLE API] 📏 Composite position:', cropX, ',', cropY);

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
