// Prodigi API utility module
// Functions for fetching pricing and other info from Prodigi API

// Default product information - using a canvas product
const DEFAULT_PRODUCT = {
  sku: "GLOBAL-CAN-16X20",
  copies: 1,
  attributes: { wrap: "ImageWrap" },
  assets: [{ printArea: "default" }]
};

/**
 * Fetch price quote from Prodigi for a specific country
 * @param {string} countryCode - Two-letter ISO country code
 * @param {string} currencyCode - Three-letter ISO currency code (optional)
 * @param {object} productInfo - Product information (optional)
 * @returns {Promise<object>} Quote object with pricing information
 */
export const getProdigiPriceQuote = async (countryCode, currencyCode = 'USD', productInfo = DEFAULT_PRODUCT) => {
  try {
    // In a real-world implementation, we would call the Prodigi API here
    // For now, we'll use a serverless function to avoid exposing API keys in the client
    const response = await fetch('/.netlify/functions/getProdigiQuote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        countryCode,
        currencyCode,
        product: productInfo
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get price quote: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching Prodigi price quote:', error);
    // Return mock pricing data if API call fails
    return getMockPriceQuote(countryCode, currencyCode);
  }
};

/**
 * Generate mock price quote for testing
 * @param {string} countryCode - Two-letter ISO country code
 * @param {string} currencyCode - Three-letter ISO currency code
 * @returns {object} Mock quote object
 */
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

/**
 * Calculate the total price with markup
 * @param {object} quote - Prodigi quote object
 * @param {number} markupPercentage - Percentage to add as markup
 * @returns {object} Total price info with markup
 */
export const calculatePriceWithMarkup = (quote, markupPercentage = 20) => {
  if (!quote || !quote.quotes || quote.quotes.length === 0) {
    return {
      totalBase: 0,
      totalWithMarkup: 0,
      currency: 'USD'
    };
  }

  const costSummary = quote.quotes[0].costSummary;
  const itemsAmount = parseFloat(costSummary.items.amount);
  const shippingAmount = parseFloat(costSummary.shipping.amount);
  const currency = costSummary.items.currency;
  
  // Calculate markup
  const itemsWithMarkup = itemsAmount * (1 + markupPercentage / 100);
  const shippingWithMarkup = shippingAmount * (1 + markupPercentage / 100);
  
  const totalBase = itemsAmount + shippingAmount;
  const totalWithMarkup = itemsWithMarkup + shippingWithMarkup;
  
  return {
    basePrice: {
      items: itemsAmount.toFixed(2),
      shipping: shippingAmount.toFixed(2),
      total: totalBase.toFixed(2)
    },
    finalPrice: {
      items: itemsWithMarkup.toFixed(2),
      shipping: shippingWithMarkup.toFixed(2),
      total: totalWithMarkup.toFixed(2)
    },
    currency
  };
};