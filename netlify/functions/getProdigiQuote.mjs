// Serverless function to fetch price quotes from Prodigi API
import fetch from 'node-fetch';

// Mock data for testing (used when API key isn't available)
const getMockPriceQuote = (countryCode, currencyCode) => {
  // Fix country code (UK should be GB for proper ISO 3166-1 alpha-2 code)
  if (countryCode === 'UK') countryCode = 'GB';
  
  // Base price for a canvas in USD
  const basePrices = {
    'US': 25.00,
    'GB': 20.00, // United Kingdom
    'CA': 28.00,
    'AU': 30.00,
    'DE': 22.00,
    'FR': 22.00,
    'ES': 22.00,
    'IT': 22.00,
    'JP': 32.00,
    'SG': 33.00,
    'NL': 22.00
  };
  
  // Shipping costs by country in USD
  const shippingPrices = {
    'US': 5.00,
    'GB': 4.50, // United Kingdom
    'CA': 6.50,
    'AU': 12.00,
    'DE': 7.00,
    'FR': 7.00,
    'ES': 8.00,
    'IT': 8.00,
    'JP': 15.00,
    'SG': 14.00,
    'NL': 7.00
  };
  
  // Express shipping prices (higher than standard)
  const expressShippingPrices = {
    'US': 12.00,
    'GB': 10.50, // United Kingdom
    'CA': 14.50,
    'AU': 24.00,
    'DE': 18.00,
    'FR': 18.00,
    'ES': 19.00,
    'IT': 19.00,
    'JP': 30.00,
    'SG': 28.00,
    'NL': 18.00
  };

  // Default to US pricing if country not found
  const basePrice = basePrices[countryCode] || basePrices['US'];
  const standardShippingPrice = shippingPrices[countryCode] || shippingPrices['US'];
  const expressShippingPrice = expressShippingPrices[countryCode] || expressShippingPrices['US'];

  // Default product
  const DEFAULT_PRODUCT = {
    sku: "GLOBAL-CAN-16X20",
    copies: 1,
    attributes: { wrap: "ImageWrap" },
    assets: [{ printArea: "default" }]
  };

  // Return response with multiple shipping options
  return {
    outcome: "Created",
    quotes: [
      // Standard shipping option
      {
        shipmentMethod: "Budget",
        costSummary: {
          items: {
            amount: basePrice.toFixed(2),
            currency: currencyCode
          },
          shipping: {
            amount: standardShippingPrice.toFixed(2),
            currency: currencyCode
          }
        },
        shipments: [
          {
            carrier: {
              name: "Mixed",
              service: "Budget"
            },
            fulfillmentLocation: {
              countryCode: "US",
              labCode: "us11"
            },
            cost: {
              amount: standardShippingPrice.toFixed(2),
              currency: currencyCode
            },
            items: ["mock_item_id_1"]
          }
        ],
        items: [
          {
            id: "mock_item_id_1",
            sku: DEFAULT_PRODUCT.sku,
            copies: DEFAULT_PRODUCT.copies,
            unitCost: {
              amount: basePrice.toFixed(2),
              currency: currencyCode
            },
            attributes: DEFAULT_PRODUCT.attributes,
            assets: DEFAULT_PRODUCT.assets
          }
        ]
      },
      // Express shipping option
      {
        shipmentMethod: "Express",
        costSummary: {
          items: {
            amount: basePrice.toFixed(2),
            currency: currencyCode
          },
          shipping: {
            amount: expressShippingPrice.toFixed(2),
            currency: currencyCode
          }
        },
        shipments: [
          {
            carrier: {
              name: "DHL",
              service: "Express"
            },
            fulfillmentLocation: {
              countryCode: "US",
              labCode: "us11"
            },
            cost: {
              amount: expressShippingPrice.toFixed(2),
              currency: currencyCode
            },
            items: ["mock_item_id_2"]
          }
        ],
        items: [
          {
            id: "mock_item_id_2",
            sku: DEFAULT_PRODUCT.sku,
            copies: DEFAULT_PRODUCT.copies,
            unitCost: {
              amount: basePrice.toFixed(2),
              currency: currencyCode
            },
            attributes: DEFAULT_PRODUCT.attributes,
            assets: DEFAULT_PRODUCT.assets
          }
        ]
      }
    ],
    // Add the formatted shipping rates for easier consumption
    formattedShippingRates: [
      {
        name: "Prodigi Budget Shipping",
        price: standardShippingPrice.toFixed(2),
        method: "Budget",
        currency: currencyCode,
        productCost: basePrice.toFixed(2)
      },
      {
        name: "Prodigi Express Shipping",
        price: expressShippingPrice.toFixed(2),
        method: "Express",
        currency: currencyCode,
        productCost: basePrice.toFixed(2)
      }
    ]
  };
};

export const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Preflight call successful' })
    };
  }

  try {
    // Parse the request body
    const body = JSON.parse(event.body || '{}');
    const { countryCode = 'GB', currencyCode = 'USD', product } = body;
    
    console.log(`Prodigi Quote Request - Country: ${countryCode}, Currency: ${currencyCode}`);
    
    // Validate country code (we need proper ISO 3166-1 alpha-2 codes)
    if (!countryCode || countryCode.length !== 2) {
      return {
        statusCode: 400, 
        headers,
        body: JSON.stringify({
          error: true,
          message: `Invalid country code: ${countryCode}. Must be a 2-letter ISO 3166-1 alpha-2 code.`
        })
      };
    }

    // Get API key from environment variables - check both possible names
    const apiKey = process.env.REACT_APP_PRODIGI_API_KEY || process.env.PRODIGI_API_KEY;

    // If no API key, use mock data
    if (!apiKey) {
      console.log('No Prodigi API key found in environment variables, using mock data');
      
      // Generate mock quote
      const mockData = getMockPriceQuote(countryCode, currencyCode);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ...mockData,
          mock: true,
          warning: 'Using mock data - Prodigi API key not configured'
        })
      };
    }
    
    // Log a sanitized version of the key for debugging (first 4 chars + length)
    console.log(`Found Prodigi API key (${apiKey.substr(0, 4)}... length: ${apiKey.length})`);
    
    // Check for common formatting issues
    if (apiKey.includes(' ') || apiKey.includes('\n') || apiKey.includes('\r')) {
      console.warn('Warning: API key contains whitespace - this may cause authentication issues');
    }

    // Prepare the request to Prodigi API
    const requestBody = {
      shippingMethod: "Budget",
      destinationCountryCode: countryCode,
      currencyCode: currencyCode,
      items: [product || {
        // Try a different SKU format - some examples from Prodigi docs
        // Using their example SKU from documentation: GLOBAL-CAN-10X10
        sku: "GLOBAL-CAN-10X10",
        copies: 1,
        attributes: { wrap: "ImageWrap" },
        assets: [{ printArea: "default" }]
      }]
    };

    // Call the Prodigi API to get quote
    // Using the live production environment since sandbox is not authenticating properly
    const apiUrl = 'https://api.prodigi.com/v4.0/quotes';
    
    console.log('Prodigi API request to URL:', apiUrl);
    console.log('Using LIVE environment - This will create real quotes in your Prodigi account');
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    // Clean the API key of any whitespace to prevent auth issues
    const cleanedApiKey = apiKey.trim();
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': cleanedApiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // Handle the response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prodigi API error:', errorText);
      console.error('Response status:', response.status);
      console.error('Response headers:', JSON.stringify(Object.fromEntries([...response.headers.entries()])));
      throw new Error(`API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('Prodigi API response:', JSON.stringify(data, null, 2));
    
    // Extract and format shipping rates for easier consumption by the createShopifyProduct function
    let formattedShippingRates = [];
    
    if (data.quotes && data.quotes.length > 0) {
      formattedShippingRates = data.quotes.map(quote => {
        // Extract shipping method name
        const methodName = quote.shipmentMethod || "Standard";
        
        // Extract shipping cost amount
        let shippingCost = "0.00";
        if (quote.costSummary && quote.costSummary.shipping && quote.costSummary.shipping.amount) {
          shippingCost = quote.costSummary.shipping.amount;
        }
        
        // Extract product cost
        let productCost = "0.00";
        if (quote.costSummary && quote.costSummary.items && quote.costSummary.items.amount) {
          productCost = quote.costSummary.items.amount;
        }
        
        // Get the currency 
        const currency = quote.costSummary?.shipping?.currency || "USD";
        
        return {
          name: `Prodigi ${methodName} Shipping`,
          price: shippingCost,
          method: methodName,
          currency: currency,
          productCost: productCost
        };
      });
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...data,
        formattedShippingRates
      })
    };
  } catch (error) {
    console.error('Error fetching Prodigi quote:', error);
    
    // Return error details for debugging
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: true,
        message: 'Failed to fetch price quote from Prodigi API',
        details: error.message
      })
    };
  }
};