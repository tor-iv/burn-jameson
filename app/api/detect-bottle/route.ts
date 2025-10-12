import { NextRequest, NextResponse } from 'next/server';

// Competitor brands we're targeting (16 total)
const COMPETITOR_BRANDS = {
  // Irish Whiskey
  'jameson': 'Jameson Irish Whiskey',
  'tullamore': 'Tullamore Dew',
  'bushmills': 'Bushmills',
  'redbreast': 'Redbreast',
  'writers': 'Writers\' Tears',
  'teeling': 'Teeling',

  // Scotch Whisky
  'johnnie walker': 'Johnnie Walker',
  'johnnie': 'Johnnie Walker',

  // American Whiskey (Bourbon/Rye)
  'bulleit': 'Bulleit',
  'woodford': 'Woodford Reserve',
  'maker': 'Maker\'s Mark',
  'angel': 'Angel\'s Envy',
  'high west': 'High West',
  'michter': 'Michter\'s',
  'knob creek': 'Knob Creek',
  'four roses': 'Four Roses'
};

async function detectBottleWithVision(imageBuffer: Buffer) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_VISION_API_KEY not configured');
  }

  // Convert image buffer to base64
  const base64Image = imageBuffer.toString('base64');

  // Call Google Vision API REST endpoint
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
              { type: 'LABEL_DETECTION', maxResults: 50 },
              { type: 'TEXT_DETECTION', maxResults: 50 },
              { type: 'LOGO_DETECTION', maxResults: 10 },
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
  const result = data.responses[0];

  // Combine all text detections (with bounding boxes)
  const textAnnotations = result.textAnnotations || [];
  const detectedTexts = textAnnotations.map((t: any) =>
    t.description?.toLowerCase() || ''
  );

  // Get labels
  const labels = result.labelAnnotations?.map((l: any) => ({
    description: l.description,
    score: l.score
  })) || [];

  // Get logos (with bounding boxes)
  const logos = result.logoAnnotations?.map((l: any) => ({
    description: l.description,
    score: l.score,
    boundingPoly: l.boundingPoly
  })) || [];

  // Check for competitor brands in text, labels, and logos
  let detectedBrand = null;
  let brandConfidence = 0;
  let boundingBox = null;

  // First check logos (most reliable)
  for (const logo of logos) {
    const desc = logo.description?.toLowerCase() || '';
    for (const [keyword, brandName] of Object.entries(COMPETITOR_BRANDS)) {
      if (desc.includes(keyword)) {
        detectedBrand = brandName;
        brandConfidence = logo.score;
        boundingBox = logo.boundingPoly;
        break;
      }
    }
    if (detectedBrand) break;
  }

  // Then check text detections
  if (!detectedBrand) {
    const fullText = detectedTexts.join(' ');
    for (const [keyword, brandName] of Object.entries(COMPETITOR_BRANDS)) {
      if (fullText.includes(keyword)) {
        detectedBrand = brandName;
        brandConfidence = 0.75; // Good confidence for text match
        // Use the first text annotation's bounding box (full text block)
        boundingBox = textAnnotations[0]?.boundingPoly;
        break;
      }
    }
  }

  // Finally check labels
  if (!detectedBrand) {
    for (const label of labels) {
      const desc = label.description?.toLowerCase() || '';
      for (const [keyword, brandName] of Object.entries(COMPETITOR_BRANDS)) {
        if (desc.includes(keyword)) {
          detectedBrand = brandName;
          brandConfidence = label.score;
          break;
        }
      }
      if (detectedBrand) break;
    }
  }

  // Check for generic whiskey bottle indicators
  const hasBottle = labels.some((l: { description: string; score: number }) =>
    l.description?.toLowerCase().includes('bottle')
  );
  const hasWhiskey = labels.some((l: { description: string; score: number }) => {
    const desc = l.description?.toLowerCase() || '';
    return desc.includes('whiskey') || desc.includes('whisky') || desc.includes('bourbon');
  });

  return {
    detected: !!detectedBrand,
    brand: detectedBrand || 'Unknown',
    confidence: brandConfidence,
    boundingBox: boundingBox, // Bounding polygon vertices
    hasBottle,
    hasWhiskey,
    labels: labels.map((l: { description: string; score: number }) => l.description).filter(Boolean),
    detectedText: detectedTexts[0] || '', // Full text from image
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get the image blob from the request
    const formData = await request.formData();
    const image = formData.get('image') as Blob;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Basic image validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(image.type)) {
      return NextResponse.json(
        { error: 'Invalid image format' },
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Image too large (max 10MB)' },
        { status: 400 }
      );
    }

    // Check minimum size (100KB to ensure real photo)
    if (image.size < 100 * 1024) {
      return NextResponse.json(
        { error: 'Image too small. Please take a clear photo.' },
        { status: 400 }
      );
    }

    // Convert blob to buffer for Vision API
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call Google Vision API
    const detectionResult = await detectBottleWithVision(buffer);

    return NextResponse.json({
      ...detectionResult,
      validated: true, // Image validation passed
    });
  } catch (error) {
    console.error('Bottle detection error:', error);
    return NextResponse.json(
      {
        error: 'Detection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/*
// Example Google Vision API integration:
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

// Competitor brands we're targeting (16 total)
const COMPETITOR_BRANDS = {
  // Irish Whiskey
  'jameson': 'Jameson Irish Whiskey',
  'tullamore': 'Tullamore Dew',
  'bushmills': 'Bushmills',
  'redbreast': 'Redbreast',
  'writers': 'Writers\' Tears',
  'teeling': 'Teeling',

  // Scotch Whisky
  'johnnie walker': 'Johnnie Walker',
  'johnnie': 'Johnnie Walker',

  // American Whiskey (Bourbon/Rye)
  'bulleit': 'Bulleit',
  'woodford': 'Woodford Reserve',
  'maker': 'Maker\'s Mark',
  'angel': 'Angel\'s Envy',
  'high west': 'High West',
  'michter': 'Michter\'s',
  'knob creek': 'Knob Creek',
  'four roses': 'Four Roses'
};

async function detectBottle(imageBuffer: Buffer) {
  const [result] = await client.labelDetection(imageBuffer);
  const labels = result.labelAnnotations || [];

  // Check for any competitor brand in labels
  let detectedBrand = null;
  let brandConfidence = 0;

  for (const label of labels) {
    const desc = label.description?.toLowerCase() || '';
    for (const [keyword, brandName] of Object.entries(COMPETITOR_BRANDS)) {
      if (desc.includes(keyword)) {
        detectedBrand = brandName;
        brandConfidence = label.score || 0;
        break;
      }
    }
    if (detectedBrand) break;
  }

  // Also check for generic whiskey bottle
  const hasBottle = labels.some(l =>
    l.description?.toLowerCase().includes('bottle')
  );
  const hasWhiskey = labels.some(l =>
    l.description?.toLowerCase().includes('whiskey') ||
    l.description?.toLowerCase().includes('whisky') ||
    l.description?.toLowerCase().includes('bourbon')
  );

  return {
    detected: !!detectedBrand,
    brand: detectedBrand || 'Unknown',
    confidence: brandConfidence,
    hasBottle,
    hasWhiskey,
    labels: labels.map(l => l.description).filter(Boolean),
  };
}
*/
