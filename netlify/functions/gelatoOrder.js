exports.handler = async function(event, context) {
    console.log("Received order from Shopify");

    const GELATO_API_KEY = process.env.GELATO_API_KEY;
    const body = JSON.parse(event.body);

    if (!body || !body.id || !body.line_items) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid Shopify order data" })
        };
    }

    console.log("Processing order:", body.id);

    // Extract order details
    const orderId = body.id;
    const lineItems = body.line_items.map(item => ({
        productUid: "canvas_30x40", // Replace with the correct Gelato product UID
        copies: item.quantity,
        fileUrl: item.image ? item.image.src : null,
        recipient: {
            name: body.customer.first_name + " " + body.customer.last_name,
            email: body.contact_email || body.email,
            address1: body.shipping_address.address1,
            city: body.shipping_address.city,
            country: body.shipping_address.country,
            postalCode: body.shipping_address.zip
        }
    }));

    const gelatoOrderData = {
        orderType: "shopify",
        externalOrderId: orderId.toString(),
        items: lineItems
    };

    try {
        const response = await fetch("https://order.gelatoapis.com/v1/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GELATO_API_KEY}`
            },
            body: JSON.stringify(gelatoOrderData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gelato API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log("Order sent to Gelato:", data);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Order successfully sent to Gelato", data })
        };
    } catch (error) {
        console.error("Error sending order to Gelato:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
