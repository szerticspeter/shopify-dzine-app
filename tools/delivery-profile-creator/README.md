# Shopify Delivery Profile Creator

This tool creates a delivery profile with flat shipping rates for Shopify stores using the GraphQL Admin API.

## Setup

1. Create a `.env` file in this directory with your Shopify credentials:

```
SHOPIFY_ADMIN_API_TOKEN=your_access_token
SHOPIFY_STORE=your-store.myshopify.com
```

2. Install dependencies:

```
npm install
```

3. Run the tool:

```
npm start
```

## How to get a Shopify Admin API token

1. Go to your Shopify admin dashboard
2. Navigate to Apps > Develop apps
3. Create a new custom app with Admin API permissions
4. Request scopes for "shipping" write access
5. Install the app in your store
6. Copy the Admin API access token to your .env file
