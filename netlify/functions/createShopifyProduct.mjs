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

    // Log all environment variables for debugging (excluding sensitive values)
    console.log('Available environment variables:', 
      Object.keys(process.env)
        .filter(key => !key.toLowerCase().includes('token') && !key.toLowerCase().includes('secret'))
        .join(', ')
    );
    
    // Get environment variables - try multiple possible naming conventions
    let shopDomain = process.env.REACT_APP_SHOPIFY_STORE_DOMAIN || 
                     process.env.SHOPIFY_STORE_DOMAIN ||
                     process.env.SHOPIFY_DOMAIN;
    
    // Check for authentication credentials - we support two methods:
    // 1. Single access token
    // 2. API key + API secret                 
    let accessToken = process.env.SHOPIFY_ACCESS_TOKEN || 
                      process.env.SHOPIFY_API_TOKEN ||
                      process.env.SHOPIFY_API_ACCESS_TOKEN;
    
    let apiKey = process.env.REACT_APP_SHOPIFY_API_KEY || 
                process.env.SHOPIFY_API_KEY;
                
    let apiSecret = process.env.REACT_APP_SHOPIFY_API_SECRET || 
                   process.env.SHOPIFY_API_SECRET;
    
    // Store auth credentials for use in helper functions
    global.shopifyAuth = {
      accessToken,
      apiKey,
      apiSecret
    };
    
    // Log the environment variables we found (without values)
    console.log('Shopify environment variable check:', { 
      'Domain variables': {
        'REACT_APP_SHOPIFY_STORE_DOMAIN': !!process.env.REACT_APP_SHOPIFY_STORE_DOMAIN,
        'SHOPIFY_STORE_DOMAIN': !!process.env.SHOPIFY_STORE_DOMAIN,
        'SHOPIFY_DOMAIN': !!process.env.SHOPIFY_DOMAIN,
        'Using value': shopDomain
      },
      'Auth variables': {
        'Has Access Token': !!accessToken,
        'Has API Key': !!apiKey,
        'Has API Secret': !!apiSecret,
        'Auth Method': accessToken ? 'Using access token' : (apiKey && apiSecret ? 'Using API key + secret' : 'No valid auth method')
      }
    });
    
    // Check if we have a domain and at least one auth method
    const hasValidAuth = accessToken || (apiKey && apiSecret);
    
    if (!shopDomain || !hasValidAuth) {
      console.error('Missing environment variables:', { 
        hasDomain: !!shopDomain, 
        hasAccessToken: !!accessToken,
        hasApiKeyAndSecret: !!(apiKey && apiSecret)
      });
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Missing Shopify credentials in environment variables',
          missingDomain: !shopDomain,
          missingAuth: !hasValidAuth,
          availableVars: Object.keys(process.env)
            .filter(key => key.includes('SHOPIFY') || key.includes('REACT_APP_SHOPIFY'))
            .filter(key => !key.toLowerCase().includes('token') && !key.toLowerCase().includes('secret') && !key.toLowerCase().includes('key'))
        })
      };
    }
    
    // Make sure the domain doesn't have the protocol
    if (shopDomain.includes('https://') || shopDomain.includes('http://')) {
      shopDomain = shopDomain.replace(/https?:\/\//, '');
      console.log('Removed protocol from domain:', shopDomain);
    }
    
    // Make sure the domain doesn't have admin path
    if (shopDomain.includes('/admin')) {
      shopDomain = shopDomain.replace(/\/admin.*$/, '');
      console.log('Removed admin path from domain:', shopDomain);
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
  try {
    console.log('Creating new Shopify product with title:', productData.title);
    
    // Make API version configurable with a fallback
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2023-07';
    const url = `https://${shopDomain}/admin/api/${apiVersion}/products.json`;
    
    console.log(`Making request to: ${url}`);
    
    // Verify the product data is valid
    if (!productData.title) {
      throw new Error('Product title is required');
    }
    
    if (!productData.variants || productData.variants.length === 0 || !productData.variants[0].price) {
      console.warn('WARNING: Product variants may be incomplete:', JSON.stringify(productData.variants));
    }
    
    // Determine which authentication method to use
    let authHeaders = {};
    
    // First try the passed accessToken (for backward compatibility)
    if (accessToken) {
      console.log('Using provided access token authentication');
      authHeaders = {
        'X-Shopify-Access-Token': accessToken
      };
    } 
    // Then try the global auth object we created earlier
    else if (global.shopifyAuth) {
      if (global.shopifyAuth.accessToken) {
        // Method 1: Access Token Authentication
        console.log('Using global access token authentication');
        authHeaders = {
          'X-Shopify-Access-Token': global.shopifyAuth.accessToken
        };
      } else if (global.shopifyAuth.apiKey && global.shopifyAuth.apiSecret) {
        // Method 2: API Key + Secret Authentication
        console.log('Using global API key and secret authentication');
        const authString = Buffer.from(`${global.shopifyAuth.apiKey}:${global.shopifyAuth.apiSecret}`).toString('base64');
        authHeaders = {
          'Authorization': `Basic ${authString}`
        };
      }
    }
    
    if (Object.keys(authHeaders).length === 0) {
      throw new Error('No valid authentication method available');
    }
    
    console.log('Using auth headers:', Object.keys(authHeaders));
    
    // Create the product
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ product: productData })
    });
    
    if (!response.ok) {
      // Try to get error response as JSON
      let errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
        console.error('Shopify API error details:', JSON.stringify(errorData));
      } catch (e) {
        // If parsing as JSON fails, use the raw text
        console.error('Shopify API error (raw):', errorText);
        errorData = { errors: `Status ${response.status}: ${errorText.substring(0, 100)}...` };
      }
      
      throw new Error(`Shopify API error: ${JSON.stringify(errorData)}`);
    }
    
    const result = await response.json();
    console.log('Successfully created Shopify product with ID:', result.product?.id);
    return result;
  } catch (error) {
    console.error('Error creating Shopify product:', error.message);
    throw error;
  }
}

/**
 * Attach an image to a Shopify product using a URL
 */
async function attachImageToProduct(shopDomain, accessToken, productId, imageUrl) {
  try {
    console.log(`Attaching image from URL to product ${productId}`);
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2023-07';
    const url = `https://${shopDomain}/admin/api/${apiVersion}/products/${productId}/images.json`;
    console.log(`Making request to: ${url}`);
    
    // For URL-based uploads, the URL must be publicly accessible
    if (imageUrl.startsWith('http://localhost') || imageUrl.startsWith('file://')) {
      console.warn('WARNING: Image URL is a local URL which Shopify cannot access');
    }
    
    const imageData = {
      image: {
        src: imageUrl,
        alt: 'Custom design created with Dzine.ai'
      }
    };
    
    console.log(`Using image URL: ${imageUrl.substring(0, 50)}...`);
    
    // Determine which authentication method to use
    let authHeaders = {};
    
    // First try the passed accessToken (for backward compatibility)
    if (accessToken) {
      console.log('Using provided access token authentication');
      authHeaders = {
        'X-Shopify-Access-Token': accessToken
      };
    } 
    // Then try the global auth object we created earlier
    else if (global.shopifyAuth) {
      if (global.shopifyAuth.accessToken) {
        // Method 1: Access Token Authentication
        console.log('Using global access token authentication');
        authHeaders = {
          'X-Shopify-Access-Token': global.shopifyAuth.accessToken
        };
      } else if (global.shopifyAuth.apiKey && global.shopifyAuth.apiSecret) {
        // Method 2: API Key + Secret Authentication
        console.log('Using global API key and secret authentication');
        const authString = Buffer.from(`${global.shopifyAuth.apiKey}:${global.shopifyAuth.apiSecret}`).toString('base64');
        authHeaders = {
          'Authorization': `Basic ${authString}`
        };
      }
    }
    
    if (Object.keys(authHeaders).length === 0) {
      throw new Error('No valid authentication method available');
    }
    
    console.log('Using auth headers for image upload:', Object.keys(authHeaders));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(imageData)
    });
    
    if (!response.ok) {
      // Try to get error response as JSON
      let errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
        console.error('Shopify API error details:', JSON.stringify(errorData));
      } catch (e) {
        // If parsing as JSON fails, use the raw text
        console.error('Shopify API error (raw):', errorText);
        errorData = { errors: `Status ${response.status}: ${errorText.substring(0, 100)}...` };
      }
      
      throw new Error(`Shopify API error: ${JSON.stringify(errorData)}`);
    }
    
    const result = await response.json();
    console.log('Successfully attached image URL to product');
    return result;
  } catch (error) {
    console.error('Error attaching image URL to product:', error.message);
    throw error;
  }
}

/**
 * Attach an image to a Shopify product using base64 data
 */
async function attachBase64ImageToProduct(shopDomain, accessToken, productId, base64Data, filename) {
  try {
    // Check if base64 data is too large (Shopify has limits)
    const dataSizeInBytes = Math.ceil((base64Data.length / 4) * 3);
    const dataSizeInMB = dataSizeInBytes / (1024 * 1024);
    console.log(`Image size: ${dataSizeInMB.toFixed(2)}MB`);
    
    // If larger than 20MB, Shopify might reject it
    if (dataSizeInMB > 20) {
      console.warn('WARNING: Image is larger than 20MB, Shopify may reject it');
    }
    
    // Attempt to compress very large images
    let finalBase64Data = base64Data;
    if (dataSizeInMB > 8) {
      console.log('Image is large, treating as potentially problematic');
    }
    
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2023-07';
    const url = `https://${shopDomain}/admin/api/${apiVersion}/products/${productId}/images.json`;
    console.log(`Making request to: ${url}`);
    
    const imageData = {
      image: {
        attachment: finalBase64Data,
        filename: filename,
        alt: 'Custom design created with Dzine.ai'
      }
    };
    
    // Log request size without showing actual image data
    console.log(`Request body size: ${JSON.stringify(imageData).length - finalBase64Data.length + 100}B + image data`);
    
    // Determine which authentication method to use
    let authHeaders = {};
    
    // First try the passed accessToken (for backward compatibility)
    if (accessToken) {
      console.log('Using provided access token authentication');
      authHeaders = {
        'X-Shopify-Access-Token': accessToken
      };
    } 
    // Then try the global auth object we created earlier
    else if (global.shopifyAuth) {
      if (global.shopifyAuth.accessToken) {
        // Method 1: Access Token Authentication
        console.log('Using global access token authentication');
        authHeaders = {
          'X-Shopify-Access-Token': global.shopifyAuth.accessToken
        };
      } else if (global.shopifyAuth.apiKey && global.shopifyAuth.apiSecret) {
        // Method 2: API Key + Secret Authentication
        console.log('Using global API key and secret authentication');
        const authString = Buffer.from(`${global.shopifyAuth.apiKey}:${global.shopifyAuth.apiSecret}`).toString('base64');
        authHeaders = {
          'Authorization': `Basic ${authString}`
        };
      }
    }
    
    if (Object.keys(authHeaders).length === 0) {
      throw new Error('No valid authentication method available');
    }
    
    console.log('Using auth headers for base64 image upload:', Object.keys(authHeaders));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(imageData)
    });
    
    if (!response.ok) {
      // Try to get error response as JSON
      let errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
        console.error('Shopify API error details:', JSON.stringify(errorData));
      } catch (e) {
        // If parsing as JSON fails, use the raw text
        console.error('Shopify API error (raw):', errorText);
        errorData = { errors: `Status ${response.status}: ${errorText.substring(0, 100)}...` };
      }
      
      throw new Error(`Shopify API error: ${JSON.stringify(errorData)}`);
    }
    
    const result = await response.json();
    console.log('Successfully attached image to product');
    return result;
  } catch (error) {
    console.error('Error attaching base64 image to product:', error.message);
    throw error;
  }
}