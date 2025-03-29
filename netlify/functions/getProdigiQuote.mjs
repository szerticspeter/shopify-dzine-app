// Serverless function to fetch price quotes from Prodigi API
import fetch from 'node-fetch';

// Mock data for testing (used when API key isn't available)
const getMockPriceQuote = (countryCode, currencyCode) => {
  // Base price for a canvas in USD
  const basePrices = {
    'US': 25.00,
    'UK': 20.00,
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
    'UK': 4.50,
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

  // Default to US pricing if country not found
  const basePrice = basePrices[countryCode] || basePrices['US'];
  const shippingPrice = shippingPrices[countryCode] || shippingPrices['US'];

  // Default product
  const DEFAULT_PRODUCT = {
    sku: "GLOBAL-CAN-16X20",
    copies: 1,
    attributes: { wrap: "ImageWrap" },
    assets: [{ printArea: "default" }]
  };

  return {
    outcome: "Created",
    quotes: [
      {
        shipmentMethod: "Budget",
        costSummary: {
          items: {
            amount: basePrice.toFixed(2),
            currency: currencyCode
          },
          shipping: {
            amount: shippingPrice.toFixed(2),
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
              amount: shippingPrice.toFixed(2),
              currency: currencyCode
            },
            items: ["mock_item_id"]
          }
        ],
        items: [
          {
            id: "mock_item_id",
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
    const { countryCode = 'US', currencyCode = 'USD', product } = body;

    // Get API key from environment variables
    const apiKey = process.env.PRODIGI_API_KEY;

    // If no API key, return mock data
    if (!apiKey) {
      console.log('No Prodigi API key found. Returning mock data.');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(getMockPriceQuote(countryCode, currencyCode))
      };
    }

    // Prepare the request to Prodigi API
    const requestBody = {
      shippingMethod: "Budget",
      destinationCountryCode: countryCode,
      currencyCode: currencyCode,
      items: [product || {
        sku: "GLOBAL-CAN-16X20",
        copies: 1,
        attributes: { wrap: "ImageWrap" },
        assets: [{ printArea: "default" }]
      }]
    };

    // Call the Prodigi API to get quote
    const apiUrl = 'https://api.sandbox.prodigi.com/v4.0/quotes';
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // Handle the response
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Prodigi API error:', errorText);
      throw new Error(`API responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Error fetching Prodigi quote:', error);
    
    // Return mock data as fallback
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(getMockPriceQuote(
        event.body ? JSON.parse(event.body).countryCode || 'US' : 'US',
        event.body ? JSON.parse(event.body).currencyCode || 'USD' : 'USD'
      ))
    };
  }
};