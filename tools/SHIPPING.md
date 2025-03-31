# Shopify Shipping Integration Guide

This guide explains how to set up and integrate custom shipping rates with Shopify to provide flat-rate shipping for products.

## Overview

Shopify allows you to create custom shipping rates through "Delivery Profiles" which can be assigned to specific products. This is useful when:

1. You need to offer flat-rate shipping regardless of destination
2. You want to use external shipping providers (like Prodigi) but present a simple rate to customers
3. Different products need different shipping options

## Solution Architecture

Our solution involves:

1. Creating delivery profiles via Shopify's Admin GraphQL API
2. Assigning products to these profiles
3. Setting up shipping rates for specific countries or regions

When a customer proceeds to checkout, they'll see the flat rate shipping option we've defined, regardless of the actual shipping cost calculation happening behind the scenes.

## Implementation

We've created a standalone tool (`tools/delivery-profile-creator`) that:

1. Creates a delivery profile for specific countries
2. Assigns products to that profile
3. Sets up flat rate shipping prices

### Key Components

#### 1. Delivery Profiles

In Shopify, a delivery profile consists of:
- **Locations**: Where products ship from
- **Zones**: Geographic areas (countries/regions)
- **Shipping Methods**: The rates and conditions for each zone

#### 2. Product Assignment

Products must be explicitly assigned to a delivery profile to use its shipping rates. This is done through the Admin API.

#### 3. Inventory Management

Products must have inventory available to be purchasable and use the shipping rates.

## API Integration Details

### Creating a Delivery Profile

```graphql
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
```

The profile input needs:
- A name
- Location groups
- Zones with countries
- Shipping methods with rates

### Assigning Products

```graphql
mutation deliveryProfileUpdate($profileId: ID!, $profile: DeliveryProfileInput!) {
  deliveryProfileUpdate(
    id: $profileId,
    profile: {
      variantsToAssociate: [variantId]
    }
  ) {
    profile {
      id
    }
    userErrors {
      field
      message
    }
  }
}
```

### Setting Inventory

```graphql
mutation inventoryBulkAdjustQuantityAtLocation($locationId: ID!, $inventoryItemAdjustments: [InventoryAdjustItemInput!]!) {
  inventoryBulkAdjustQuantityAtLocation(locationId: $locationId, inventoryItemAdjustments: $inventoryItemAdjustments) {
    inventoryLevels {
      available
    }
    userErrors {
      field
      message
    }
  }
}
```

## Integration Flow with External Shipping Providers

When integrating with external shipping providers like Prodigi:

1. **Get shipping rate from external API**: Obtain the actual shipping cost from the provider
2. **Create/update delivery profile**: Set up a delivery profile with a flat rate based on this cost
3. **Assign products**: Ensure products are assigned to the appropriate profile
4. **Customer checkout**: Customer sees only the flat rate during checkout

## Testing Shipping Rates

To verify shipping rates:

1. Create a test product and assign it to your delivery profile
2. Set product inventory to make it available for purchase
3. Add the product to cart and proceed to checkout
4. Enter an address in a configured country
5. Confirm the expected shipping rate appears

## Common Issues and Solutions

### Shipping Rate Not Appearing

If shipping rates aren't showing during checkout:
- Ensure the delivery profile is correctly created
- Verify the product is assigned to the profile
- Check that the shipping address is in a configured zone
- Ensure the product has available inventory
- Make sure the product is published to the Online Store

### API Response Errors

The Shopify API structure changes occasionally. If you get errors:
- Check the error message carefully for missing or invalid fields
- Review the latest API documentation
- Update your mutations to match the current schema

## Best Practices

1. **Create specific profiles**: Create separate delivery profiles for products with different shipping requirements
2. **Test thoroughly**: Always test the checkout flow with real addresses
3. **Keep profiles updated**: Update rates when your shipping costs change
4. **Monitor API changes**: Stay informed about Shopify API updates

## Resources

- [Shopify Delivery Profiles API](https://shopify.dev/docs/api/admin-graphql/latest/mutations/deliveryProfileCreate)
- [Shopify Shipping Documentation](https://help.shopify.com/en/manual/shipping/setting-up-and-managing-your-shipping)
- Custom Delivery Profile Creator Tool: `tools/delivery-profile-creator`