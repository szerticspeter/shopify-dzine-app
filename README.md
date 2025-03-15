# Shopify Dzine.ai Canvas App with Gelato Integration

This amazing application provides a seamless workflow for users to:
1. Upload an image to your Shopify store
2. Apply artistic styles using Dzine.ai
3. Send the stylized image to Gelato's Personalization Studio
4. Order the image printed on canvas or other products

## Setup Instructions

### 1. Configure Gelato Personalization Studio

1. Log in to your Gelato account
2. Create a customizable product in Gelato Personalization Studio
3. Get the product URL and update the `GELATO_PRODUCT_URL` constant in `src/ProductCreate.js`

### 2. Update Environment Variables

Make sure your Netlify environment variables include:
- `DZINE_API_KEY` - Your Dzine.ai API key
- `SHOPIFY_ACCESS_TOKEN` - Your Shopify admin API access token
- `GELATO_API_KEY` - Your Gelato API key

### 3. Deploy the Application

```
npm install
npm run build
netlify deploy --prod
```

## How It Works

1. Users upload their image in the app
2. The image is processed by Dzine.ai to apply artistic styles
3. The stylized image is passed to Gelato Personalization Studio via URL parameter
4. Users can customize their product in Gelato's interface
5. Checkout and payment are handled by Gelato

## Additional Notes

- For production use, uncomment the Dzine.ai API implementation in App.js
- You can test the workflow with the mock implementation currently in place
- Update the product URL in ProductCreate.js with your actual Gelato product URL