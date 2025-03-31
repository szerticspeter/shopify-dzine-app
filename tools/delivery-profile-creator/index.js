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

  // Simple US profile with CA and NY states
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const profileVariables = {
    profile: {
      name: `Standard Shipping ${timestamp}`,
      locationGroupsToCreate: [
        {
          locationsToAdd: [locationId],
          zonesToCreate: [
            {
              name: "US Zone",
              countries: [
                {
                  code: "US",
                  provinces: [
                    { code: "CA" },
                    { code: "NY" }
                  ]
                }
              ],
              methodDefinitionsToCreate: [
                {
                  name: "Flat Rate Shipping",
                  active: true,
                  rateDefinition: {
                    price: {
                      amount: "5.99",
                      currencyCode: "USD"
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
    
    return variant.id;
  } catch (error) {
    console.error('Error fetching products:', error);
    return null;
  }
}

async function assignVariantToProfile(profileId, variantId) {
  if (!profileId || !variantId) {
    console.log('Missing required profile ID or variant ID.');
    return false;
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
      const variantId = await getFirstProductVariant();
      
      if (variantId) {
        await assignVariantToProfile(profileId, variantId);
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