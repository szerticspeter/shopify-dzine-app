# Product Template Creator App

This backoffice tool helps define the exact area on product stock photos where customer images should be placed.

## Purpose

This tool allows administrators to:
- Upload stock photos of products (e.g., canvas prints, mugs)
- Define the exact rectangular area where user-uploaded images will be displayed
- Mark the four corners of this area visually
- Save these coordinates for use in the image fitting tool
- Export template configurations for use in the main application

## How It Works

1. Upload a product stock photo (e.g., a canvas on a wall)
2. Click to mark the four corners of the rectangular area where user images should appear
3. Save the coordinates to define the image placement zone
4. Use these coordinates in the main app's image editor to show users the correct placement area

## Setup

```
cd tools/product-template-creator-app
npm install
npm start
```

## Note

This is an internal admin tool and is not part of the customer-facing application.