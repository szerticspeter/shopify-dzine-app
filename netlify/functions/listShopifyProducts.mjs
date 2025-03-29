import fetch from 'node-fetch';

/**
 * Netlify function to list Shopify products and their variants
 * Uses environment variables for authentication
 */
export async function handler(event, context) {
  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
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

    // Get the API version from environment or use default
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2023-07';
    
    // Build the URL for listing products
    const url = `https://${shopDomain}/admin/api/${apiVersion}/products.json?limit=10`;
    console.log(`Making API request to: ${url}`);
    
    // Determine which authentication method to use
    let authHeaders = {};
    
    if (accessToken) {
      // Method 1: Access Token Authentication
      console.log('Using access token authentication');
      authHeaders = {
        'X-Shopify-Access-Token': accessToken
      };
    } else if (apiKey && apiSecret) {
      // Method 2: API Key + Secret Authentication
      console.log('Using API key and secret authentication');
      const authString = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
      authHeaders = {
        'Authorization': `Basic ${authString}`
      };
    } else {
      throw new Error('No valid authentication method available');
    }
    
    // Make the request to Shopify API
    console.log('Using auth headers:', Object.keys(authHeaders));
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      }
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
      
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: 'Failed to fetch products from Shopify',
          details: errorData
        })
      };
    }
    
    // Parse the response data
    const data = await response.json();
    console.log(`Retrieved ${data.products?.length || 0} products`);
    
    // Format the product data to include important variant information
    const simplifiedProducts = data.products.map(product => ({
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
      created_at: product.created_at,
      admin_url: `https://${shopDomain}/admin/products/${product.id}`,
      storefront_url: `https://${shopDomain}/products/${product.handle}`,
      variants: product.variants.map(variant => ({
        id: variant.id,
        title: variant.title,
        price: variant.price,
        sku: variant.sku,
        checkout_url: `https://${shopDomain}/cart/${variant.id}:1?checkout=direct`,
        cart_url: `https://${shopDomain}/cart/${variant.id}:1`
      })),
      images: product.images ? product.images.map(image => ({
        id: image.id,
        src: image.src,
        position: image.position
      })) : []
    }));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        products: simplifiedProducts,
        count: simplifiedProducts.length,
        shop: shopDomain
      })
    };
  } catch (error) {
    console.error('Error fetching Shopify products:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error fetching Shopify products',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
}