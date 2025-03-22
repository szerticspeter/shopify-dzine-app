# Dzine App Tools

This directory contains internal tools for the Dzine.ai Canvas App with Prodigi Integration.

## Available Tools

### Product Template Creator App

A tool for manually defining the placement area on product stock photos where customer images should appear.

#### Running the Tool

There are multiple ways to launch the Product Template Creator:

1. **From the main application UI**:
   - Click the "Admin: Template Creator" link in the header which will open the standalone HTML version

2. **Directly open the standalone HTML file**:
   - Open `/tools/product-template-creator-app/standalone.html` in any browser
   - No server required - works completely locally

3. **Server-based version** (if needed):
   ```
   cd tools/product-template-creator-app
   npm install
   npm start
   ```

### Auto Rectangle Detector

A tool that uses computer vision to automatically detect rectangular canvas areas in product images.

#### Running the Tool

1. **Directly open the HTML file**:
   - Open `/tools/auto-rectanguler/index.html` in any browser
   - No server required - works completely locally

2. **Using the launcher script**:
   ```
   node tools/launcher.js auto-rectanguler
   ```

## Tool Descriptions

### Product Template Creator

This tool allows administrators to:
- Upload product stock photos (canvas, mugs, etc.)
- Visually mark the four corners of the area where customer photos should be placed
- Export the coordinates as JSON for use in the main app's image editor
- Create templates for different product types

Output files are saved in JSON format with placement coordinates for each corner.

### Auto Rectangle Detector

This tool provides automated detection of rectangular areas in product images:
- Uses OpenCV.js for computer vision processing
- Offers multiple detection algorithms (contour detection, Hough lines, combined approach)
- Provides manual adjustment of automatically detected corners
- Exports coordinates in the same JSON format as the Product Template Creator
- Ideal for quickly creating templates for rectangular canvas products