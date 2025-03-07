// ESM module
import fetch from 'node-fetch';

export const handler = async function(event, context) {
    console.log("Received order from Shopify");
    
    // Add CORS headers for testing
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

    // Check for both naming conventions of the API key
    // Try all possible API key naming conventions
    const GELATO_API_KEY = process.env.GELATO_API_KEY || 
                          process.env.REACT_APP_GELATO_API_KEY ||
                          process.env.NTL_GELATO_API_KEY;
    const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || process.env.REACT_APP_SHOPIFY_ACCESS_TOKEN;
    const SHOPIFY_STORE_DOMAIN = "g2pgc1-08.myshopify.com";
    
    // Log environment variables for debugging
    console.log("Environment variables check:");
    console.log("- GELATO_API_KEY exists:", !!process.env.GELATO_API_KEY);
    console.log("- REACT_APP_GELATO_API_KEY exists:", !!process.env.REACT_APP_GELATO_API_KEY);
    console.log("- Using API key:", !!GELATO_API_KEY);
    
    // Log the actual API key for debugging (only the first few and last few characters)
    if (GELATO_API_KEY && GELATO_API_KEY.length > 10) {
        const start = GELATO_API_KEY.substring(0, 5);
        const end = GELATO_API_KEY.substring(GELATO_API_KEY.length - 5);
        console.log(`API key format check: ${start}...${end} (length: ${GELATO_API_KEY.length})`);
        
        // Check if API key contains suspicious characters
        if (GELATO_API_KEY.includes(" ") || GELATO_API_KEY.includes("\n") || GELATO_API_KEY.includes("\r")) {
            console.log("WARNING: API key contains whitespace characters!");
        }
    }
    
    if (!GELATO_API_KEY) {
        console.error("Missing Gelato API key - please set GELATO_API_KEY in Netlify environment variables");
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Missing Gelato API key configuration" })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (error) {
        console.error("Error parsing request body:", error);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Invalid JSON data" })
        };
    }

    if (!body || !body.id || !body.line_items) {
        console.error("Invalid order data received:", body);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Invalid Shopify order data" })
        };
    }

    console.log("Processing order:", body.id);
    
    try {
        // First, fetch additional product data to get the image URLs
        const lineItemsWithImages = await Promise.all(body.line_items.map(async (item) => {
            // Get the product variant to extract the image
            const productVariantId = item.variant_id;
            const productId = item.product_id;
            
            console.log(`Fetching product ${productId} and variant ${productVariantId}`);
            
            // Fetch the product data to get the image URL
            const productResponse = await fetch(
                `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/products/${productId}.json`, 
                {
                    headers: {
                        "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN
                    }
                }
            );
            
            if (!productResponse.ok) {
                throw new Error(`Error fetching product: ${productResponse.status}`);
            }
            
            const productData = await productResponse.json();
            console.log("Product data:", JSON.stringify(productData));
            
            // Try to get the image URL from different places
            let imageUrl;
            
            // Option 1: Images array in product data
            if (productData.product.images && productData.product.images.length > 0) {
                imageUrl = productData.product.images[0].src;
                console.log("Found image in product images array");
            } 
            // Option 2: Single image property
            else if (productData.product.image && productData.product.image.src) {
                imageUrl = productData.product.image.src;
                console.log("Found image in product.image property");
            } 
            // Option 3: Check if the order line item has image data
            else if (item.properties && item.properties.some(prop => prop.name === "image_url")) {
                const imageProp = item.properties.find(prop => prop.name === "image_url");
                imageUrl = imageProp.value;
                console.log("Found image URL in line item properties");
            }
            // Option 4: Use a fallback approach - fetch the original product from our database
            else {
                console.log("No image found in product data, need to use an alternative approach");
                
                // Try to fetch metafields to see if we stored the image URL there
                try {
                    const metafieldResponse = await fetch(
                        `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/products/${productId}/metafields.json`,
                        {
                            headers: {
                                "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN
                            }
                        }
                    );
                    
                    if (metafieldResponse.ok) {
                        const metafields = await metafieldResponse.json();
                        console.log("Product metafields:", JSON.stringify(metafields));
                        
                        // Find our custom image URL metafield
                        const imageUrlMetafield = metafields.metafields.find(meta => 
                            meta.key === "canvas_image_url" && meta.namespace === "custom"
                        );
                        
                        if (imageUrlMetafield) {
                            imageUrl = imageUrlMetafield.value;
                            console.log("Found image URL in metafields:", imageUrl);
                            
                            // Check if it's a blob URL which won't work with external services
                            if (imageUrl.startsWith('blob:')) {
                                console.log("Found blob URL in metafields, replacing with fixed image");
                                imageUrl = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2245&q=80";
                            }
                        } else {
                            // Fallback to a default image
                            imageUrl = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2245&q=80"; // Van Gogh's Starry Night
                            console.log("Using fallback image URL from Unsplash");
                        }
                    } else {
                        throw new Error("Could not fetch metafields");
                    }
                } catch (error) {
                    console.error("Error fetching metafields:", error.message);
                    // Fallback to a default image as last resort
                    imageUrl = "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=2245&q=80"; // Van Gogh's Starry Night
                    console.log("Using fallback image URL from Unsplash after error");
                }
            }
            
            return {
                productUid: "wall-art_wa_canvas_ccnv_canvas", // Full Gelato product UID for canvas based on their catalog
                copies: item.quantity,
                fileUrl: imageUrl,
                metadata: {
                    productId: productId,
                    variantId: productVariantId,
                    orderId: body.id
                }
            };
        }));
        
        // Extract shipping information
        let recipient = {};
        if (body.shipping_address) {
            recipient = {
                name: `${body.shipping_address.first_name} ${body.shipping_address.last_name}`,
                email: body.email,
                address1: body.shipping_address.address1,
                address2: body.shipping_address.address2 || "",
                city: body.shipping_address.city,
                state: body.shipping_address.province,
                country: body.shipping_address.country_code,
                postalCode: body.shipping_address.zip,
                phone: body.shipping_address.phone || body.phone
            };
        } else {
            throw new Error("No shipping address found in order");
        }
        
        // Construct the Gelato order data according to v4 API documentation
        const gelatoOrderData = {
            orderType: "order",
            orderReferenceId: body.id.toString(),
            customerReferenceId: body.customer ? body.customer.id.toString() : "guest-customer",
            currency: body.currency || "USD",
            items: lineItemsWithImages.map(item => ({
                itemReferenceId: item.metadata.variantId.toString(),
                productUid: "wall-art_wa_canvas_ccnv_canvas", // Valid product ID from Gelato catalog
                files: [
                    {
                        type: "default",
                        url: item.fileUrl
                    }
                ],
                quantity: item.copies
            })),
            shipmentMethodUid: "express",
            shippingAddress: {
                firstName: body.shipping_address.first_name || "",
                lastName: body.shipping_address.last_name || "",
                addressLine1: body.shipping_address.address1,
                addressLine2: body.shipping_address.address2 || "",
                state: body.shipping_address.province,
                city: body.shipping_address.city,
                postCode: body.shipping_address.zip,
                country: body.shipping_address.country_code,
                email: body.email,
                phone: body.shipping_address.phone || body.phone || ""
            }
        };
        
        console.log("Sending to Gelato:", JSON.stringify(gelatoOrderData));
        console.log("Using Gelato API key (first 5 chars):", GELATO_API_KEY.substring(0, 5) + "...");

        // Make sure API key doesn't have any whitespace or formatting issues
        const cleanApiKey = GELATO_API_KEY.trim();
        console.log("Using cleaned API key");
        
        // Test with a simpler Gelato API request first to verify authentication
        // Using the exact endpoint and header format that worked in Postman
        console.log("Testing authentication with GET request to orders endpoint");
        const testAuthResponse = await fetch("https://order.gelatoapis.com/v4/orders", {
            method: "GET",
            headers: {
                "X-API-KEY": cleanApiKey
            }
        });
        
        if (!testAuthResponse.ok) {
            console.error("Authentication test failed:", await testAuthResponse.text());
            console.error("Your Gelato API key may be invalid. Please check your API key in Netlify environment variables.");
            throw new Error("Gelato API authentication failed. Please check your API key.");
        } else {
            console.log("Gelato API authentication successful!");
        }
        
        // Send the order to Gelato using the exact header format that worked in Postman
        console.log("Sending order to Gelato API");
        const gelatoResponse = await fetch("https://order.gelatoapis.com/v4/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": cleanApiKey
            },
            body: JSON.stringify(gelatoOrderData)
        });
        
        // Handle response
        if (!gelatoResponse.ok) {
            const errorText = await gelatoResponse.text();
            throw new Error(`Gelato API error: ${gelatoResponse.status} - ${errorText}`);
        }

        const gelatoData = await gelatoResponse.json();
        console.log("Order sent to Gelato:", gelatoData);
        
        // Update the Shopify order with fulfillment information
        // This would be handled in a real implementation

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: "Order successfully sent to Gelato", 
                gelato_response: gelatoData,
                order_id: body.id
            })
        };
    } catch (error) {
        console.error("Error processing order:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
