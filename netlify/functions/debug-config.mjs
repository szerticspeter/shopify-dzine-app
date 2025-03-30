import fetch from 'node-fetch';

/**
 * Netlify function to debug the environment and configuration
 * This is a diagnostic tool to help understand what's happening in the deployment
 */
export async function handler(event, context) {
  // CORS headers for development
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
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
    // Collect all environment variables without sensitive values
    const environmentVars = Object.keys(process.env)
      .filter(key => !key.toLowerCase().includes('token') && 
              !key.toLowerCase().includes('secret') && 
              !key.toLowerCase().includes('key') &&
              !key.toLowerCase().includes('password'))
      .reduce((obj, key) => {
        obj[key] = process.env[key];
        return obj;
      }, {});
    
    // Check for specific Shopify environment variables (showing only existence, not values)
    const shopifyEnvVars = {
      'SHOPIFY_STORE_DOMAIN': !!process.env.SHOPIFY_STORE_DOMAIN,
      'REACT_APP_SHOPIFY_STORE_DOMAIN': !!process.env.REACT_APP_SHOPIFY_STORE_DOMAIN,
      'SHOPIFY_ACCESS_TOKEN': !!process.env.SHOPIFY_ACCESS_TOKEN,
      'SHOPIFY_API_KEY': !!process.env.SHOPIFY_API_KEY,
      'REACT_APP_SHOPIFY_API_KEY': !!process.env.REACT_APP_SHOPIFY_API_KEY,
      'SHOPIFY_API_SECRET': !!process.env.SHOPIFY_API_SECRET,
      'REACT_APP_SHOPIFY_API_SECRET': !!process.env.REACT_APP_SHOPIFY_API_SECRET,
      'SHOPIFY_API_VERSION': process.env.SHOPIFY_API_VERSION || '2023-07',
      'PRODIGI_API_KEY': !!process.env.PRODIGI_API_KEY,
      'REACT_APP_PRODIGI_API_KEY': !!process.env.REACT_APP_PRODIGI_API_KEY
    };
    
    // Check deployment context
    const deploymentInfo = {
      context: process.env.CONTEXT || 'unknown',
      branch: process.env.BRANCH || process.env.HEAD || 'unknown',
      commitRef: process.env.COMMIT_REF || 'unknown',
      deploymentUrl: process.env.DEPLOY_URL || process.env.URL || 'unknown',
      deployId: process.env.DEPLOY_ID || 'unknown',
      nodeVersion: process.version,
      timestamp: new Date().toISOString()
    };
    
    // Try to reach Shopify API to test connectivity
    let shopifyApiStatus = "Not tested";
    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN || 
                        process.env.REACT_APP_SHOPIFY_STORE_DOMAIN;
    
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN || 
                    process.env.SHOPIFY_API_TOKEN ||
                    process.env.SHOPIFY_API_ACCESS_TOKEN;
    
    if (shopDomain && accessToken) {
      try {
        const apiVersion = process.env.SHOPIFY_API_VERSION || '2023-07';
        const url = `https://${shopDomain}/admin/api/${apiVersion}/shop.json`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': accessToken
          }
        });
        
        if (response.ok) {
          shopifyApiStatus = `Connected successfully (HTTP ${response.status})`;
        } else {
          shopifyApiStatus = `Connection failed: HTTP ${response.status}`;
        }
      } catch (apiError) {
        shopifyApiStatus = `Connection error: ${apiError.message}`;
      }
    } else {
      shopifyApiStatus = "Missing shop domain or access token";
    }
    
    // Try GraphQL API as well
    let graphqlApiStatus = "Not tested";
    if (shopDomain && accessToken) {
      try {
        const apiVersion = process.env.SHOPIFY_API_VERSION || '2023-07';
        const url = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
        
        const testQuery = `
          query {
            shop {
              name
              id
            }
          }
        `;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken
          },
          body: JSON.stringify({ query: testQuery })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.errors) {
            graphqlApiStatus = `GraphQL errors: ${JSON.stringify(data.errors)}`;
          } else if (data.data && data.data.shop) {
            graphqlApiStatus = `Connected successfully to shop: ${data.data.shop.name}`;
          } else {
            graphqlApiStatus = `Unexpected response format: ${JSON.stringify(data).substring(0, 100)}...`;
          }
        } else {
          graphqlApiStatus = `Connection failed: HTTP ${response.status}`;
        }
      } catch (apiError) {
        graphqlApiStatus = `Connection error: ${apiError.message}`;
      }
    }
    
    // Check request context
    const requestInfo = {
      httpMethod: event.httpMethod,
      path: event.path,
      headers: event.headers,
      queryStringParameters: event.queryStringParameters
    };
    
    // Collect diagnostic info
    const diagnosticData = {
      timestamp: new Date().toISOString(),
      functionName: "debug-config",
      deployment: deploymentInfo,
      shopify: {
        ...shopifyEnvVars,
        restApiStatus: shopifyApiStatus,
        graphqlApiStatus: graphqlApiStatus
      },
      environment: environmentVars,
      request: requestInfo
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(diagnosticData, null, 2)
    };
  } catch (error) {
    console.error('Error in debug function:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    };
  }
}