// ESM module
import fetch from 'node-fetch';

export const handler = async function(event, context) {
    console.log("Function started");

    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight OPTIONS request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;  // Changed from REACT_APP_ prefix
    const SHOPIFY_STORE_DOMAIN = "g2pgc1-08.myshopify.com";

    if (!event.body) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Request body is missing. Please send JSON data." })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Invalid JSON format" })
        };
    }

    const imageUrl = body.imageUrl;

    if (!imageUrl) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Missing imageUrl in request body" })
        };
    }

    console.log("Creating product with image:", imageUrl);

    const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/products.json`;

    // Store the image URL as a metafield for later retrieval
    const productData = {
        product: {
            title: "Custom Canvas Print",
            body_html: "<strong>Stylized artwork on a 30x40cm canvas.</strong>",
            vendor: "Dzine AI",
            product_type: "Canvas",
            images: [{ src: imageUrl }],
            variants: [
                {
                    option1: "Default",
                    price: "49.99",
                    sku: "CUSTOM-CANVAS-30x40",
                    metafields: [
                        {
                            key: "image_url",
                            value: imageUrl,
                            type: "single_line_text_field",
                            namespace: "custom"
                        }
                    ]
                }
            ],
            metafields: [
                {
                    key: "canvas_image_url",
                    value: imageUrl,
                    type: "single_line_text_field",
                    namespace: "custom"
                }
            ]
        }
    };

    try {
        if (!SHOPIFY_ACCESS_TOKEN) {
            throw new Error("Missing Shopify access token. Please check your environment variables.");
        }

        console.log("Using token:", SHOPIFY_ACCESS_TOKEN ? "Token exists" : "Token missing");
        
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Product Created Successfully:", data);

        // Extract the product ID for checkout
        const productId = data.product.variants[0].id;
        const checkoutUrl = `https://${SHOPIFY_STORE_DOMAIN}/cart/${productId}:1`;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: "Product created successfully",
                product: data,
                checkoutUrl: checkoutUrl
            })
        };
    } catch (error) {
        console.error("Error creating product:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
