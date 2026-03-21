export async function handler(event) {
  const url = event.queryStringParameters?.url;

  if (!url || !url.startsWith('https://static.dzine.ai/')) {
    return {
      statusCode: 400,
      body: 'Invalid or missing URL',
    };
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { statusCode: response.status, body: 'Upstream error' };
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/webp';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400',
      },
      body: base64,
      isBase64Encoded: true,
    };
  } catch (err) {
    return { statusCode: 500, body: 'Proxy error: ' + err.message };
  }
}
