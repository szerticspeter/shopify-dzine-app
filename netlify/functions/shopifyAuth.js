exports.handler = async function(event, context) {
    console.log("Function started");

    const SHOPIFY_ACCESS_TOKEN = process.env.REACT_APP_SHOPIFY_ACCESS_TOKEN;
    const SHOPIFY_STORE_DOMAIN = "g2pgc1-08.myshopify.com";  // Fixed your store domain

    // Check if the request body exists
    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Request body is missing. Please send JSON data." })
        };
    }

    let body;
    try {
        body = JSON.parse(event.body);
    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid JSON format" })
        };
    }

    const imageUrl = body.imageUrl; // Extract image URL

    if (!imageUrl) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing imageUrl in request body" })
        };
    }

    console.log("Creating product with image:", imageUrl);

    const url = `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2023-10/products.json`;

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
                    sku: "CUSTOM-CANVAS-30x40"
                }
            ]
        }
    };

    try {
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

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Product created successfully", product: data })
        };
    } catch (error) {
        console.error("Error creating product:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
