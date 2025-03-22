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
  const [isResizing, setIsResizing] = useState(false);
  const [activeCorner, setActiveCorner] = useState(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const productImageRef = useRef(null);
  const containerRef = useRef(null);

  // Canvas dimensions - maintain the product image aspect ratio
  const CANVAS_WIDTH = 800;
  let CANVAS_HEIGHT = 800; // Will be dynamically updated

  // Image position and scale
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Constants for the resize handles
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
      
      // Calculate scale to fit the user image inside the printable area
      const scaleX = canvasPrintableWidth / userImg.width;
      const scaleY = canvasPrintableHeight / userImg.height;
      const scale = Math.min(scaleX, scaleY) * 0.9; // 90% of the printable area
      
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
      
      // Set initial scale to fit the canvas
      const scaleX = CANVAS_WIDTH / userImg.width;
      const scaleY = CANVAS_HEIGHT / userImg.height;
      const scale = Math.min(scaleX, scaleY) * 0.8;
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
    
    // Draw white background to ensure visibility
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the product image as background
    console.log("Drawing product image");
    
    // Try multiple approaches
    if (productImageRef.current) {
      // 1. Use the loaded image from state
      console.log("Using image from state:", productImageRef.current.width, "x", productImageRef.current.height);
      ctx.drawImage(productImageRef.current, 0, 0, canvas.width, canvas.height);
    } else if (preloadedCanvasImage.complete && preloadedCanvasImage.width > 0) {
      // 2. Use the preloaded image
      console.log("Using preloaded image:", preloadedCanvasImage.width, "x", preloadedCanvasImage.height);
      ctx.drawImage(preloadedCanvasImage, 0, 0, canvas.width, canvas.height);
      
      // Update the state for future renders
      setProductImage(preloadedCanvasImage);
      productImageRef.current = preloadedCanvasImage;
    } else {
      // 3. Show a simple placeholder
      console.error("No product image available - showing placeholder");
      ctx.fillStyle = '#f0f0f0';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add a border to visualize the canvas area
      ctx.strokeStyle = '#aaaaaa';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }
    
    // Draw the user image if available
    if (imageRef.current) {
      console.log("Drawing user image");
      ctx.save();
      ctx.translate(imagePosition.x, imagePosition.y);
      ctx.scale(imageScale, imageScale);
      ctx.drawImage(imageRef.current, 0, 0);
      ctx.restore();
    }
    
    // Add overlay around the printable area (not on it)
    if (printableCorners.length === 4 && productImageRef.current) {
      console.log("Drawing non-printable area overlay");
      
      const scaleFactorX = canvas.width / productImageRef.current.width;
      const scaleFactorY = canvas.height / productImageRef.current.height;
      
      // Create clip path for the printable area
      ctx.save();
      
      // First define the printable area path
      ctx.beginPath();
      ctx.moveTo(printableCorners[0].x * scaleFactorX, printableCorners[0].y * scaleFactorY);
      for (let i = 1; i < printableCorners.length; i++) {
        ctx.lineTo(printableCorners[i].x * scaleFactorX, printableCorners[i].y * scaleFactorY);
      }
      ctx.closePath();
      
      // Save the current context state with the printable area path
      ctx.save();
      
      // Create a clipping path for everything OUTSIDE the printable area
      // by creating a path for the entire canvas and using "evenodd" fill rule
      ctx.beginPath();
      ctx.rect(0, 0, canvas.width, canvas.height);
      ctx.clip("evenodd");
      
      // Now draw a semi-transparent overlay that only appears OUTSIDE the printable area
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Restore the context
      ctx.restore();
      ctx.restore();
      
      // No blue border around the printable area (as requested)
    }
    
    // Draw resize handles at the corners (on top of everything)
    if (imageRef.current && image) {
      const userImageWidth = imageRef.current.width * imageScale;
      const userImageHeight = imageRef.current.height * imageScale;
      
      // Draw handles
      ctx.save();
      drawResizeHandles(ctx, imagePosition.x, imagePosition.y, userImageWidth, userImageHeight);
      ctx.restore();
    }
  };

  // Function to draw resize handles at the corners of the image
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
  
  // Function to check if mouse is over a resize handle
  const getResizeHandle = (x, y) => {
    if (!imageRef.current) return null;
    
    const halfHandleSize = HANDLE_SIZE / 2;
    const userImageWidth = imageRef.current.width * imageScale;
    const userImageHeight = imageRef.current.height * imageScale;
    
    // Define the positions of the resize handles
    const handlePositions = {
      'nw': { x: imagePosition.x, y: imagePosition.y },
      'ne': { x: imagePosition.x + userImageWidth, y: imagePosition.y },
      'se': { x: imagePosition.x + userImageWidth, y: imagePosition.y + userImageHeight },
      'sw': { x: imagePosition.x, y: imagePosition.y + userImageHeight }
    };
    
    // Check each handle
    for (const corner of CORNERS) {
      const handleCenter = {
        x: handlePositions[corner].x + (corner.includes('e') ? 0 : 0),
        y: handlePositions[corner].y + (corner.includes('s') ? 0 : 0)
      };
      
      if (isInsideCircle(x, y, handleCenter.x, handleCenter.y, halfHandleSize + 10)) {
        return corner;
      }
    }
    
    return null;
  };

  // Mouse and touch event handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if user clicked on a resize handle
    const handleCorner = getResizeHandle(x, y);
    
    if (handleCorner) {
      // Start resizing
      setIsResizing(true);
      setActiveCorner(handleCorner);
      setDragStart({ x, y });
    } else {
      // Start dragging
      setIsDragging(true);
      setDragStart({ x, y });
    }
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.touches[0].clientX - rect.left;
      const y = e.touches[0].clientY - rect.top;
      
      // Check if user touched a resize handle
      const handleCorner = getResizeHandle(x, y);
      
      if (handleCorner) {
        // Start resizing
        setIsResizing(true);
        setActiveCorner(handleCorner);
        setDragStart({ x, y });
      } else {
        // Start dragging
        setIsDragging(true);
        setDragStart({ x, y });
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging && !isResizing) return;
    e.preventDefault();
    
    const clientX = e.clientX;
    const clientY = e.clientY;
    
    if (isDragging) {
      moveImage(clientX, clientY);
    } else if (isResizing) {
      resizeImage(clientX, clientY);
    }
  };

  const handleTouchMove = (e) => {
    if ((!isDragging && !isResizing) || e.touches.length !== 1) return;
    e.preventDefault();
    
    const clientX = e.touches[0].clientX;
    const clientY = e.touches[0].clientY;
    
    if (isDragging) {
      moveImage(clientX, clientY);
    } else if (isResizing) {
      resizeImage(clientX, clientY);
    }
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
  
  const resizeImage = (clientX, clientY) => {
    if (!imageRef.current || !activeCorner) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const deltaX = x - dragStart.x;
    const deltaY = y - dragStart.y;
    
    // Original dimensions
    const originalWidth = imageRef.current.width * imageScale;
    const originalHeight = imageRef.current.height * imageScale;
    
    // Calculate new scale based on the active corner
    let newScale = imageScale;
    let newX = imagePosition.x;
    let newY = imagePosition.y;
    
    // Maintain aspect ratio
    const aspectRatio = imageRef.current.width / imageRef.current.height;
    
    // Handle different corners
    switch (activeCorner) {
      case 'nw':
        // Northwest - change position and scale
        {
          const widthChange = -deltaX;
          const heightChange = -deltaY;
          const scaleChangeX = (originalWidth + widthChange) / imageRef.current.width;
          const scaleChangeY = (originalHeight + heightChange) / imageRef.current.height;
          
          // Use the larger scale change to maintain aspect ratio
          newScale = Math.max(0.1, Math.min(scaleChangeX, scaleChangeY));
          
          // Adjust position to keep the SE corner fixed
          newX = imagePosition.x + originalWidth - (imageRef.current.width * newScale);
          newY = imagePosition.y + originalHeight - (imageRef.current.height * newScale);
        }
        break;
      case 'ne':
        // Northeast - change width and y position
        {
          const widthChange = deltaX;
          const heightChange = -deltaY;
          const scaleChangeX = (originalWidth + widthChange) / imageRef.current.width;
          const scaleChangeY = (originalHeight + heightChange) / imageRef.current.height;
          
          // Use the larger scale change to maintain aspect ratio
          newScale = Math.max(0.1, Math.min(scaleChangeX, scaleChangeY));
          
          // Adjust y position to keep the SW corner fixed
          newY = imagePosition.y + originalHeight - (imageRef.current.height * newScale);
        }
        break;
      case 'se':
        // Southeast - just change scale
        {
          const widthChange = deltaX;
          const heightChange = deltaY;
          const scaleChangeX = (originalWidth + widthChange) / imageRef.current.width;
          const scaleChangeY = (originalHeight + heightChange) / imageRef.current.height;
          
          // Use the smaller scale change to maintain aspect ratio
          newScale = Math.max(0.1, Math.min(scaleChangeX, scaleChangeY));
        }
        break;
      case 'sw':
        // Southwest - change x position and height
        {
          const widthChange = -deltaX;
          const heightChange = deltaY;
          const scaleChangeX = (originalWidth + widthChange) / imageRef.current.width;
          const scaleChangeY = (originalHeight + heightChange) / imageRef.current.height;
          
          // Use the larger scale change to maintain aspect ratio
          newScale = Math.max(0.1, Math.min(scaleChangeX, scaleChangeY));
          
          // Adjust x position to keep the NE corner fixed
          newX = imagePosition.x + originalWidth - (imageRef.current.width * newScale);
        }
        break;
      default:
        break;
    }
    
    setImageScale(newScale);
    setImagePosition({ x: newX, y: newY });
    setDragStart({ x, y });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setActiveCorner(null);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsResizing(false);
    setActiveCorner(null);
  };
  
  // Function to determine the cursor style based on the current interaction state
  const getCursorStyle = () => {
    if (isDragging) {
      return 'grabbing';
    }
    
    if (isResizing) {
      switch (activeCorner) {
        case 'nw':
        case 'se':
          return 'nwse-resize';
        case 'ne':
        case 'sw':
          return 'nesw-resize';
        default:
          return 'pointer';
      }
    }
    
    // For dynamic cursor on hover - not implementing this yet as it requires
    // tracking mouse position in real-time, which is a bit more complex
    
    return 'grab';
  };

  const handleWheel = (e) => {
    e.preventDefault();
    
    // Calculate scale change based on wheel delta
    const delta = e.deltaY * -0.01;
    const newScale = Math.max(0.1, imageScale + delta);
    
    // Get mouse position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate new position to zoom toward mouse position
    const newX = imagePosition.x - (mouseX - imagePosition.x) * (newScale / imageScale - 1);
    const newY = imagePosition.y - (mouseY - imagePosition.y) * (newScale / imageScale - 1);
    
    setImageScale(newScale);
    setImagePosition({ x: newX, y: newY });
  };

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
    
    // Calculate scale to fit the user image inside the printable area
    const img = imageRef.current;
    const scaleX = printableWidth / img.width;
    const scaleY = printableHeight / img.height;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 90% of the printable area
    
    setImageScale(scale);
    
    // Center the image in the printable area
    setImagePosition({
      x: centerX - (img.width * scale / 2),
      y: centerY - (img.height * scale / 2)
    });
  };

  return (
    <div className="editor-container">
      <h1>Image Editor</h1>
      <p>Drag your image to position it on the canvas. Only the area inside the blue outline will be printed.</p>
      
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
          onWheel={handleWheel}
          style={{ 
            cursor: getCursorStyle() 
          }}
        />
      </div>
      
      <div className="editor-controls">
        <button className="reset-button" onClick={resetImage}>Reset Position</button>
        <div className="scale-display">Zoom: {Math.round(imageScale * 100)}%</div>
      </div>
      
      <div className="editor-instructions">
        <h3>Instructions:</h3>
        <ul>
          <li>Drag the image to reposition it</li>
          <li>Use mouse wheel to zoom in and out</li>
          <li>Only the area inside the blue outline will be printed</li>
        </ul>
      </div>
      
      <div className="editor-actions">
        <button className="crop-button" onClick={cropImage}>Crop & Continue</button>
      </div>
    </div>
  );
};

export default ImageEditor;