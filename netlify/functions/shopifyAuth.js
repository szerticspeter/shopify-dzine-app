exports.handler = async function(event, context) {
    console.log("Function started");

    const SHOPIFY_ACCESS_TOKEN = process.env.REACT_APP_SHOPIFY_ACCESS_TOKEN;
    const SHOPIFY_STORE_DOMAIN = process.env.REACT_APP_SHOPIFY_STORE_DOMAIN;

    console.log("Using Shopify domain:", SHOPIFY_STORE_DOMAIN);

    const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/shop.json`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
                "Content-Type": "application/json"
            }
        });

        console.log("HTTP Response Status:", response.status);

        if (!response.ok) {
            const errorText = await response.text();  // Get full error details
            throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Shopify API Response:", data);

        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error("Error fetching Shopify data:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
