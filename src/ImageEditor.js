import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const ImageEditor = () => {
  const [image, setImage] = useState(null);
  const [productImage, setProductImage] = useState(null);
  const [printableCorners, setPrintableCorners] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const productImageRef = useRef(null);
  const containerRef = useRef(null);

  // Canvas dimensions - maintain the product image aspect ratio
  const CANVAS_WIDTH = 800;
  let CANVAS_HEIGHT = 800; // Will be calculated based on the product image ratio

  // Image position and scale
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Load the product image and printable area corners
    const productImageUrl = '/images/products/canvas16x20.png';
    const cornersJsonUrl = '/images/products/canvas16x20.json';
    
    // Fetch the corners data
    fetch(cornersJsonUrl)
      .then(response => response.json())
      .then(data => {
        setPrintableCorners(data.corners);
      })
      .catch(error => {
        console.error('Error loading printable area data:', error);
      });
    
    // Load the product image
    const productImg = new Image();
    productImg.src = productImageUrl;
    productImg.onload = () => {
      setProductImage(productImg);
      productImageRef.current = productImg;
      
      // Calculate canvas height based on product image aspect ratio
      CANVAS_HEIGHT = CANVAS_WIDTH * (productImg.height / productImg.width);
      
      // Use the test image URL (replace with user uploaded image in production)
      const testImageUrl = 'https://static.dzine.ai/open_product/20250322/54/img2img/1_output_1742650385000203_jrmL0.webp';
      
      // Preload the user image
      const userImg = new Image();
      userImg.crossOrigin = "Anonymous"; // Enable CORS for the image
      userImg.src = testImageUrl;
      userImg.onload = () => {
        setImage(userImg);
        imageRef.current = userImg;
        
        // Set initial scale to fit within the printable area (if we have that data)
        if (printableCorners.length === 4) {
          const printableWidth = Math.abs(printableCorners[1].x - printableCorners[0].x);
          const printableHeight = Math.abs(printableCorners[3].y - printableCorners[0].y);
          
          // Calculate the scale factor for product image to canvas
          const scaleFactorX = CANVAS_WIDTH / productImg.width;
          const scaleFactorY = CANVAS_HEIGHT / productImg.height;
          
          // Calculate the printable area dimensions on the canvas
          const canvasPrintableWidth = printableWidth * scaleFactorX;
          const canvasPrintableHeight = printableHeight * scaleFactorY;
          
          // Calculate the center of the printable area on the canvas
          const centerX = (printableCorners[0].x + printableCorners[1].x) / 2 * scaleFactorX;
          const centerY = (printableCorners[0].y + printableCorners[3].y) / 2 * scaleFactorY;
          
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
        
        drawCanvas();
      };
    };
  }, []);

  useEffect(() => {
    // Redraw canvas when relevant states change
    if (image && productImage && printableCorners.length === 4) {
      drawCanvas();
    }
  }, [imagePosition, imageScale, image, productImage, printableCorners]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current || !productImageRef.current) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the product image as background
    ctx.drawImage(productImageRef.current, 0, 0, canvas.width, canvas.height);
    
    // If we have printable corners data, draw the user image and overlay
    if (printableCorners.length === 4) {
      // Create a polygon path for the printable area
      const scaleFactorX = canvas.width / productImageRef.current.width;
      const scaleFactorY = canvas.height / productImageRef.current.height;
      
      ctx.save();
      
      // Draw the user image at the current position and scale
      ctx.save();
      ctx.translate(imagePosition.x, imagePosition.y);
      ctx.scale(imageScale, imageScale);
      ctx.drawImage(imageRef.current, 0, 0);
      ctx.restore();
      
      // Create a path for the printable area
      ctx.beginPath();
      ctx.moveTo(printableCorners[0].x * scaleFactorX, printableCorners[0].y * scaleFactorY);
      for (let i = 1; i < printableCorners.length; i++) {
        ctx.lineTo(printableCorners[i].x * scaleFactorX, printableCorners[i].y * scaleFactorY);
      }
      ctx.closePath();
      
      // Everything outside this path will be grayed out
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill();
      ctx.restore();
      
      // Create a semi-transparent overlay for areas outside the printable region
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      
      // Cut out the printable area from the overlay
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fill();
      ctx.restore();
      
      // Draw a visible border around the printable area
      ctx.strokeStyle = 'rgba(0, 150, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.restore();
    } else {
      // Fallback if we don't have printable area data
      ctx.save();
      ctx.translate(imagePosition.x, imagePosition.y);
      ctx.scale(imageScale, imageScale);
      ctx.drawImage(imageRef.current, 0, 0);
      ctx.restore();
    }
  };

  // Mouse and touch event handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    startDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      startDrag(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const startDrag = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setIsDragging(true);
    setDragStart({ x, y });
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
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
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
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