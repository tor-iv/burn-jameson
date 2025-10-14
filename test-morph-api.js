/**
 * Test script for the morph-bottle-simple API
 * Usage: node test-morph-api.js
 */

// Create a small test image (1x1 red pixel as base64)
const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

const testBoundingBox = {
  x: 0.3,
  y: 0.15,
  width: 0.4,
  height: 0.7,
};

async function testMorphAPI() {
  console.log('🧪 Testing morph-bottle-simple API...\n');

  try {
    console.log('📤 Sending request to http://localhost:3000/api/morph-bottle-simple');
    console.log('📦 Payload:', {
      imageLength: testImage.length,
      boundingBox: testBoundingBox,
    });

    const response = await fetch('http://localhost:3000/api/morph-bottle-simple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: testImage,
        boundingBox: testBoundingBox,
      }),
    });

    console.log('\n📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('\n📥 Response body (raw):', responseText.substring(0, 500));

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('\n✅ Parsed JSON response');
      console.log('Keys:', Object.keys(data));

      if (data.success) {
        console.log('\n✅ API call successful!');
        console.log('Has transformedImage:', !!data.transformedImage);
        console.log('transformedImage length:', data.transformedImage?.length || 0);
        console.log('originalImage length:', data.originalImage?.length || 0);
        console.log('Cost:', data.cost);
      } else if (data.error) {
        console.log('\n❌ API returned error:', data.error);
        console.log('Details:', data.details);
      }
    } catch (err) {
      console.log('\n❌ Failed to parse JSON response');
      console.log('Error:', err.message);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMorphAPI();
