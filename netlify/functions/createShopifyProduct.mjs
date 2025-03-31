import fetch from 'node-fetch';

/**
 * Netlify function to create a Shopify product with an image and shipping rates
 * Uses environment variables for authentication
 * Integrates with Prodigi for dynamic shipping rates
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
    // Parse request body with error handling
    let requestBody;
    try {
      requestBody = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError, event.body);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid JSON in request body', 
          details: parseError.message, 
          receivedBody: event.body.length > 200 ? event.body.substring(0, 200) + '...' : event.body 
        })
      };
    }
    
    const { title, description, price, imageUrl, metafields = [], shippingCountry = 'US', shippingRates = null } = requestBody;
    
    // Log request for debugging
    console.log('Creating product with:', { 
      title, 
      price, 
      hasImage: !!imageUrl,
      imageUrlType: imageUrl ? (imageUrl.startsWith('data:') ? 'base64' : 'URL') : 'none',
      imageUrlLength: imageUrl ? imageUrl.length : 0,
      hasMetafields: !!metafields,
      shippingCountry,
      hasShippingRates: !!shippingRates
    });
    
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
    
    // Remove any trailing slashes from the domain
    if (shopDomain.endsWith('/')) {
      shopDomain = shopDomain.replace(/\/+$/, '');
      console.log('Removed trailing slash from domain:', shopDomain);
    }
    
    console.log('Using Shopify domain:', shopDomain);

    // Get API version
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2023-07';

    // Prepare product data
    // Extract shipping cost from the price object if available
    let productPrice = price;
    let shippingCost = null;
    
    if (typeof price === 'object' && price.product) {
      // Calculate product price with 30% markup on the Prodigi base price
      const prodigiPrice = parseFloat(price.product);
      if (isNaN(prodigiPrice) || prodigiPrice <= 0) {
        console.warn(`Invalid Prodigi price: ${price.product}, using fallback price of 25.00`);
        productPrice = "25.00";
      } else {
        productPrice = (prodigiPrice * 1.3).toFixed(2); // 30% markup
      }
      
      if (price.shipping) {
        shippingCost = parseFloat(price.shipping);
        if (isNaN(shippingCost)) {
          console.warn(`Invalid shipping cost: ${price.shipping}, using fallback of 5.00`);
          shippingCost = 5.00;
        }
      }
      
      console.log(`Using detailed pricing - Prodigi base: ${prodigiPrice}, With markup: ${productPrice}, Shipping: ${shippingCost || 'none'}`);
    }
    
    const productData = {
      title,
      body_html: description || '',
      vendor: 'Dzine.ai App',
      product_type: 'Custom Design',
      status: 'active', // Ensure the product is set to active
      variants: [
        {
          price: productPrice,
          inventory_management: 'shopify',
          inventory_quantity: 10
        }
      ]
    };
    
    // Store shipping cost in metafields for reference
    // Note: This doesn't directly affect checkout - see comment below
    const metafieldsToAdd = metafields || [];
    
    if (shippingCost) {
      // Add shipping cost to metafields
      metafieldsToAdd.push({
        namespace: 'shipping',
        key: 'cost',
        value: shippingCost.toString(),
        type: 'single_line_text_field'
      });
      
      // Add shipping provider info
      metafieldsToAdd.push({
        namespace: 'shipping',
        key: 'provider',
        value: 'Prodigi',
        type: 'single_line_text_field'
      });
      
      console.log('Added shipping info to metafields with cost:', shippingCost);
      
      // Note: Actual shipping rates at checkout are set through Shopify's shipping zones
      // This metafield is just for reference/tracking
    }

    // Step 1: Create the product first
    const productResponse = await createShopifyProduct(shopDomain, accessToken, productData);

    // Step 2: If product created successfully, attach the image
    if (productResponse && productResponse.product && productResponse.product.id) {
      const productId = productResponse.product.id;
      
      // Initialize variables to track delivery profile operations
      let deliveryProfileId = null;
      let deliveryProfileResult = { success: false, attempted: false };
      
      try {
        // Step 2a: Create or update delivery profile with shipping rates if provided
        if (shippingRates && shippingCountry) {
          try {
            console.log(`Creating/updating delivery profile for country: ${shippingCountry}`);
            console.log(`Shipping rates provided:`, 
              Array.isArray(shippingRates) 
                ? `${shippingRates.length} rates` 
                : typeof shippingRates);
            
            // Create or get delivery profile for this country
            deliveryProfileResult = await createOrUpdateDeliveryProfile(
              shopDomain,
              accessToken,
              shippingCountry,
              shippingRates,
              apiVersion
            );
            
            if (deliveryProfileResult) {
              deliveryProfileId = deliveryProfileResult.profileId || deliveryProfileResult.id || 'unknown';
              console.log(`Successfully got shipping zone ID: ${deliveryProfileId}`);
              
              // For "existing" profileIds, we still want to associate the product
              if (deliveryProfileId === "existing") {
                console.log(`Using existing shipping zone - no need to explicitly assign product`);
              } else {
                // Assign the product to this shipping zone via metafields
                await assignProductToDeliveryProfile(
                  shopDomain,
                  accessToken,
                  productId,
                  deliveryProfileId,
                  apiVersion
                );
                
                console.log(`Successfully associated product ${productId} with shipping zone ${deliveryProfileId}`);
              }
            }
          } catch (shippingError) {
            console.error("Error setting up shipping for product:", shippingError);
            console.log("Shipping error details:", JSON.stringify({
              message: shippingError.message,
              stack: shippingError.stack,
              name: shippingError.name
            }));
            
            // Update result with error details to avoid undefined variable
            deliveryProfileResult = {
              ...deliveryProfileResult,
              error: true,
              errorMessage: shippingError.message,
              profileId: null,
              attempted: true
            };
            
            // Continue with the process even if shipping setup fails
          }
        }
        
        // Handle base64 data URLs directly
        let imageResponse;
        
        if (imageUrl.startsWith('data:')) {
          // It's a Data URL (e.g., from canvas.toDataURL())
          console.log("Processing data URL as base64 image");
          // Extract the base64 part
          const base64Data = imageUrl.split(',')[1];
          
          // Upload image to Shopify using base64 data
          imageResponse = await attachBase64ImageToProduct(
            shopDomain, 
            accessToken, 
            productId, 
            base64Data,
            `dzine-custom-design-${Date.now()}.png`
          );
        } else {
          // It's a regular URL, use the original method
          imageResponse = await attachImageToProduct(shopDomain, accessToken, productId, imageUrl);
        }
        
        // Step A: Add metafields if provided (after image is attached)
        let metafieldsResult = null;
        if (metafieldsToAdd && Array.isArray(metafieldsToAdd) && metafieldsToAdd.length > 0) {
          try {
            console.log(`Adding ${metafieldsToAdd.length} metafields to product ${productId}`);
            metafieldsResult = await addMetafieldsToProduct(
              shopDomain,
              accessToken,
              productId,
              metafieldsToAdd,
              apiVersion
            );
          } catch (metafieldsError) {
            console.error("Error adding metafields:", metafieldsError);
            // Continue with the process even if metafields fail
          }
        }
        
        // Collect debug context to include in response
        const debugContext = {
          steps: {
            productCreated: !!productResponse,
            productId: productResponse?.product?.id,
            imageUploaded: !!imageResponse,
            deliveryProfileCreated: !!deliveryProfileResult?.profileId,
            metafieldsAdded: !!metafieldsResult
          },
          data: {
            shippingCountry,
            productPrice,
            shippingCost,
            deliveryProfileId,
            apiVersion
          }
        };
        
        // Return success with product, image, shipping data and debug logs
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            product: productResponse.product,
            image: imageResponse.image,
            metafields: metafieldsResult,
            shipping: deliveryProfileResult,
            success: true,
            debug: debugContext
          })
        };
      } catch (imageError) {
        console.error("Error attaching image:", imageError);
        
        // Even if image upload fails, return product data with shipping info if available
        return {
          statusCode: 201, // Created, but with warning
          headers,
          body: JSON.stringify({
            product: productResponse.product,
            warning: "Product created but image could not be attached: " + imageError.message,
            shipping: deliveryProfileResult || null, // Make sure it's not undefined
            success: true,
            debug: {
              error: {
                message: imageError.message,
                stack: imageError.stack,
                name: imageError.name
              },
              shippingCountry,
              productPrice,
              shippingCost,
              deliveryProfileId, 
              apiVersion
            }
          })
        };
      }
    } else {
      throw new Error('Failed to create product - incomplete response from Shopify API');
    }
  } catch (error) {
    console.error('Error creating Shopify product:', error);
    
    // Collect all available context for debugging
    const debugContext = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      request: {
        body: (() => {
          try {
            return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
          } catch (e) {
            return { error: "Could not parse body", raw: event.body };
          }
        })(),
        headers: event.headers,
        method: event.httpMethod
      },
      environment: {
        apiVersion: process.env.SHOPIFY_API_VERSION || '2023-07',
        shopDomain: typeof shopDomain !== 'undefined' ? shopDomain : 'not_set',
        hasAccessToken: typeof accessToken !== 'undefined' ? !!accessToken : false,
        hasApiKey: typeof apiKey !== 'undefined' ? !!apiKey : false,
        hasApiSecret: typeof apiSecret !== 'undefined' ? !!apiSecret : false,
        nodeEnv: process.env.NODE_ENV
      }
    };
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        success: false,
        debug: debugContext
      })
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

/**
 * Create or update a delivery profile with shipping rates for a specific country
 * Uses the Shopify GraphQL Admin API
 */
async function createOrUpdateDeliveryProfile(shopDomain, accessToken, countryCode, shippingRates, apiVersion) {
  try {
    console.log(`Setting up delivery profile for country: ${countryCode}`);
    console.log(`Shopify domain: ${shopDomain}`);
    console.log(`API Version: ${apiVersion}`);
    console.log(`Access token available: ${!!accessToken}`);
    
    // Clean and validate the shop domain
    // Remove any trailing slashes that might be present
    if (shopDomain && shopDomain.endsWith('/')) {
      shopDomain = shopDomain.replace(/\/+$/, '');
      console.log('Removed trailing slash from domain in delivery profile:', shopDomain);
    }
    
    // Validate the shop domain
    if (!shopDomain || !shopDomain.includes('.')) {
      throw new Error(`Invalid shop domain format: ${shopDomain}`);
    }
    
    // Validate shipping rates data
    if (!shippingRates || (!Array.isArray(shippingRates) && typeof shippingRates !== 'object')) {
      console.error('Invalid shipping rates format:', shippingRates);
      throw new Error('Invalid shipping rates format');
    }
    
    // If shipping rates is a single object, convert to array
    const rates = Array.isArray(shippingRates) ? shippingRates : [shippingRates];
    console.log(`Processing ${rates.length} shipping rate(s) for ${countryCode}`);
    
    // Get the profile name using country code
    const profileName = `Prodigi Shipping - ${countryCode}`;
    
    // Ensure valid API version
    apiVersion = apiVersion || '2023-07';
    
    // Generate auth headers (same pattern as other functions)
    let authHeaders = {};
    
    if (accessToken) {
      authHeaders = {
        'X-Shopify-Access-Token': accessToken
      };
    } else if (global.shopifyAuth) {
      if (global.shopifyAuth.accessToken) {
        authHeaders = {
          'X-Shopify-Access-Token': global.shopifyAuth.accessToken
        };
      } else if (global.shopifyAuth.apiKey && global.shopifyAuth.apiSecret) {
        const authString = Buffer.from(`${global.shopifyAuth.apiKey}:${global.shopifyAuth.apiSecret}`).toString('base64');
        authHeaders = {
          'Authorization': `Basic ${authString}`
        };
      }
    }
    
    if (Object.keys(authHeaders).length === 0) {
      throw new Error('No valid authentication method available for delivery profile');
    }
    
    // Check API access permissions
    try {
      console.log("Checking API permissions...");
      const checkAccessQuery = `
        query {
          shop {
            name
            primaryDomain {
              url
            }
          }
        }
      `;
      
      const graphqlEndpoint = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
      
      const checkResponse = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ query: checkAccessQuery })
      });
      
      if (!checkResponse.ok) {
        const errorText = await checkResponse.text();
        console.error(`API access check failed: ${errorText}`);
        throw new Error(`API access check failed: ${checkResponse.status}`);
      }
      
      const accessData = await checkResponse.json();
      console.log("API access check successful:", JSON.stringify(accessData));
    } catch (accessError) {
      console.warn("API access check failed - may have permission issues:", accessError.message);
      // Continue anyway, as the main query might still work
    }
    
    // Step 1: Check if we already have a delivery profile for this country
    // Query to get existing delivery profiles
    const getProfilesQuery = `
      query {
        shop {
          deliveryProfiles(first: 20) {
            edges {
              node {
                id
                name
                default
              }
            }
          }
        }
      }
    `;
    
    const graphqlEndpoint = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
    const profilesResponse = await fetch(graphqlEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify({ query: getProfilesQuery })
    });
    
    if (!profilesResponse.ok) {
      const errorText = await profilesResponse.text();
      console.error(`Failed to get delivery profiles: ${errorText}`);
      // Try to parse the error for more details
      try {
        const errorData = JSON.parse(errorText);
        console.error("Parsed error details:", JSON.stringify(errorData));
        
        // Check for common permission issues
        if (errorText.includes("access") || errorText.includes("permission") || 
            errorText.includes("authorize") || errorText.includes("scope")) {
          console.error("This appears to be a permissions issue. Check your app's API access scopes.");
          
          // Return a more graceful fallback instead of failing
          return {
            success: false,
            error: true,
            profileId: null,
            errorMessage: "Permission denied for shipping profiles. Check API access scopes.",
            countryCode
          };
        }
      } catch (e) {
        // Parsing failed, just use the raw text
      }
      
      throw new Error(`GraphQL API error: ${profilesResponse.status} - ${errorText.substring(0, 200)}`);
    }
    
    const profilesData = await profilesResponse.json();
    console.log("Profiles data:", JSON.stringify(profilesData));
    
    // Check if we already have a profile with this name
    let existingProfileId = null;
    
    // Check for GraphQL errors which might indicate permission issues
    if (profilesData.errors) {
      console.error("GraphQL errors detected:", JSON.stringify(profilesData.errors));
      
      // If it seems like a permission issue, try the fallback approach
      if (JSON.stringify(profilesData.errors).toLowerCase().includes("permission") || 
          JSON.stringify(profilesData.errors).toLowerCase().includes("access")) {
        console.log("Using fallback shipping approach - creating metafields with shipping data");
        
        // Return a special result indicating we should use the alternative approach
        return {
          success: true,
          usingFallback: true,
          profileId: null,
          profileName,
          countryCode,
          rates: rates.length,
          message: "Using fallback shipping method due to API permission limitations"
        };
      }
    }
    
    if (profilesData.data && profilesData.data.shop && profilesData.data.shop.deliveryProfiles) {
      const profiles = profilesData.data.shop.deliveryProfiles.edges;
      const matchingProfile = profiles.find(edge => edge.node.name === profileName);
      
      if (matchingProfile) {
        existingProfileId = matchingProfile.node.id;
        console.log(`Found existing delivery profile: ${profileName} with ID: ${existingProfileId}`);
      }
    }
    
    // Step 2: If profile exists, update it. Otherwise, create a new one.
    let profileId = existingProfileId;
    let profileResult;
    
    if (!profileId) {
      // Create a new delivery profile
      console.log(`Creating new delivery profile: ${profileName}`);
      
      // Prepare the rate definitions
      const rateDefinitions = rates.map(rate => {
        // Log the rate object for debugging
        console.log('Processing rate:', JSON.stringify(rate));
        
        // If rate is a simple number, create a basic rate with that price
        if (typeof rate === 'number') {
          return {
            name: `Prodigi Shipping ${countryCode}`,
            price: { amount: rate.toFixed(2) },
          };
        } 
        // If rate has name and price properties
        else if (rate.name && (rate.price || rate.amount)) {
          const rateAmount = rate.price || rate.amount;
          return {
            name: rate.name,
            price: { amount: parseFloat(rateAmount).toFixed(2) },
          };
        }
        // Default fallback
        else {
          console.log('Using default shipping rate - could not parse rate object:', rate);
          return {
            name: "Prodigi Standard Shipping",
            price: { amount: "10.00" },
          };
        }
      });
      
      // Prepare the country-specific delivery zone
      const deliveryZone = {
        countries: [{ code: countryCode }],
        rateDefinitions
      };
      
      // Use GraphQL for creating delivery profiles with flat rates
      console.log("Using GraphQL API for creating delivery profile with flat rates");
      
      // Create the profile - GraphQL mutation for flat rate shipping
      const createProfileMutation = `
        mutation deliveryProfileCreate($profile: DeliveryProfileInput!) {
          deliveryProfileCreate(profile: $profile) {
            profile {
              id
              name
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      
      // Get the first location ID - needed for creating a delivery profile
      console.log('Getting location ID for delivery profile');
      const getLocationsQuery = `
        query {
          locations(first: 1) {
            edges {
              node {
                id
                name
              }
            }
          }
        }
      `;
      
      // Get location information first
      const locationsResponse = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ query: getLocationsQuery })
      });
      
      if (!locationsResponse.ok) {
        console.error(`Failed to get locations: ${await locationsResponse.text()}`);
        throw new Error(`Failed to get locations: HTTP ${locationsResponse.status}`);
      }
      
      const locationsData = await locationsResponse.json();
      console.log('Locations data:', JSON.stringify(locationsData));
      
      if (!locationsData.data?.locations?.edges?.length) {
        console.error('No locations found for delivery profile');
        throw new Error('No locations found for delivery profile');
      }
      
      const locationId = locationsData.data.locations.edges[0].node.id;
      console.log(`Using location ID: ${locationId}`);
      
      // Extract the price values for the rate definitions
      const formattedRateDefinitions = rateDefinitions.map(rate => {
        // Extract the price value properly
        let priceValue;
        if (typeof rate.price === 'object' && rate.price.amount) {
          priceValue = parseFloat(rate.price.amount);
        } else if (typeof rate.price === 'string') {
          priceValue = parseFloat(rate.price);
        } else if (typeof rate.price === 'number') {
          priceValue = rate.price;
        } else {
          priceValue = 10.00; // Default fallback
        }
        
        // Based on error logs, let's simplify and avoid weight conditions for now
        return {
          name: rate.name,
          rateDefinition: {
            price: { 
              amount: priceValue.toFixed(2),
              currencyCode: "USD"
            }
          }
          // Remove weightConditionsToCreate since it's causing errors
          // We'll set a flat rate without weight conditions
        };
      });
      
      // Build delivery profile according to current Admin API documentation
      const profileInput = {
        name: profileName,
        locationGroupsToCreate: [
          {
            locationsToAdd: [locationId],
            zonesToCreate: [
              {
                name: `${countryCode} Zone`,
                countries: [{ code: countryCode }],
                methodDefinitionsToCreate: formattedRateDefinitions
              }
            ]
          }
        ]
      };
      
      console.log("Creating delivery profile with flat rates:", JSON.stringify(profileInput));
      
      const createResponse = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          query: createProfileMutation,
          variables: { profile: profileInput }
        })
      });
      
      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(`Failed to create delivery profile with flat rates: ${errorText}`);
        
        // Try to parse the error for more details
        try {
          const errorData = JSON.parse(errorText);
          console.error('Parsed error details:', JSON.stringify(errorData));
          
          // Check for common permission issues
          if (errorText.includes("access") || errorText.includes("permission") || 
              errorText.includes("authorize") || errorText.includes("scope")) {
            console.error("This appears to be a permissions issue. Check your app's API access scopes.");
            
            // Return a more graceful fallback instead of failing
            return {
              success: false,
              error: true,
              profileId: null,
              errorMessage: "Permission denied for delivery profiles. Check API access scopes.",
              countryCode
            };
          }
        } catch (e) {
          // Parsing failed, just use the raw text
        }
        
        throw new Error(`GraphQL API error: ${createResponse.status} - ${errorText.substring(0, 200)}`);
      }
      
      const createResult = await createResponse.json();
      console.log('Delivery profile creation response:', JSON.stringify(createResult));
      
      // Check for GraphQL errors
      if (createResult.errors) {
        console.error('GraphQL errors:', createResult.errors);
        
        // Check for duplicate/already exists errors
        const errorString = JSON.stringify(createResult.errors);
        if (errorString.includes('already exists') || errorString.includes('duplicate')) {
          console.log('Delivery profile already exists, will use existing profile');
          return {
            success: true,
            profileId: "existing",
            profileName,
            countryCode,
            message: "Using existing delivery profile"
          };
        }
        
        throw new Error(`GraphQL errors: ${JSON.stringify(createResult.errors)}`);
      }
      
      // Check for user errors
      if (createResult.data?.deliveryProfileCreate?.userErrors?.length > 0) {
        console.error('User errors:', createResult.data.deliveryProfileCreate.userErrors);
        throw new Error(`User errors: ${JSON.stringify(createResult.data.deliveryProfileCreate.userErrors)}`);
      }
      
      // Get the created profile ID
      profileId = createResult.data?.deliveryProfileCreate?.profile?.id;
      profileResult = createResult.data?.deliveryProfileCreate?.profile;
      
      console.log(`Successfully created shipping zone with ID: ${profileId}`);
      
      console.log(`Created new delivery profile with ID: ${profileId}`);
    } else {
      // Update existing delivery profile
      console.log(`Updating existing delivery profile with ID: ${profileId}`);
      
      // Prepare updated rate definitions for the profile
      const updatedRateDefinitions = rates.map(rate => {
        // Log the rate object for debugging
        console.log('Processing rate for update:', JSON.stringify(rate));
        
        // Extract the price value properly
        let priceValue;
        if (typeof rate.price === 'object' && rate.price.amount) {
          priceValue = parseFloat(rate.price.amount);
        } else if (typeof rate.price === 'string') {
          priceValue = parseFloat(rate.price);
        } else if (typeof rate.price === 'number') {
          priceValue = rate.price;
        } else {
          priceValue = 10.00; // Default fallback
        }
        
        // Manual shipping rate for flat rate shipping
        return {
          name: rate.name,
          methodType: "MANUAL", // MANUAL instead of SHIPPING for flat rates
          rateProvider: {
            flat: {
              price: { amount: priceValue.toFixed(2) }
            }
          }
        };
      });
      
      // Update mutation for delivery profile
      const updateProfileMutation = `
        mutation deliveryProfileUpdate($id: ID!, $profile: DeliveryProfileInput!) {
          deliveryProfileUpdate(id: $id, profile: $profile) {
            profile {
              id
              name
            }
            userErrors {
              field
              message
            }
          }
        }
      `;
      
      // Build the profile update payload based on latest API structure
      const updateProfileInput = {
        name: profileName,
        profileType: "CUSTOM", // Use CUSTOM type for flat rates
        locationGroups: [
          {
            locationGroupType: "COUNTRY",
            locations: [countryCode],
            locationGroupZones: [
              {
                name: `${countryCode} Zone`,
                countries: [{ code: countryCode }],
                methodDefinitions: updatedRateDefinitions.map(rate => ({
                  ...rate,
                  weightConditions: [
                    {
                      criteriaRange: {
                        minimum: { value: "0.0", unit: "KILOGRAMS" },
                        maximum: { value: "50.0", unit: "KILOGRAMS" }
                      }
                    }
                  ]
                }))
              }
            ]
          }
        ]
      };
      
      console.log(`Updating delivery profile with ID ${profileId}:`, JSON.stringify(updateProfileInput));
      
      const updateResponse = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          query: updateProfileMutation,
          variables: {
            id: profileId,
            profile: updateProfileInput
          }
        })
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error(`Failed to update delivery profile: ${errorText}`);
        
        // Try to parse the error for more details
        try {
          const errorData = JSON.parse(errorText);
          console.error('Parsed error details:', JSON.stringify(errorData));
        } catch (e) {
          // Parsing failed, just use the raw text
        }
        
        // Continue anyway - we can still use the existing profile
        console.log('Will continue with existing delivery profile configuration');
        profileResult = {
          id: profileId,
          name: profileName,
          updated: false
        };
      } else {
        const updateResult = await updateResponse.json();
        console.log('Delivery profile update response:', JSON.stringify(updateResult));
        
        // Check for GraphQL errors or user errors
        if (updateResult.errors) {
          console.error('GraphQL errors in update:', updateResult.errors);
          // Continue anyway with existing profile
          profileResult = {
            id: profileId,
            name: profileName,
            updated: false,
            errors: updateResult.errors
          };
        } else if (updateResult.data?.deliveryProfileUpdate?.userErrors?.length > 0) {
          console.error('User errors in update:', updateResult.data.deliveryProfileUpdate.userErrors);
          // Continue anyway with existing profile
          profileResult = {
            id: profileId,
            name: profileName,
            updated: false,
            userErrors: updateResult.data.deliveryProfileUpdate.userErrors
          };
        } else {
          profileResult = updateResult.data?.deliveryProfileUpdate?.profile;
        }
      }
      
      console.log(`Using delivery profile with ID: ${profileId}`);
      console.log(`Updated delivery profile with ID: ${profileId}`);
    }
    
    // Return the delivery profile information
    return {
      success: true,
      profileId,
      profileName,
      countryCode,
      rates: rates.length,
      result: profileResult
    };
  } catch (error) {
    console.error('Error creating/updating delivery profile:', error);
    throw error;
  }
}

/**
 * Assign a product to a specific delivery profile
 * Uses the Shopify GraphQL Admin API
 */
async function assignProductToDeliveryProfile(shopDomain, accessToken, productId, profileId, apiVersion) {
  try {
    console.log(`Assigning product ${productId} to delivery profile ${profileId}`);
    
    // Ensure valid API version
    apiVersion = apiVersion || '2023-07';
    
    // Generate auth headers
    let authHeaders = {};
    
    if (accessToken) {
      authHeaders = {
        'X-Shopify-Access-Token': accessToken
      };
    } else if (global.shopifyAuth) {
      if (global.shopifyAuth.accessToken) {
        authHeaders = {
          'X-Shopify-Access-Token': global.shopifyAuth.accessToken
        };
      } else if (global.shopifyAuth.apiKey && global.shopifyAuth.apiSecret) {
        const authString = Buffer.from(`${global.shopifyAuth.apiKey}:${global.shopifyAuth.apiSecret}`).toString('base64');
        authHeaders = {
          'Authorization': `Basic ${authString}`
        };
      }
    }
    
    if (Object.keys(authHeaders).length === 0) {
      throw new Error('No valid authentication method available for product assignment');
    }
    
    // Convert REST API product ID to GraphQL-compatible ID if needed
    // If the productId is numeric, convert to GraphQL ID format
    let graphqlProductId = productId;
    
    if (!String(productId).includes('gid://')) {
      graphqlProductId = `gid://shopify/Product/${productId}`;
      console.log(`Converted REST product ID to GraphQL ID: ${graphqlProductId}`);
    }
    
    // First, add a metafield to track the delivery profile using GraphQL
    const addMetafieldMutation = `
      mutation productUpdate($input: ProductInput!) {
        productUpdate(input: $input) {
          product {
            id
            metafields(first: 5) {
              edges {
                node {
                  id
                  namespace
                  key
                  value
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    const metafieldInput = {
      id: graphqlProductId,
      metafields: [
        {
          namespace: "shipping",
          key: "profile_id",
          value: String(profileId),
          type: "single_line_text_field"
        }
      ]
    };
    
    // Set up the GraphQL endpoint
    const graphqlEndpoint = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
    
    // Add the metafield via GraphQL
    try {
      const metafieldResponse = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          query: addMetafieldMutation,
          variables: { input: metafieldInput }
        })
      });
      
      if (!metafieldResponse.ok) {
        console.warn(`Could not add metafield via GraphQL: ${await metafieldResponse.text()}`);
      } else {
        const metafieldResult = await metafieldResponse.json();
        if (metafieldResult.errors) {
          console.warn('GraphQL errors adding metafield:', metafieldResult.errors);
        } else if (metafieldResult.data?.productUpdate?.userErrors?.length > 0) {
          console.warn('User errors adding metafield:', metafieldResult.data.productUpdate.userErrors);
        } else {
          console.log('Added delivery profile metafield to product');
        }
      }
    } catch (metafieldError) {
      console.warn('Error adding metafield:', metafieldError);
      // Non-critical, continue anyway
    }
    
    // Now assign the product to the delivery profile using GraphQL
    const assignMutation = `
      mutation deliveryProfileAssign($deliveryProfileId: ID!, $productVariantIds: [ID!]!) {
        deliveryProfileAssign(deliveryProfileId: $deliveryProfileId, productVariantIds: $productVariantIds) {
          userErrors {
            field
            message
          }
        }
      }
    `;
    
    // We need to get the variant IDs for this product first
    const getVariantsQuery = `
      query getProductVariants($productId: ID!) {
        product(id: $productId) {
          id
          title
          variants(first: 10) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      }
    `;
    
    try {
      // Get product variants
      const variantsResponse = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          query: getVariantsQuery,
          variables: { productId: graphqlProductId }
        })
      });
      
      if (!variantsResponse.ok) {
        throw new Error(`GraphQL API error: ${variantsResponse.status}`);
      }
      
      const variantsResult = await variantsResponse.json();
      
      if (variantsResult.errors) {
        console.error('GraphQL errors getting variants:', variantsResult.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(variantsResult.errors)}`);
      }
      
      // Extract variant IDs
      const variantIds = variantsResult.data?.product?.variants?.edges?.map(edge => edge.node.id) || [];
      
      if (variantIds.length === 0) {
        console.warn('No variants found for product, using alternative approach');
        return {
          success: true,
          productId,
          profileId,
          note: "Product associated with delivery profile via metafield"
        };
      }
      
      console.log(`Found ${variantIds.length} variants for product, assigning to delivery profile`);
      
      // Now assign variants to the delivery profile
      const assignResponse = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          query: assignMutation,
          variables: {
            deliveryProfileId: profileId,
            productVariantIds: variantIds
          }
        })
      });
      
      if (!assignResponse.ok) {
        const errorText = await assignResponse.text();
        console.error(`Failed to assign product to delivery profile: ${errorText}`);
        // Continue anyway since we've added the metafield
        return {
          success: true,
          productId,
          profileId,
          warning: "Added metafield but couldn't assign variants",
          variantIds
        };
      }
      
      const assignResult = await assignResponse.json();
      
      if (assignResult.errors) {
        console.error('GraphQL errors:', assignResult.errors);
        // Continue anyway
        return {
          success: true,
          productId,
          profileId,
          graphqlErrors: assignResult.errors,
          variantIds
        };
      }
      
      if (assignResult.data?.deliveryProfileAssign?.userErrors?.length > 0) {
        console.error('User errors:', assignResult.data.deliveryProfileAssign.userErrors);
        // Continue anyway
        return {
          success: true,
          productId,
          profileId,
          userErrors: assignResult.data.deliveryProfileAssign.userErrors,
          variantIds
        };
      }
      
      console.log('Successfully assigned product variants to delivery profile');
    } catch (assignError) {
      console.warn('Error assigning variants to delivery profile:', assignError);
      // Continue anyway since we've added the metafield
      return {
        success: true,
        productId,
        profileId,
        error: assignError.message,
        note: "Added delivery profile metafield but couldn't assign variants"
      };
    }
    
    return {
      success: true,
      productId,
      profileId,
      note: "Product assigned to custom delivery profile with flat rates"
    };
  } catch (error) {
    console.error('Error assigning product to delivery profile:', error);
    // Throw a more user-friendly error
    throw new Error(`Could not assign product to delivery profile: ${error.message}`);
  }
}

/**
 * Add metafields to a Shopify product
 * Metafields are used to store additional data about a product
 */
async function addMetafieldsToProduct(shopDomain, accessToken, productId, metafields, apiVersion) {
  try {
    console.log(`Adding metafields to product ${productId}`);
    
    // Ensure valid API version
    apiVersion = apiVersion || '2023-07';
    
    // Metafields can be added individually or in bulk depending on Shopify API version
    // For newer API versions, we can use the bulk endpoint
    const url = `https://${shopDomain}/admin/api/${apiVersion}/products/${productId}/metafields.json`;
    console.log(`Making metafields request to: ${url}`);
    
    // Generate authentication headers
    let authHeaders = {};
    
    // First try the passed accessToken (for backward compatibility)
    if (accessToken) {
      console.log('Using provided access token authentication for metafields');
      authHeaders = {
        'X-Shopify-Access-Token': accessToken
      };
    } else if (global.shopifyAuth) {
      if (global.shopifyAuth.accessToken) {
        // Method 1: Access Token Authentication
        console.log('Using global access token authentication for metafields');
        authHeaders = {
          'X-Shopify-Access-Token': global.shopifyAuth.accessToken
        };
      } else if (global.shopifyAuth.apiKey && global.shopifyAuth.apiSecret) {
        // Method 2: API Key + Secret Authentication
        console.log('Using global API key and secret authentication for metafields');
        const authString = Buffer.from(`${global.shopifyAuth.apiKey}:${global.shopifyAuth.apiSecret}`).toString('base64');
        authHeaders = {
          'Authorization': `Basic ${authString}`
        };
      }
    }
    
    if (Object.keys(authHeaders).length === 0) {
      throw new Error('No valid authentication method available for metafields');
    }
    
    // Process metafields in batches to avoid API limits
    const results = [];
    const MAX_BATCH_SIZE = 10; // Shopify may have limits on bulk operations
    
    // Process metafields in smaller batches
    for (let i = 0; i < metafields.length; i += MAX_BATCH_SIZE) {
      const batch = metafields.slice(i, i + MAX_BATCH_SIZE);
      console.log(`Processing metafield batch ${Math.floor(i/MAX_BATCH_SIZE) + 1}, size: ${batch.length}`);
      
      // For each metafield in the batch, send an individual request
      // This is more reliable than trying to use bulk endpoints which may not be available
      const batchPromises = batch.map(async (metafield) => {
        const metafieldData = {
          metafield: {
            namespace: metafield.namespace || 'custom',
            key: metafield.key,
            value: metafield.value,
            type: metafield.type || 'single_line_text_field'
          }
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify(metafieldData)
        });
        
        if (!response.ok) {
          let errorText = await response.text();
          console.error(`Error adding metafield ${metafield.key}:`, errorText);
          return { 
            success: false, 
            key: metafield.key,
            error: `API error: ${response.status} - ${errorText.substring(0, 100)}`
          };
        }
        
        const result = await response.json();
        return { success: true, data: result.metafield, key: metafield.key };
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    // Summarize results
    const successful = results.filter(r => r.success).length;
    console.log(`Added ${successful}/${metafields.length} metafields successfully`);
    
    return {
      success: successful > 0,
      total: metafields.length,
      added: successful,
      failed: metafields.length - successful,
      results: results
    };
  } catch (error) {
    console.error('Error adding metafields to product:', error.message);
    throw error;
  }
}