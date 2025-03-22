import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Preload the canvas image
const preloadedCanvasImage = new Image();
preloadedCanvasImage.src = '/images/products/canvas16x20.png';

const ImageEditor = () => {
  const [image, setImage] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [printableCorners, setPrintableCorners] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  // Removed resizing state
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const productImageRef = useRef(null);
  const containerRef = useRef(null);

  // Canvas dimensions - maintain the product image aspect ratio
  const CANVAS_WIDTH = 800;
  let CANVAS_HEIGHT = 800; // Will be dynamically updated

  // Image position and scale
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  // Scale will be set once when the image loads
  const [imageScale, setImageScale] = useState(1);
  
  // Constants for the resize handles (visual only now)
  const HANDLE_SIZE = 20; // Size of the corner resize handles
  const CORNERS = ['nw', 'ne', 'se', 'sw']; // Corner positions

  useEffect(() => {
    // Set up canvas size based on a fixed aspect ratio
    const canvasElement = canvasRef.current;
    if (canvasElement) {
      CANVAS_HEIGHT = CANVAS_WIDTH * (1066 / 1000); // Approximate ratio for canvas16x20
      canvasElement.width = CANVAS_WIDTH;
      canvasElement.height = CANVAS_HEIGHT;
    }

    // Load the product image and printable area corners - try different path formats
    // to handle various development and production setups
    const productImagePaths = [
      '/images/products/canvas16x20.png',
      './images/products/canvas16x20.png',
      '../images/products/canvas16x20.png',
      'images/products/canvas16x20.png',
      process.env.PUBLIC_URL + '/images/products/canvas16x20.png',
      window.location.origin + '/images/products/canvas16x20.png'
    ];
    const cornersJsonUrl = './images/products/canvas16x20.json';
    
    // Fetch the corners data first
    fetch(cornersJsonUrl)
      .then(response => response.json())
      .then(data => {
        console.log("Loaded corners data:", data.corners);
        setPrintableCorners(data.corners);
        
        // After loading corners, try loading the product image from different paths
        tryLoadProductImage(productImagePaths, 0, data.corners);
      })
      .catch(error => {
        console.error('Error loading printable area data:', error);
        // Try to load images anyway
        tryLoadProductImage(productImagePaths, 0, []);
      });
  }, []);

  // Try loading product image from different possible paths
  const tryLoadProductImage = (paths, index, corners) => {
    if (index >= paths.length) {
      console.error("Failed to load product image from any path");
      
      // Try one more approach
      const lastAttemptImg = new Image();
      lastAttemptImg.crossOrigin = "Anonymous";
      lastAttemptImg.onload = () => {
        console.log("✓ Product image loaded with final attempt!");
        setProductImage(lastAttemptImg);
        productImageRef.current = lastAttemptImg;
        loadUserImage(lastAttemptImg, corners);
      };
      lastAttemptImg.onerror = (e) => {
        console.error("✗ All product image loading approaches failed:", e);
        // Try to load just the user image with a default positioning
        loadUserImage(null, corners);
      };
      
      // Try with direct URL that ignores the router/base path
      const absoluteUrl = 'http://localhost:3000/images/products/canvas16x20.png';
      console.log("💡 Last attempt with direct URL:", absoluteUrl);
      lastAttemptImg.src = absoluteUrl;
      return;
    }
    
    const path = paths[index];
    console.log(`💻 [${index+1}/${paths.length}] Trying to load product image from path: ${path}`);
    
    const productImg = new Image();
    productImg.crossOrigin = "Anonymous"; // Try with CORS enabled
    productImg.onload = () => {
      console.log("✓ Product image loaded successfully from:", path);
      console.log("✓ Image dimensions:", productImg.width, "x", productImg.height);
      if (productImg.width === 0 || productImg.height === 0) {
        console.warn("⚠️ Image loaded but has zero dimensions, trying next path...");
        tryLoadProductImage(paths, index + 1, corners);
        return;
      }
      setProductImage(productImg);
      productImageRef.current = productImg;
      loadUserImage(productImg, corners);
    };
    productImg.onerror = (e) => {
      console.warn(`✗ Failed to load product image from: ${path}`, e);
      console.log("⤷ Trying next path...");
      tryLoadProductImage(paths, index + 1, corners);
    };
    productImg.src = path;
  };
  
  // Load the user's stylized image
  const loadUserImage = (productImg, corners) => {
    // Use the test image URL (replace with user uploaded image in production)
    const testImageUrl = 'https://static.dzine.ai/open_product/20250322/54/img2img/1_output_1742650385000203_jrmL0.webp';
    
    // Preload the user image
    const userImg = new Image();
    userImg.crossOrigin = "Anonymous"; // Enable CORS for the image
    userImg.onload = () => {
      console.log("User image loaded successfully");
      setImage(userImg);
      imageRef.current = userImg;
      
      // Position the image based on corners data
      positionUserImage(userImg, productImg, corners);
    };
    userImg.onerror = (e) => {
      console.error("Error loading user image:", e);
    };
    userImg.src = testImageUrl;
  };

  const positionUserImage = (userImg, productImg, corners) => {
    if (corners && corners.length === 4) {
      // Calculate the printable area dimensions and center
      const printableWidth = Math.abs(corners[1].x - corners[0].x);
      const printableHeight = Math.abs(corners[3].y - corners[0].y);
      
      // Calculate the scale factor for product image to canvas
      const scaleFactorX = CANVAS_WIDTH / productImg.width;
      const scaleFactorY = CANVAS_HEIGHT / productImg.height;
      
      // Calculate the printable area dimensions on the canvas
      const canvasPrintableWidth = printableWidth * scaleFactorX;
      const canvasPrintableHeight = printableHeight * scaleFactorY;
      
      // Calculate the center of the printable area on the canvas
      const centerX = (corners[0].x + corners[1].x) / 2 * scaleFactorX;
      const centerY = (corners[0].y + corners[3].y) / 2 * scaleFactorY;
      
      // Calculate scale to better fill the printable area
      const scaleX = canvasPrintableWidth / userImg.width;
      const scaleY = canvasPrintableHeight / userImg.height;
      const aspectRatio = userImg.width / userImg.height;
      const printableAreaRatio = canvasPrintableWidth / canvasPrintableHeight;
      
      // Use a scaling approach that fills more of the canvas while maintaining aspect ratio
      let scale;
      if (aspectRatio > printableAreaRatio) {
        // For wider images, fill the height
        scale = scaleY;
      } else {
        // For taller images, fill the width
        scale = scaleX;
      }
      setImageScale(scale);
      
      // Center the image in the printable area
      setImagePosition({
        x: centerX - (userImg.width * scale / 2),
        y: centerY - (userImg.height * scale / 2)
      });
    } else {
      // Default positioning if we don't have printable area data
      setImagePosition({
        x: (CANVAS_WIDTH - userImg.width) / 2,
        y: (CANVAS_HEIGHT - userImg.height) / 2
      });
      
      // Set initial scale to better fill the canvas
      const scaleX = CANVAS_WIDTH / userImg.width;
      const scaleY = CANVAS_HEIGHT / userImg.height;
      const aspectRatio = userImg.width / userImg.height;
      const canvasRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
      
      // Use a scaling approach that fills more of the canvas while maintaining aspect ratio
      let scale;
      if (aspectRatio > canvasRatio) {
        // For wider images, fill the height
        scale = scaleY;
      } else {
        // For taller images, fill the width
        scale = scaleX;
      }
      setImageScale(scale);
    }
  };

  useEffect(() => {
    // Redraw canvas when relevant states change
    drawCanvas();
  }, [imagePosition, imageScale, image, productImage, printableCorners]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Step 1: Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Step 2: Draw the product image (canvas background)
    console.log("Drawing product image");
    if (productImageRef.current) {
      console.log("Using image from state:", productImageRef.current.width, "x", productImageRef.current.height);
      ctx.drawImage(productImageRef.current, 0, 0, canvas.width, canvas.height);
    } else if (preloadedCanvasImage.complete && preloadedCanvasImage.width > 0) {
      console.log("Using preloaded image:", preloadedCanvasImage.width, "x", preloadedCanvasImage.height);
      ctx.drawImage(preloadedCanvasImage, 0, 0, canvas.width, canvas.height);
      setProductImage(preloadedCanvasImage);
      productImageRef.current = preloadedCanvasImage;
    } else {
      console.error("No product image available - showing placeholder");
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#aaaaaa';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
    
    // Step 3: Check if we can calculate the printable area
    if (printableCorners.length !== 4 || !productImageRef.current) {
      console.warn("No printable area data or product image available");
      
      // Just draw the user image without any overlay
      if (imageRef.current) {
        ctx.save();
        ctx.translate(imagePosition.x, imagePosition.y);
        ctx.scale(imageScale, imageScale);
        ctx.drawImage(imageRef.current, 0, 0);
        ctx.restore();
      }
      
      return;
    }
    
    // We have printable area data and product image, proceed with proper overlay
    const scaleFactorX = canvas.width / productImageRef.current.width;
    const scaleFactorY = canvas.height / productImageRef.current.height;
    
    // No longer need to apply clipping or draw the image here, as we handle it in Step 4
    // This section is now effectively removed to prevent duplicate drawing
    
    // Step 4: Draw the user image first without clipping
    if (imageRef.current) {
      // First draw the entire image
      ctx.save();
      ctx.translate(imagePosition.x, imagePosition.y);
      ctx.scale(imageScale, imageScale);
      ctx.drawImage(imageRef.current, 0, 0);
      ctx.restore();
      
      // Then apply a semi-transparent overlay to parts outside the printable area
      ctx.save();
      
      // Create a path for the entire canvas
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      
      // Cut out the printable area
      ctx.moveTo(printableCorners[0].x * scaleFactorX, printableCorners[0].y * scaleFactorY);
      for (let i = 1; i < printableCorners.length; i++) {
        ctx.lineTo(printableCorners[i].x * scaleFactorX, printableCorners[i].y * scaleFactorY);
      }
      ctx.closePath();
      
      // Define the clipping path (everything except the printable area)
      ctx.clip("evenodd");
      
      // Apply a semi-transparent grey overlay only to the image area outside the printable region
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
      ctx.fillRect(imagePosition.x, imagePosition.y, 
                 imageRef.current.width * imageScale, 
                 imageRef.current.height * imageScale);
      
      ctx.restore();
    }
    
    // Draw resize handles at the corners (now just visual indicators)
    if (imageRef.current && image) {
      const userImageWidth = imageRef.current.width * imageScale;
      const userImageHeight = imageRef.current.height * imageScale;
      
      // Draw handles
      ctx.save();
      drawResizeHandles(ctx, imagePosition.x, imagePosition.y, userImageWidth, userImageHeight);
      ctx.restore();
    }
  };

  // Function to draw resize handles at the corners of the image (visual only, no functionality)
  const drawResizeHandles = (ctx, x, y, width, height) => {
    const halfHandleSize = HANDLE_SIZE / 2;
    
    // Define the positions of the resize handles
    const handlePositions = {
      'nw': { x: x - halfHandleSize, y: y - halfHandleSize },
      'ne': { x: x + width - halfHandleSize, y: y - halfHandleSize },
      'se': { x: x + width - halfHandleSize, y: y + height - halfHandleSize },
      'sw': { x: x - halfHandleSize, y: y + height - halfHandleSize }
    };
    
    // Draw each handle
    CORNERS.forEach(corner => {
      const position = handlePositions[corner];
      
      // Draw the handle
      ctx.fillStyle = 'rgba(0, 150, 255, 0.8)';
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(position.x + halfHandleSize, position.y + halfHandleSize, halfHandleSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });
    
    return handlePositions;
  };
  
  // Helper function to check if a point is inside a circle
  const isInsideCircle = (x, y, cx, cy, radius) => {
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= radius * radius;
  };
  
  // Removed resize handle detection as we're removing the zoom/resize feature

  // Mouse and touch event handlers - simplified for drag only
  const handleMouseDown = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Start dragging
    setIsDragging(true);
    setDragStart({ x, y });
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      
      // Start dragging
      setIsDragging(true);
      setDragStart({ x, y });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    moveImage(e.clientX, e.clientY);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    
    moveImage(e.touches[0].clientX, e.touches[0].clientY);
  };

  const moveImage = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    
    setImagePosition({
      x: imagePosition.x + deltaX,
      y: imagePosition.y + deltaY
    });
    
    setDragStart({ x, y });
  };
  
  // Removed resizeImage function as we're removing the zoom/resize feature

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };
  
  // Function to determine the cursor style based on the current interaction state
  const getCursorStyle = () => {
    return isDragging ? 'grabbing' : 'grab';
  };

  // Removed wheel handler as we're removing the zoom feature

  // Crop the image to the printable area
  const cropImage = () => {
    if (!canvasRef.current || !imageRef.current || printableCorners.length !== 4) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Create a temporary canvas for the cropped image
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Calculate the scale factors
    const scaleFactorX = canvas.width / productImageRef.current.width;
    const scaleFactorY = canvas.height / productImageRef.current.height;
    
    // Calculate the dimensions of the printable area
    const printableWidth = Math.abs(printableCorners[1].x - printableCorners[0].x) * scaleFactorX;
    const printableHeight = Math.abs(printableCorners[3].y - printableCorners[0].y) * scaleFactorY;
    
    // Set the temporary canvas size to the printable area
    tempCanvas.width = printableWidth;
    tempCanvas.height = printableHeight;
    
    // Calculate the top-left corner of the printable area
    const printableLeft = printableCorners[0].x * scaleFactorX;
    const printableTop = printableCorners[0].y * scaleFactorY;
    
    // Draw only the portion of the user image that's in the printable area
    tempCtx.save();
    tempCtx.translate(-printableLeft, -printableTop);
    tempCtx.translate(imagePosition.x, imagePosition.y);
    tempCtx.scale(imageScale, imageScale);
    tempCtx.drawImage(imageRef.current, 0, 0);
    tempCtx.restore();
    
    // Convert the temporary canvas to a data URL
    const croppedImageData = tempCanvas.toDataURL('image/png');
    
    // For now, just open the cropped image in a new tab
    // In a production app, you would save this or proceed to checkout
    const newTab = window.open();
    newTab.document.write(`<img src="${croppedImageData}" alt="Cropped Image"/>`);
  };

  // Reset image to centered in the printable area
  const resetImage = () => {
    if (!imageRef.current || !productImageRef.current || printableCorners.length !== 4) return;
    
    // Calculate the scale factors
    const scaleFactorX = CANVAS_WIDTH / productImageRef.current.width;
    const scaleFactorY = CANVAS_HEIGHT / productImageRef.current.height;
    
    // Calculate the printable area dimensions on the canvas
    const printableWidth = Math.abs(printableCorners[1].x - printableCorners[0].x) * scaleFactorX;
    const printableHeight = Math.abs(printableCorners[3].y - printableCorners[0].y) * scaleFactorY;
    
    // Calculate the center of the printable area on the canvas
    const centerX = (printableCorners[0].x + printableCorners[1].x) / 2 * scaleFactorX;
    const centerY = (printableCorners[0].y + printableCorners[3].y) / 2 * scaleFactorY;
    
    // Center the image in the printable area
    setImagePosition({
      x: centerX - (imageRef.current.width * imageScale / 2),
      y: centerY - (imageRef.current.height * imageScale / 2)
    });
  };

  return (
    <div className="editor-container">
      <h1>Image Editor</h1>
      <p>Drag your image to position it on the canvas. The image will be fitted to minimize cropping.</p>
      
      <div className="canvas-container" ref={containerRef}>
        <canvas 
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            cursor: getCursorStyle() 
          }}
        />
      </div>
      
      <div className="editor-controls">
        <button className="reset-button" onClick={resetImage}>Reset Position</button>
      </div>
      
      <div className="editor-instructions">
        <h3>Instructions:</h3>
        <ul>
          <li>Drag the image to reposition it</li>
          <li>The lighter area shows what will be printed</li>
          <li>The darker areas will not be printed</li>
        </ul>
      </div>
      
      <div className="editor-actions">
        <button className="crop-button" onClick={cropImage}>Crop & Continue</button>
      </div>
    </div>
  );
};

export default ImageEditor;