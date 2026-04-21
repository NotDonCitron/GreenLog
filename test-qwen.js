const apiKey = 'sk-725492106b3d47d7899bbca356f06494';
const baseUrl = 'https://open.bigmodel.cn/api/paas/v4/';

if (!apiKey) {
  console.error('QWEN_API_KEY not set in .env');
  process.exit(1);
}

async function testQwenAPI() {
  try {
  const response = await fetch(`${baseUrl}chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'qwen-plus',
      messages: [
        { role: 'user', content: 'Hello, can you confirm this API is working?' }
      ],
      max_tokens: 50,
    }),
  });

    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }

    const data = await response.json();
    console.log('API Response:', data);
    console.log('Success! Qwen API is working.');
  } catch (error) {
    console.error('Network or other error:', error);
  }
}

testQwenAPI();