import fetch from 'node-fetch';

/**
 * Simplified Netlify function to create a Shopify product with flat rate shipping
 * Uses Shopify GraphQL Admin API for delivery profiles
 */
export async function handler(event, context) {
  // CORS headers
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
  
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const requestBody = JSON.parse(event.body);
    const { title, description, price, imageUrl, shippingCountry = 'US', shippingRates = [] } = requestBody;
    
    console.log('Request received:', {
      title,
      hasPrice: !!price,
      hasImage: !!imageUrl,
      shippingCountry,
      shippingRatesCount: shippingRates.length
    });
    
    // Validate required fields
    if (!title || !price) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: title and price are required' })
      };
    }
    
    // Get Shopify credentials
    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN || process.env.REACT_APP_SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2023-07';
    
    // Check if we have the required credentials
    if (!shopDomain || !accessToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Missing Shopify credentials',
          details: {
            hasDomain: !!shopDomain,
            hasToken: !!accessToken
          }
        })
      };
    }
    
    // Prepare auth headers
    const authHeaders = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': accessToken
    };
    
    // Calculate product price (with 30% markup if necessary)
    let productPrice = price;
    if (typeof price === 'object' && price.product) {
      const basePrice = parseFloat(price.product);
      if (!isNaN(basePrice)) {
        productPrice = (basePrice * 1.3).toFixed(2); // 30% markup
      }
    }
    
    // 1. Create the product via REST API (faster/simpler than GraphQL for product creation)
    const productData = {
      product: {
        title,
        body_html: description || '',
        vendor: 'Dzine.ai App',
        product_type: 'Custom Design',
        status: 'active',
        variants: [
          {
            price: productPrice,
            inventory_management: 'shopify',
            inventory_quantity: 10
          }
        ]
      }
    };
    
    console.log('Creating product with data:', productData);
    
    const productResponse = await fetch(
      `https://${shopDomain}/admin/api/${apiVersion}/products.json`, 
      {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(productData)
      }
    );
    
    if (!productResponse.ok) {
      const errorText = await productResponse.text();
      throw new Error(`Failed to create product: ${productResponse.status} ${errorText}`);
    }
    
    const productResult = await productResponse.json();
    const productId = productResult.product.id;
    console.log(`Product created with ID: ${productId}`);
    
    // 2. Add the image if provided
    let imageResult = null;
    if (imageUrl) {
      try {
        // Create image data
        const imageData = imageUrl.startsWith('data:') 
          ? { 
              image: {
                attachment: imageUrl.split(',')[1],
                filename: `custom-design-${Date.now()}.png`
              }
            }
          : { 
              image: {
                src: imageUrl
              }
            };
        
        // Upload the image
        const imageResponse = await fetch(
          `https://${shopDomain}/admin/api/${apiVersion}/products/${productId}/images.json`,
          {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify(imageData)
          }
        );
        
        if (imageResponse.ok) {
          imageResult = await imageResponse.json();
          console.log(`Image attached to product ${productId}`);
        } else {
          console.error(`Failed to attach image: ${await imageResponse.text()}`);
        }
      } catch (imageError) {
        console.error(`Error attaching image: ${imageError.message}`);
      }
    }
    
    // 3. Set up shipping (only if shipping rates provided)
    let shippingResult = null;
    if (shippingRates && shippingRates.length > 0) {
      try {
        // Convert numeric product ID to GraphQL global ID format
        const graphqlProductId = `gid://shopify/Product/${productId}`;
        const graphqlEndpoint = `https://${shopDomain}/admin/api/${apiVersion}/graphql.json`;
        
        // First check if we already have a profile for this country
        const profileName = `Flat Rate Shipping - ${shippingCountry}`;
        const getProfilesQuery = `
          query {
            shop {
              deliveryProfiles(first: 20) {
                edges {
                  node {
                    id
                    name
                  }
                }
              }
            }
          }
        `;
        
        const profilesResponse = await fetch(graphqlEndpoint, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ query: getProfilesQuery })
        });
        
        if (!profilesResponse.ok) {
          throw new Error(`Failed to get delivery profiles: ${await profilesResponse.text()}`);
        }
        
        const profilesData = await profilesResponse.json();
        console.log('Profiles query response:', JSON.stringify(profilesData));
        
        let existingProfileId = null;
        if (profilesData.data?.shop?.deliveryProfiles?.edges) {
          const matchingProfile = profilesData.data.shop.deliveryProfiles.edges.find(
            edge => edge.node.name === profileName
          );
          
          if (matchingProfile) {
            existingProfileId = matchingProfile.node.id;
            console.log(`Found existing profile: ${profileName} (${existingProfileId})`);
          }
        }
        
        // If no profile exists, create one
        let profileId = existingProfileId;
        if (!profileId) {
          console.log(`Creating new delivery profile: ${profileName}`);
          
          // Prepare shipping rates
          const formattedRates = shippingRates.map(rate => {
            const rateName = rate.name || 'Standard Shipping';
            const ratePrice = parseFloat(rate.price || 5);
            
            return {
              name: rateName,
              methodType: "MANUAL",
              active: true,
              rateProvider: {
                flat: {
                  price: { amount: ratePrice.toFixed(2) }
                }
              }
            };
          });
          
          const createProfileMutation = `
            mutation createDeliveryProfile($profile: DeliveryProfileInput!) {
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
          
          const profileInput = {
            name: profileName,
            profileType: "CUSTOM",
            locationGroup: {
              locationGroupType: "COUNTRY",
              locations: [shippingCountry]
            },
            zoneCountrySelection: {
              countryIds: [shippingCountry],
              restOfWorld: false
            },
            deliveryMethodDefinitions: formattedRates
          };
          
          console.log('Creating profile with input:', JSON.stringify(profileInput));
          
          const createProfileResponse = await fetch(graphqlEndpoint, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({
              query: createProfileMutation,
              variables: { profile: profileInput }
            })
          });
          
          const createProfileResult = await createProfileResponse.json();
          console.log('Create profile response:', JSON.stringify(createProfileResult));
          
          if (createProfileResult.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(createProfileResult.errors)}`);
          }
          
          if (createProfileResult.data?.deliveryProfileCreate?.userErrors?.length > 0) {
            throw new Error(`User errors: ${JSON.stringify(createProfileResult.data.deliveryProfileCreate.userErrors)}`);
          }
          
          profileId = createProfileResult.data?.deliveryProfileCreate?.profile?.id;
          if (!profileId) {
            throw new Error('Failed to get profile ID from creation response');
          }
          
          console.log(`Created delivery profile with ID: ${profileId}`);
        }
        
        // Now assign the product to this profile
        console.log(`Assigning product ${graphqlProductId} to profile ${profileId}`);
        
        // First get the product variants
        const getVariantsQuery = `
          query getVariants($productId: ID!) {
            product(id: $productId) {
              variants(first: 10) {
                edges {
                  node {
                    id
                  }
                }
              }
            }
          }
        `;
        
        const variantsResponse = await fetch(graphqlEndpoint, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            query: getVariantsQuery,
            variables: { productId: graphqlProductId }
          })
        });
        
        const variantsResult = await variantsResponse.json();
        console.log('Variants query response:', JSON.stringify(variantsResult));
        
        if (variantsResult.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(variantsResult.errors)}`);
        }
        
        const variantIds = variantsResult.data?.product?.variants?.edges?.map(edge => edge.node.id) || [];
        if (variantIds.length === 0) {
          throw new Error('No variants found for product');
        }
        
        console.log(`Found ${variantIds.length} variants for product`);
        
        // Now assign variants to the profile
        const assignMutation = `
          mutation assignToProfile($profileId: ID!, $variantIds: [ID!]!) {
            deliveryProfileAssign(
              deliveryProfileId: $profileId, 
              productVariantIds: $variantIds
            ) {
              userErrors {
                field
                message
              }
            }
          }
        `;
        
        const assignResponse = await fetch(graphqlEndpoint, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({
            query: assignMutation,
            variables: { 
              profileId: profileId,
              variantIds: variantIds
            }
          })
        });
        
        const assignResult = await assignResponse.json();
        console.log('Assign to profile response:', JSON.stringify(assignResult));
        
        if (assignResult.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(assignResult.errors)}`);
        }
        
        if (assignResult.data?.deliveryProfileAssign?.userErrors?.length > 0) {
          throw new Error(`User errors: ${JSON.stringify(assignResult.data.deliveryProfileAssign.userErrors)}`);
        }
        
        console.log('Successfully assigned product to delivery profile');
        
        shippingResult = {
          success: true,
          profileId,
          profileName,
          country: shippingCountry,
          rateCount: shippingRates.length
        };
      } catch (shippingError) {
        console.error(`Error setting up shipping: ${shippingError.message}`);
        shippingResult = {
          success: false,
          error: shippingError.message
        };
      }
    }
    
    // Return the complete result
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        product: productResult.product,
        image: imageResult?.image,
        shipping: shippingResult
      })
    };
  } catch (error) {
    console.error('Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
}