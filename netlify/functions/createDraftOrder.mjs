// ESM module
import fetch from 'node-fetch';

export const handler = async function(event, context) {
    console.log("Create Draft Order function started");

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

    const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
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

    const { imageUrl, customerId = null, title = "Custom Canvas Print", price = "49.99" } = body;

    if (!imageUrl) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: "Missing imageUrl in request body" })
        };
    }

    console.log("Creating draft order with image:", imageUrl);

    const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/draft_orders.json`;

    // Create the draft order data - simplifying the approach for testing
    const draftOrderData = {
        draft_order: {
            line_items: [
                {
                    title: title,
                    price: price,
                    quantity: 1,
                    requires_shipping: true
                }
            ],
            note: `Custom image URL: ${imageUrl}`,
            note_attributes: [
                {
                    name: "final_image_url",
                    value: imageUrl
                },
                {
                    name: "dzine_ai_stylized",
                    value: "true"
                }
            ]
        }
    };

    // Add customer if provided
    if (customerId) {
        draftOrderData.draft_order.customer = { id: customerId };
    }
    
    console.log("Draft order request data:", JSON.stringify(draftOrderData, null, 2));

    try {
        if (!SHOPIFY_ACCESS_TOKEN) {
            throw new Error("Missing Shopify access token. Please check your environment variables.");
        }

        console.log("Using token:", SHOPIFY_ACCESS_TOKEN ? "Token exists" : "Token missing");
        
        console.log("Sending request to: ", url);
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(draftOrderData)
        });

        console.log("Response status:", response.status);
        
        const responseBody = await response.text();
        console.log("Response body:", responseBody);
        
        if (!response.ok) {
            throw new Error(`Shopify API error: ${response.status} - ${responseBody}`);
        }

        // Parse the response
        let data;
        try {
            data = JSON.parse(responseBody);
        } catch (e) {
            throw new Error(`Failed to parse response: ${e.message}. Response was: ${responseBody}`);
        }
        
        console.log("Draft Order Created Successfully:", data);

        // Get invoice URL for payment
        const draftOrderId = data.draft_order.id;
        const invoiceUrl = data.draft_order.invoice_url;

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                message: "Draft order created successfully",
                draftOrder: data,
                invoiceUrl: invoiceUrl
            })
        };
    } catch (error) {
        console.error("Error creating draft order:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};