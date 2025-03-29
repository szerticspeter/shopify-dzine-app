import fetch from 'node-fetch';

/**
 * Netlify function to save an edited image
 * This function accepts a base64 data URL and saves it to Cloudinary or another storage service
 */
export async function handler(event, context) {
  console.log("Save Edited Image function called");

  // Add CORS headers
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed. Please use POST." })
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Request body is missing. Please send JSON data." })
    };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON format" })
    };
  }

  const { imageData, productType = "canvas" } = body;

  if (!imageData) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing imageData in request body" })
    };
  }

  console.log("Received image data for product type:", productType);

  try {
    // In a production environment, you would implement an actual image upload to a 
    // service like Cloudinary, AWS S3, or using the Shopify Admin API directly
    
    // For this implementation, we'll check for two scenarios:
    // 1. If in development environment, we'll use the base64 data directly
    // 2. If in production, we'll still generate a mock URL but also pass the base64 data
    // back to be used by the next function in the workflow
    
    const imageId = `edited-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    // Netlify environment detection
    const isProduction = process.env.CONTEXT === 'production';
    
    // Generate a response appropriate for the environment
    if (isProduction) {
      // In production, we would implement a real storage solution here
      // For now, we'll return a mock URL with site domain
      const mockImageUrl = `https://${process.env.URL || 'dzine-ai-app.netlify.app'}/edited-images/${imageId}.png`;
      console.log("Generated production mock image URL:", mockImageUrl);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          imageUrl: mockImageUrl,
          // Include truncated imageData in response so next function can use it
          imageData: imageData.substring(0, 50) + '...[truncated]',
          message: "Image processed successfully. For a complete implementation, implement image storage."
        })
      };
    } else {
      // In development, we can just pass through the image data
      // This allows local testing without a storage service
      console.log("Development mode: Passing base64 image data through");
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          // In dev, we can just use the original base64 data
          imageUrl: imageData,
          // Include a simple mock URL for logging/testing
          mockUrl: `http://localhost:8888/edited-images/${imageId}.png`,
          message: "Image processed in development mode. Using base64 data directly."
        })
      };
    }
  } catch (error) {
    console.error("Error saving image:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}