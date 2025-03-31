# Shopify Delivery Profile Creator

A standalone tool for creating delivery profiles with flat shipping rates for Shopify stores using the GraphQL Admin API.

## Overview

This tool allows you to:

1. Create a delivery profile with flat rate shipping for specific countries
2. Set inventory for products
3. Publish products to make them visible in the storefront
4. Assign products to the created delivery profile

## How It Works

The tool provides an easy way to add flat-rate shipping to your Shopify store through the Admin API. Key features:

- Creates a delivery profile for a specific country (currently configured for Hungary)
- Creates a test product and assigns it to the delivery profile
- Sets product inventory to make it available for purchase
- Handles product publishing to ensure visibility in the storefront
- Uses the Shopify GraphQL Admin API for all operations

## Setup

1. Create a `.env` file in this directory with your Shopify credentials:

```
SHOPIFY_ADMIN_API_TOKEN=your_access_token
SHOPIFY_STORE=your-store.myshopify.com
```

2. Install dependencies:

```
npm install
```

3. Run the tool:

```
npm start
```

## How to Get a Shopify Admin API Token

1. Go to your Shopify admin dashboard
2. Navigate to Apps > Develop apps
3. Create a new custom app with Admin API permissions
4. Request scopes for "shipping" and "products" write access
5. Install the app in your store
6. Copy the Admin API access token to your .env file

## Technical Details

### Creating a Delivery Profile

The tool creates a delivery profile with:
- A shipping zone for a specific country (currently Hungary)
- A flat rate shipping option (currently EUR 5.99)

```javascript
// Example API structure for creating a delivery profile
const profileVariables = {
  profile: {
    name: "Standard Shipping",
    locationGroupsToCreate: [
      {
        locationsToAdd: [locationId],
        zonesToCreate: [
          {
            name: "Hungary",
            countries: [
              {
                code: "HU",
                provinces: []
              }
            ],
            methodDefinitionsToCreate: [
              {
                name: "Hungary Flat Rate Shipping",
                active: true,
                rateDefinition: {
                  price: {
                    amount: "5.99",
                    currencyCode: "EUR"
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  }
};
```

### Setting Up Products and Inventory

The tool:
1. Creates a product using the Admin API
2. Sets inventory to make it available for purchase
3. Publishes the product so it's visible in the storefront

```javascript
// Example for creating a product
const productVariables = {
  input: {
    title: "Shipping Test Product",
    productType: "Test",
    vendor: "Testing Vendor",
    descriptionHtml: "<p>This product is for testing Shopify shipping rates.</p>",
    status: "ACTIVE"
  }
};

// Example for setting inventory
const inventoryVariables = {
  locationId: locationId,
  inventoryItemAdjustments: [
    {
      inventoryItemId: inventoryItemId,
      availableDelta: 10
    }
  ]
};
```

### Assigning Products to Delivery Profiles

The tool assigns the created product to the delivery profile to ensure the shipping rate applies:

```javascript
// Example for assigning a product to a profile
const assignVariables = {
  profileId: profileId,
  profile: {
    variantsToAssociate: [variantId]
  }
};
```

## Checking Shipping Rates

To verify the shipping rate is working:

1. Go to your Shopify storefront
2. Find the created test product (look for "Shipping Test Product" with today's date)
3. Add it to your cart and proceed to checkout
4. Enter a Hungarian address (e.g., postal code 2051 for Biatorbágy)
5. You should see the EUR 5.99 flat rate shipping option

## Common Issues and Solutions

### Visibility Issues
If products aren't showing in the storefront, check:
- The product has been published to the Online Store
- The product has inventory available
- The product status is "ACTIVE"

### Shipping Rate Not Appearing
If the shipping rate doesn't appear during checkout:
- Ensure the product is properly assigned to the delivery profile
- Verify the shipping address matches the configured country
- Check the delivery profile is correctly configured with active shipping methods

### API Format Changes
The Shopify API schema occasionally changes. If you encounter errors:
- Check the error message for specific field issues
- Consult the latest [Shopify API documentation](https://shopify.dev/docs/api/admin-graphql/latest/mutations/deliveryProfileCreate)
- Update the mutation structure to match the current API format

## Future Improvements

- Support for multiple countries
- Additional shipping options (weight-based, tiered pricing)
- Ability to modify existing profiles
- Support for assigning multiple products at once

## Reference Documentation

- [Shopify Admin API Reference](https://shopify.dev/docs/api/admin-graphql/latest/mutations/deliveryProfileCreate)
- [Shopify Delivery Profiles Overview](https://help.shopify.com/en/manual/shipping/setting-up-and-managing-your-shipping/shipping-profiles)