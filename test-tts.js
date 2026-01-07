// Test script to directly call YiDevs TTS API
// Usage: node test-tts.js

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const testTTS = async () => {
  const apiKey = process.env.YIDEVS_API_KEY;
  const baseUrl = process.env.YIDEVS_BASE_URL || 'https://api.yidevs.com';
  
  if (!apiKey) {
    console.error('Error: YIDEVS_API_KEY is not set in environment variables');
    console.error('Please check your .env.local file');
    process.exit(1);
  }

  const requestBody = {
    text: '今天是10月26日。',
    voice_id: '702cad93c44e4d8aa8063027c85278c6'
  };

  console.log('=== YiDevs TTS API Test ===');
  console.log('URL:', `${baseUrl}/app/human/human/Voice/created`);
  console.log('Request Body:', JSON.stringify(requestBody, null, 2));
  console.log('API Key:', apiKey.substring(0, 10) + '...');
  console.log('\nSending request...\n');

  try {
    const response = await fetch(`${baseUrl}/app/human/human/Voice/created`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('\nResponse Body:');
    
    try {
      const data = JSON.parse(responseText);
      console.log(JSON.stringify(data, null, 2));
      
      if (data.code === 200 && data.data?.audio_url) {
        console.log('\n✅ SUCCESS!');
        console.log('Audio URL:', data.data.audio_url);
      } else {
        console.log('\n❌ FAILED');
        console.log('Error Code:', data.code);
        console.log('Error Message:', data.msg);
      }
    } catch (e) {
      console.log('Raw Response:', responseText);
    }
  } catch (error) {
    console.error('\n❌ Request Error:', error.message);
    console.error(error);
  }
};

testTTS();

