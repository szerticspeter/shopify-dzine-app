# Dzine.ai Canvas App with Shopify and Prodigi Integration

This powerful and user-friendly application provides multiple ecommerce workflows for users to:
1. Upload an image
2. Apply artistic styles using Dzine.ai's AI image transformations
3. Position and customize the stylized image on products
4. Complete checkout through either Shopify or Prodigi

## Features

- **AI Image Transformation**: Transform ordinary photos into artistic masterpieces
- **Dual Integration**: Support for both Shopify and Prodigi fulfillment
- **Interactive Image Editor**: Allows users to position, scale and crop images
- **Checkout Recovery**: Smart recovery for interrupted checkout sessions
- **Flexible Deployment**: Serverless functions for backend operations

## Setup Instructions

### 1. Shopify Integration (Primary Workflow)

1. Create a Shopify store and obtain API credentials
2. Set the following environment variables in Netlify:
   - `SHOPIFY_STORE_DOMAIN` - Your Shopify store domain
   - `SHOPIFY_ACCESS_TOKEN` - Your Shopify admin API access token
   - `SHOPIFY_API_VERSION` - (Optional) Shopify API version (defaults to 2023-07)

### 2. Prodigi Integration (Alternative Workflow)

1. Sign up for a Prodigi account at [https://www.prodigi.com/](https://www.prodigi.com/)
2. Get your Prodigi WebSDK client key
3. Update the `PRODIGI_CLIENT_KEY` constant in `src/ProductSelect.js`
4. Set the `REACT_APP_PRODIGI_API_KEY` environment variable in Netlify

### 3. Dzine.ai API Configuration

1. Obtain an API key from Dzine.ai
2. Set the `REACT_APP_DZINE_API_KEY` environment variable in Netlify

### 4. Deploy the Application

```
npm install
npm run build
netlify deploy --prod
```

## How It Works

### Shopify Workflow

1. Users upload their image in the app
2. The image is processed by Dzine.ai to apply artistic styles
3. Users select and preview their stylized image in the image editor
4. Upon clicking "Crop & Continue":
   - The image is cropped according to the product template
   - A new product is created in Shopify with the custom image
   - The user is redirected to Shopify checkout
5. Order fulfillment is handled by Shopify

### Prodigi Workflow

1. Users upload their image in the app
2. The image is processed by Dzine.ai to apply artistic styles
3. Users select from available product types (canvas, mug, t-shirt)
4. The stylized image is passed to Prodigi's Web SDK
5. Users can customize their product in Prodigi's interface
6. Checkout and payment are handled by Prodigi

## Advanced Configuration

- **Custom Product Parameters**: Pass parameters via URL:
  ```
  /editor?title=Custom%20Canvas&price=45.00&description=My%20description
  ```

- **Preview Mode**: Enable product preview before checkout:
  ```
  /editor?preview=true
  ```

- **Custom Redirects**: Use custom redirect URLs:
  ```
  /editor?redirect=https://example.com/checkout/{variantId}
  ```

## Additional Notes

- For production use, implement proper image storage in the `saveEditedImage.mjs` function
- Test the checkout process using the debug tools in `/public/checkout-test.html`
- List existing products with `/public/product-listing.html`