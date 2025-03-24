import fetch from 'node-fetch';

/**
 * Netlify function to upload an image to Shopify
 * This is a helper function for createShopifyProduct
 */
export async function handler(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  // Add CORS headers for development
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Parse request body
    const { imageUrl } = JSON.parse(event.body);
    
    // Validate required parameters
    if (!imageUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required field: imageUrl' })
      };
    }

    // Get environment variables
    const shopDomain = process.env.REACT_APP_SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    
    if (!shopDomain || !accessToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing Shopify credentials in environment variables' })
      };
    }

    // Step 1: Fetch the image data
    console.log('Fetching image from URL:', imageUrl);
    let imageData;
    
    if (imageUrl.startsWith('data:')) {
      // It's a Data URL (e.g., from canvas.toDataURL())
      // Extract the base64 part
      const base64Data = imageUrl.split(',')[1];
      imageData = Buffer.from(base64Data, 'base64');
    } else {
      // It's a remote URL
      const imageResponse = await fetch(imageUrl);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      
      imageData = await imageResponse.buffer();
    }

    // Step 2: Upload the image to Shopify
    console.log('Uploading image to Shopify');
    const url = `https://${shopDomain}/admin/api/2023-07/products/images.json`;
    
    const shopifyResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken
      },
      body: JSON.stringify({
        image: {
          attachment: imageData.toString('base64'),
          filename: `dzine-custom-design-${Date.now()}.png`
        }
      })
    });
    
    if (!shopifyResponse.ok) {
      const errorData = await shopifyResponse.json();
      throw new Error(`Shopify API error: ${JSON.stringify(errorData)}`);
    }
    
    const result = await shopifyResponse.json();
    
    // Return success with the uploaded image data
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Image uploaded successfully',
        image: result.image
      })
    };
  } catch (error) {
    console.error('Error uploading image to Shopify:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
}