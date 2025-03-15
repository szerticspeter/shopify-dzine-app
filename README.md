# Dzine.ai Canvas App with Prodigi Integration

This amazing and user-friendly application provides a seamless workflow for users to:
1. Upload an image
2. Apply artistic styles using Dzine.ai
3. Select from multiple product types (canvas, mug, t-shirt)
4. Order the product with their stylized image through Prodigi

## Setup Instructions

### 1. Configure Prodigi Web-to-Print SDK

1. Sign up for a Prodigi account at [https://www.prodigi.com/](https://www.prodigi.com/)
2. Get your Prodigi WebSDK client key
3. Update the `PRODIGI_CLIENT_KEY` constant in `src/ProductSelect.js`

### 2. Update Environment Variables

Make sure your Netlify environment variables include:
- `DZINE_API_KEY` - Your Dzine.ai API key

### 3. Deploy the Application

```
npm install
npm run build
netlify deploy --prod
```

## How It Works

1. Users upload their image in the app
2. The image is processed by Dzine.ai to apply artistic styles
3. Users select from available product types (canvas, mug, t-shirt)
4. The stylized image is passed to Prodigi's Web SDK
5. Users can customize their product in Prodigi's interface
6. Checkout and payment are handled by Prodigi

## Additional Notes

- For production use, uncomment the Dzine.ai API implementation in App.js
- You can test the workflow with the mock implementation currently in place
- Update the Prodigi product SKUs in ProductSelect.js with your actual Prodigi SKUs