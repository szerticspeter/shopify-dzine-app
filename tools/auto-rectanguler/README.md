# Canvas Rectangle Detector

A browser-based tool that automatically detects the four corners of a rectangular canvas in product images.

## Features

- **Automatic Detection**: Uses computer vision algorithms to detect rectangular canvas areas in product images
- **Multiple Detection Methods**:
  - Contour Detection: Identifies the largest rectangle using contour analysis
  - Hough Line Transform: Finds the most prominent lines and their intersections
  - Combined Method: Uses both approaches for more robust detection
- **Manual Adjustment**: Drag corner markers to fine-tune detection results
- **Visual Feedback**: Shows edge detection results to help configure detection parameters
- **Parameter Tuning**: Adjust edge detection thresholds and blur for optimal results
- **Export Results**: Save corner coordinates in JSON format

## How It Works

1. **Image Processing**:
   - Converts image to grayscale
   - Applies Gaussian blur to reduce noise
   - Uses Canny edge detection to find edges
   - Identifies rectangular shapes using either contour analysis or line detection

2. **Detection Algorithms**:
   - **Contour Method**: Finds all contours in the image, approximates them as polygons, and identifies the largest 4-sided contour that's convex (rectangle)
   - **Hough Line Method**: Detects straight lines in the image, groups them into horizontal and vertical lines, and finds their intersections
   - **Combined Method**: Tries contour method first, falls back to Hough lines if contour detection fails

3. **Result Processing**:
   - Sorts corners in clockwise order (top-left, top-right, bottom-right, bottom-left)
   - Allows manual adjustment of corners
   - Exports coordinates in standardized JSON format

## Usage

1. Open `index.html` in a web browser
2. Upload a product image (works best with white/light canvas against contrasting background)
3. Adjust detection parameters if needed
4. Click "Detect Rectangle"
5. Fine-tune corner positions by dragging markers if necessary
6. Click "Export JSON" to save the coordinates

## Requirements

- Modern web browser with JavaScript enabled
- Internet connection (for loading OpenCV.js library)

## JSON Output Format

```json
{
  "image_name": "filename.jpg",
  "corners": [
    {"x": 123, "y": 45},
    {"x": 678, "y": 45},
    {"x": 678, "y": 450},
    {"x": 123, "y": 450}
  ]
}
```

## Limitations

- Works best with clear, high-contrast images
- Canvas should be photographed straight-on, not at an angle
- May struggle with complex backgrounds or heavily textured canvas
- Requires manual adjustment for challenging images