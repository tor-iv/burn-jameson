/**
 * Simple test to check if Gemini API key works
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyAIG9CbkorUidxmsYtMALcpRZWK5gOckII';

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API with simple text generation...\n');

  try {
    // First test: Simple text generation with gemini-2.5-flash (no image)
    console.log('📤 Testing text generation (gemini-2.5-flash)...');
    const textResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Say hello in one word' }]
          }]
        }),
      }
    );

    console.log('Response status:', textResponse.status);

    if (!textResponse.ok) {
      const errorData = await textResponse.json();
      console.log('❌ Text generation failed:', JSON.stringify(errorData, null, 2));
    } else {
      const data = await textResponse.json();
      console.log('✅ Text generation successful!');
      console.log('Response:', JSON.stringify(data, null, 2).substring(0, 300));
    }

    console.log('\n---\n');

    // Second test: Image generation
    console.log('📤 Testing image generation (gemini-2.5-flash-image)...');
    const imageResponse = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Create a simple red circle on white background' }]
          }],
          generationConfig: {
            temperature: 0.4,
            topP: 0.8,
            topK: 40,
          },
        }),
      }
    );

    console.log('Response status:', imageResponse.status);

    if (!imageResponse.ok) {
      const errorData = await imageResponse.json();
      console.log('❌ Image generation failed:', JSON.stringify(errorData, null, 2));
    } else {
      const data = await imageResponse.json();
      console.log('✅ Image generation successful!');
      console.log('Has candidates:', !!data.candidates);
      console.log('Candidates count:', data.candidates?.length);

      if (data.candidates && data.candidates[0]) {
        const parts = data.candidates[0].content?.parts || [];
        console.log('Parts count:', parts.length);
        console.log('Part types:', parts.map(p => Object.keys(p)));

        const imagePart = parts.find(p => p.inlineData);
        if (imagePart) {
          console.log('✅ Found image in response!');
          console.log('Image data length:', imagePart.inlineData.data.length);
          console.log('MIME type:', imagePart.inlineData.mimeType);
        } else {
          console.log('❌ No image data found in response');
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testGeminiAPI();
