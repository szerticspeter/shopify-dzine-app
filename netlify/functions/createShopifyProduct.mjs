import fetch from 'node-fetch';

/**
 * Netlify function to create a Shopify product with an image
 * Uses environment variables for authentication
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
    const { title, description, price, imageUrl } = JSON.parse(event.body);
    
    // Log request for debugging
    console.log('Creating product with:', { title, price, imageUrl: imageUrl.substring(0, 50) + '...' });
    
    // Validate required parameters
    if (!title || !price || !imageUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: title, price, and imageUrl are required' })
      };
    }

    // Get environment variables
    const shopDomain = process.env.REACT_APP_SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    
    if (!shopDomain || !accessToken) {
      console.error('Missing environment variables:', { 
        hasDomain: !!shopDomain, 
        hasToken: !!accessToken 
      });
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing Shopify credentials in environment variables' })
      };
    }
    
    console.log('Using Shopify domain:', shopDomain);

    // Step 1: Create the product first
    const productResponse = await createShopifyProduct(shopDomain, accessToken, {
      title,
      body_html: description || '',
      vendor: 'Dzine.ai App',
      product_type: 'Custom Design',
      variants: [
        {
          price: price,
          inventory_management: 'shopify',
          inventory_quantity: 10
        }
      ]
    });

    // Step 2: If product created successfully, attach the image
    if (productResponse && productResponse.product && productResponse.product.id) {
      const productId = productResponse.product.id;
      
      try {
        // Handle base64 data URLs directly
        let imageData;
        
        if (imageUrl.startsWith('data:')) {
          // It's a Data URL (e.g., from canvas.toDataURL())
          console.log("Processing data URL as base64 image");
          // Extract the base64 part
          const base64Data = imageUrl.split(',')[1];
          
          // Upload image to Shopify using base64 data
          const imageResponse = await attachBase64ImageToProduct(
            shopDomain, 
            accessToken, 
            productId, 
            base64Data,
            `dzine-custom-design-${Date.now()}.png`
          );
          
          // Return success with product and image data
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              product: productResponse.product,
              image: imageResponse.image
            })
          };
        } else {
          // It's a regular URL, use the original method
          const imageResponse = await attachImageToProduct(shopDomain, accessToken, productId, imageUrl);
          
          // Return success with product and image data
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              product: productResponse.product,
              image: imageResponse.image
            })
          };
        }
      } catch (imageError) {
        console.error("Error attaching image:", imageError);
        
        // Even if image upload fails, return product data
        return {
          statusCode: 201, // Created, but with warning
          headers,
          body: JSON.stringify({
            product: productResponse.product,
            warning: "Product created but image could not be attached: " + imageError.message
          })
        };
      }
    } else {
      throw new Error('Failed to create product');
    }
  } catch (error) {
    console.error('Error creating Shopify product:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
}

/**
 * Create a new product in Shopify
 */
async function createShopifyProduct(shopDomain, accessToken, productData) {
  const url = `https://${shopDomain}/admin/api/2023-07/products.json`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken
    },
    body: JSON.stringify({ product: productData })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Shopify API error: ${JSON.stringify(errorData)}`);
  }
  
  return await response.json();
}

/**
 * Attach an image to a Shopify product using a URL
 */
async function attachImageToProduct(shopDomain, accessToken, productId, imageUrl) {
  const url = `https://${shopDomain}/admin/api/2023-07/products/${productId}/images.json`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken
    },
    body: JSON.stringify({
      image: {
        src: imageUrl,
        alt: 'Custom design created with Dzine.ai'
      }
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Shopify API error: ${JSON.stringify(errorData)}`);
  }
  
  return await response.json();
}

/**
 * Attach an image to a Shopify product using base64 data
 */
async function attachBase64ImageToProduct(shopDomain, accessToken, productId, base64Data, filename) {
  const url = `https://${shopDomain}/admin/api/2023-07/products/${productId}/images.json`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken
    },
    body: JSON.stringify({
      image: {
        attachment: base64Data,
        filename: filename,
        alt: 'Custom design created with Dzine.ai'
      }
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Shopify API error: ${JSON.stringify(errorData)}`);
  }
  
  return await response.json();
}