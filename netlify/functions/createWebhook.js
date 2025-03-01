exports.handler = async function(event, context) {
    console.log("Creating Shopify webhook");
    
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
    
    // Your Netlify site URL
    const NETLIFY_SITE_URL = "https://shopify-dzine.netlify.app";
    
    if (!SHOPIFY_ACCESS_TOKEN) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: "Missing Shopify access token" })
        };
    }
    
    try {
        // Create webhook for order creation
        const webhookResponse = await fetch(
            `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/webhooks.json`,
            {
                method: "POST",
                headers: {
                    "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    webhook: {
                        topic: "orders/create",
                        address: `${NETLIFY_SITE_URL}/.netlify/functions/gelatoOrder`,
                        format: "json"
                    }
                })
            }
        );
        
        if (!webhookResponse.ok) {
            const errorText = await webhookResponse.text();
            throw new Error(`Shopify API error: ${webhookResponse.status} - ${errorText}`);
        }
        
        const data = await webhookResponse.json();
        console.log("Webhook created:", data);
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
                message: "Webhook created successfully", 
                webhook: data.webhook
            })
        };
    } catch (error) {
        console.error("Error creating webhook:", error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};