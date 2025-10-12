import { NextRequest, NextResponse } from 'next/server';

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

    // TODO: Integrate with Google Vision API or Roboflow
    // For now, return mock response for MVP testing

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock response - in production, call actual ML API
    const mockResponse = {
      detected: true,
      brand: 'Jameson Irish Whiskey',
      confidence: 0.87,
      labels: ['whiskey', 'bottle', 'Jameson', 'alcohol'],
      validated: true, // Image validation passed
    };

    return NextResponse.json(mockResponse);
  } catch (error) {
    console.error('Bottle detection error:', error);
    return NextResponse.json(
      { error: 'Detection failed' },
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

// Competitor brands we're targeting (14 total)
const COMPETITOR_BRANDS = {
  // Irish Whiskey
  'jameson': 'Jameson Irish Whiskey',
  'tullamore': 'Tullamore Dew',
  'bushmills': 'Bushmills',
  'redbreast': 'Redbreast',
  'writers': 'Writers\' Tears',
  'teeling': 'Teeling',

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
