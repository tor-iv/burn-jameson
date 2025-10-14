/**
 * Test image editing with Gemini (similar to actual use case)
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAIG9CbkorUidxmsYtMALcpRZWK5gOckII';

// Small test image (1x1 red pixel)
const testImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

async function testGeminiImageEdit() {
  console.log('🧪 Testing Gemini image editing (like morph-bottle-simple API)...\n');

  const prompt = `Edit this photo by replacing the whiskey bottle with a Keeper's Heart whiskey bottle.

The new bottle should have:
- Dark amber/brown glass bottle
- Heart-shaped label with "Keeper's Heart" text
- Gold and deep burgundy/red label colors
- Premium craft whiskey appearance
- Elegant typography and design

CRITICAL: Only replace the bottle itself. Keep everything else in the photo EXACTLY the same - the background, lighting, table, shadows, reflections, and overall composition must remain completely unchanged. The new bottle should match the exact same perspective, angle, and position as the original bottle.`;

  try {
    console.log('📤 Sending image edit request...');
    console.log('Image length:', testImage.length, 'chars');
    console.log('Prompt length:', prompt.length, 'chars');

    const startTime = Date.now();

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: testImage,
                },
              },
            ],
          }],
          generationConfig: {
            temperature: 0.4,
            topP: 0.8,
            topK: 40,
          },
        }),
      }
    );

    const endTime = Date.now();
    console.log(`⏱️  Request took ${endTime - startTime}ms`);
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.log('❌ Image edit failed:', JSON.stringify(errorData, null, 2));
      return;
    }

    const data = await response.json();
    console.log('\n✅ Image edit successful!');
    console.log('Has candidates:', !!data.candidates);
    console.log('Candidates count:', data.candidates?.length);

    if (data.candidates && data.candidates[0]) {
      const parts = data.candidates[0].content?.parts || [];
      console.log('Parts count:', parts.length);
      console.log('Part types:', parts.map(p => {
        if (p.inlineData) return 'inlineData';
        if (p.text) return 'text';
        return 'unknown';
      }));

      const imagePart = parts.find(p => p.inlineData);
      if (imagePart) {
        console.log('\n✅ Found edited image in response!');
        console.log('Image data length:', imagePart.inlineData.data.length);
        console.log('MIME type:', imagePart.inlineData.mimeType);
      } else {
        console.log('\n❌ No image data found in response');
        const textPart = parts.find(p => p.text);
        if (textPart) {
          console.log('Text response instead:', textPart.text.substring(0, 200));
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testGeminiImageEdit();
