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
    // For a simple implementation, we'll simulate saving to an image hosting service
    // In a real implementation, you would use Cloudinary, AWS S3, or another storage service
    
    // Here we'll simply return a mock URL
    // In a real implementation, you would upload the image and get a real URL back
    const mockImageId = `edited-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const mockImageUrl = `https://dzine-ai-mockup.netlify.app/edited-images/${mockImageId}.png`;
    
    console.log("Generated mock image URL:", mockImageUrl);
    
    // For demonstration purposes, we're returning a mock URL
    // In a real implementation, you would replace this with an actual upload
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        imageUrl: mockImageUrl,
        message: "Image saved successfully (mock implementation)"
      })
    };
  } catch (error) {
    console.error("Error saving image:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
}