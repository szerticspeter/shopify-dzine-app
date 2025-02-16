exports.handler = async function(event, context) {
    // Load environment variables (Shopify credentials)
    const SHOPIFY_ACCESS_TOKEN = process.env.REACT_APP_SHOPIFY_ACCESS_TOKEN;
    const SHOPIFY_STORE_DOMAIN = process.env.REACT_APP_SHOPIFY_STORE_DOMAIN;

    // Shopify API endpoint
    const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/shop.json`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
                "Content-Type": "application/json"
            }
        });

        // Check if request was successful
        if (!response.ok) {
            throw new Error(`Shopify API error: ${response.statusText}`);
        }

        // Convert response to JSON
        const data = await response.json();

        // Return the response
        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
