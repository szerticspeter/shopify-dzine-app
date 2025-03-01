exports.handler = async function(event, context) {
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

    const GELATO_API_KEY = process.env.GELATO_API_KEY;
    const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
    const SHOPIFY_STORE_DOMAIN = "g2pgc1-08.myshopify.com";
    
    if (!GELATO_API_KEY) {
        console.error("Missing Gelato API key");
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
            
            // Get the image URL from the product
            const imageUrl = productData.product.images[0]?.src;
            
            if (!imageUrl) {
                throw new Error(`No image found for product ${productId}`);
            }
            
            return {
                productUid: "canvas_30x40cm", // Gelato product UID for 30x40cm canvas
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
        
        // Construct the Gelato order data
        const gelatoOrderData = {
            orderType: "dropship",
            currency: body.currency || "USD",
            externalOrderId: body.id.toString(),
            items: lineItemsWithImages.map(item => ({
                ...item,
                recipient: recipient
            }))
        };
        
        console.log("Sending to Gelato:", JSON.stringify(gelatoOrderData));

        // Send the order to Gelato
        const gelatoResponse = await fetch("https://order.gelatoapis.com/v2/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GELATO_API_KEY}`
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
