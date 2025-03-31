import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Required environment variables
const SHOPIFY_ADMIN_API_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE;

if (!SHOPIFY_ADMIN_API_TOKEN || !SHOPIFY_STORE) {
  console.error('Error: Missing required environment variables. Check .env file.');
  console.error('Required variables: SHOPIFY_ADMIN_API_TOKEN, SHOPIFY_STORE');
  process.exit(1);
}

// Fix URL format - ensure we don't double up on https://
const storeUrl = SHOPIFY_STORE.replace(/^https?:\/\//, '');
const SHOPIFY_ADMIN_API_URL = `https://${storeUrl}/admin/api/unstable/graphql.json`;

async function graphqlRequest(query, variables = {}) {
  try {
    const response = await fetch(SHOPIFY_ADMIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_TOKEN
      },
      body: JSON.stringify({ query, variables })
    });

    const data = await response.json();

    if (data.errors) {
      console.error('GraphQL Errors:', JSON.stringify(data.errors, null, 2));
      throw new Error('GraphQL request failed');
    }

    return data.data;
  } catch (error) {
    console.error('Request Error:', error.message);
    throw error;
  }
}

// Store location data at module level for reuse
let storeLocationId;

async function createDeliveryProfile() {
  // First, get the location ID
  const locationsQuery = `
    query {
      locations(first: 1) {
        edges {
          node {
            id
          }
        }
      }
    }
  `;
  
  // Fetch location
  console.log('Fetching locations...');
  const locationsData = await graphqlRequest(locationsQuery);
  console.log('Locations data:', JSON.stringify(locationsData, null, 2));
  
  if (!locationsData.locations || !locationsData.locations.edges || locationsData.locations.edges.length === 0) {
    throw new Error('No locations found in the store');
  }
  
  const locationId = locationsData.locations.edges[0].node.id;
  // Save the location ID globally for reuse
  storeLocationId = locationId;
  console.log(`Using location ID: ${locationId}`);

  // Define profile creation mutation
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

  // Create profile for Hungary
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const profileVariables = {
    profile: {
      name: `Standard Shipping ${timestamp}`,
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

  console.log('Creating delivery profile with the following request:');
  console.log(JSON.stringify(profileVariables, null, 2));
  
  try {
    const result = await graphqlRequest(createProfileMutation, profileVariables);
    console.log('Delivery Profile Create Response:', JSON.stringify(result, null, 2));
    
    if (result.deliveryProfileCreate.profile) {
      console.log('\nSuccessfully created delivery profile!');
      console.log(`Profile ID: ${result.deliveryProfileCreate.profile.id}`);
      console.log(`Profile Name: ${result.deliveryProfileCreate.profile.name}`);
      return result.deliveryProfileCreate.profile.id;
    } else {
      console.log('Failed to create delivery profile due to errors:');
      console.log(JSON.stringify(result.deliveryProfileCreate.userErrors, null, 2));
      return null;
    }
  } catch (error) {
    console.error('Failed to create delivery profile:', error);
    return null;
  }
}

async function getFirstProductVariant() {
  const productsQuery = `
    query {
      products(first: 1) {
        edges {
          node {
            id
            title
            variants(first: 1) {
              edges {
                node {
                  id
                  title
                  inventoryItem {
                    id
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    console.log('Fetching a product to assign to the delivery profile...');
    const productsData = await graphqlRequest(productsQuery);
    
    if (!productsData.products || 
        !productsData.products.edges || 
        productsData.products.edges.length === 0 ||
        !productsData.products.edges[0].node.variants ||
        !productsData.products.edges[0].node.variants.edges ||
        productsData.products.edges[0].node.variants.edges.length === 0) {
      console.log('No products or variants found in the store.');
      return null;
    }

    const product = productsData.products.edges[0].node;
    const variant = product.variants.edges[0].node;
    
    console.log(`Found product: ${product.title}`);
    console.log(`Product variant: ${variant.title} (${variant.id})`);
    
    if (variant.inventoryItem) {
      console.log(`Inventory item ID: ${variant.inventoryItem.id}`);
    }
    
    return {
      variantId: variant.id,
      inventoryItemId: variant.inventoryItem ? variant.inventoryItem.id : null
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    return null;
  }
}

async function updateInventory(inventoryItemId, locationId) {
  if (!inventoryItemId || !locationId) {
    console.log('Missing required inventory item ID or location ID.');
    return false;
  }
  
  const updateMutation = `
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
  `;

  const variables = {
    locationId: locationId,
    inventoryItemAdjustments: [
      {
        inventoryItemId: inventoryItemId,
        availableDelta: 10
      }
    ]
  };

  try {
    console.log(`Setting inventory for item ${inventoryItemId} at location ${locationId}...`);
    const result = await graphqlRequest(updateMutation, variables);
    console.log('Inventory update result:', JSON.stringify(result, null, 2));
    
    if (result.inventoryBulkAdjustQuantityAtLocation && 
        !result.inventoryBulkAdjustQuantityAtLocation.userErrors.length) {
      console.log('Successfully updated inventory to 10 items!');
      return true;
    } else {
      console.log('Failed to update inventory.');
      return false;
    }
  } catch (error) {
    console.error('Error updating inventory:', error);
    return false;
  }
}

async function assignVariantToProfile(profileId, variantId, inventoryItemId, locationId) {
  if (!profileId || !variantId) {
    console.log('Missing required profile ID or variant ID.');
    return false;
  }
  
  // Update inventory if we have the inventory item ID
  if (inventoryItemId && locationId) {
    await updateInventory(inventoryItemId, locationId);
  }

  const assignMutation = `
    mutation deliveryProfileUpdate($profileId: ID!, $profile: DeliveryProfileInput!) {
      deliveryProfileUpdate(
        id: $profileId,
        profile: $profile
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
  `;

  const variables = {
    profileId: profileId,
    profile: {
      variantsToAssociate: [variantId]
    }
  };

  try {
    console.log(`Assigning variant ${variantId} to profile ${profileId}...`);
    const result = await graphqlRequest(assignMutation, variables);
    console.log('Assignment result:', JSON.stringify(result, null, 2));
    
    if (result.deliveryProfileUpdate && 
        result.deliveryProfileUpdate.profile && 
        !result.deliveryProfileUpdate.userErrors.length) {
      console.log('Successfully assigned product variant to delivery profile!');
      return true;
    } else {
      console.log('Failed to assign product variant to delivery profile.');
      return false;
    }
  } catch (error) {
    console.error('Error assigning product variant to profile:', error);
    return false;
  }
}

async function main() {
  try {
    console.log('======================================');
    console.log('Shopify Delivery Profile Creator Tool');
    console.log('======================================');
    console.log('Connected to store:', SHOPIFY_STORE);
    
    const profileId = await createDeliveryProfile();
    
    if (profileId) {
      console.log('\nDelivery profile created with flat rate shipping.');
      
      // Test assigning a product variant to the profile
      const productData = await getFirstProductVariant();
      
      if (productData && productData.variantId) {
        await assignVariantToProfile(
          profileId, 
          productData.variantId, 
          productData.inventoryItemId, 
          storeLocationId
        );
      } else {
        console.log('No product variants available to assign to this profile.');
      }
    } else {
      console.log('\nFailed to create delivery profile. See errors above.');
    }
  } catch (error) {
    console.error('Error in main function:', error);
  }
}

main();