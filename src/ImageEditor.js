import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const ImageEditor = () => {
  const [image, setImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  // Canvas dimensions - 12x16" ratio (31x41cm)
  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = CANVAS_WIDTH * (16/12); // Maintain 12:16 aspect ratio

  // Image position and scale
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [imageScale, setImageScale] = useState(1);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Use the test image URL
    const testImageUrl = 'https://static.dzine.ai/open_product/20250322/54/img2img/1_output_1742650385000203_jrmL0.webp';
    
    // Preload the image
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Enable CORS for the image
    img.src = testImageUrl;
    img.onload = () => {
      setImage(img);
      imageRef.current = img;
      
      // Center the image on the canvas initially
      setImagePosition({
        x: (CANVAS_WIDTH - img.width) / 2,
        y: (CANVAS_HEIGHT - img.height) / 2
      });
      
      // Set initial scale to fit the canvas (maintaining aspect ratio)
      const scaleX = CANVAS_WIDTH / img.width;
      const scaleY = CANVAS_HEIGHT / img.height;
      const scale = Math.min(scaleX, scaleY);
      setImageScale(scale);
      
      drawCanvas();
    };
  }, []);

  useEffect(() => {
    // Redraw canvas when image position or scale changes
    if (image) {
      drawCanvas();
    }
  }, [imagePosition, imageScale, image]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw a white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw the image with current position and scale
    ctx.save();
    ctx.translate(imagePosition.x, imagePosition.y);
    ctx.scale(imageScale, imageScale);
    ctx.drawImage(imageRef.current, 0, 0);
    ctx.restore();
    
    // Draw the canvas border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
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

  // Reset image to centered and properly scaled
  const resetImage = () => {
    if (!imageRef.current) return;
    
    // Center the image on the canvas
    const img = imageRef.current;
    
    // Calculate scale to fit the canvas (maintaining aspect ratio)
    const scaleX = CANVAS_WIDTH / img.width;
    const scaleY = CANVAS_HEIGHT / img.height;
    const scale = Math.min(scaleX, scaleY);
    
    setImageScale(scale);
    setImagePosition({
      x: (CANVAS_WIDTH - img.width * scale) / 2,
      y: (CANVAS_HEIGHT - img.height * scale) / 2
    });
  };

  // Zoom in and out buttons
  const zoomIn = () => {
    setImageScale(prev => Math.min(5, prev * 1.1));
  };

  const zoomOut = () => {
    setImageScale(prev => Math.max(0.1, prev * 0.9));
  };

  return (
    <div className="editor-container">
      <h1>Image Editor</h1>
      <p>Use this tool to position your image on the 12"x16" (31x41cm) canvas</p>
      
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
        <button onClick={zoomIn}>Zoom In (+)</button>
        <button onClick={zoomOut}>Zoom Out (-)</button>
        <button onClick={resetImage}>Reset</button>
        <div className="scale-display">Scale: {Math.round(imageScale * 100)}%</div>
      </div>
      
      <div className="editor-instructions">
        <h3>How to use the editor:</h3>
        <ul>
          <li>Drag the image to reposition it</li>
          <li>Use mouse wheel to zoom in and out</li>
          <li>Click "Reset" to fit image to canvas</li>
        </ul>
      </div>
      
      <div className="editor-actions">
        <button className="primary-button">Continue to Checkout</button>
      </div>
    </div>
  );
};

export default ImageEditor;