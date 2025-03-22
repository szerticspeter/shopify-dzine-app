import React, { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  // State for uploaded image
  const [image, setImage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // State for markers (4 corners)
  const [markers, setMarkers] = useState([
    { id: 'topLeft', x: 0, y: 0, label: 'Top Left' },
    { id: 'topRight', x: 0, y: 0, label: 'Top Right' },
    { id: 'bottomRight', x: 0, y: 0, label: 'Bottom Right' },
    { id: 'bottomLeft', x: 0, y: 0, label: 'Bottom Left' }
  ]);
  
  // State to track active marker for dragging
  const [activeMarker, setActiveMarker] = useState(null);
  const [markerPlacementStep, setMarkerPlacementStep] = useState(0);
  const [markersVisible, setMarkersVisible] = useState(false);
  
  // Canvas references
  const canvasRef = useRef(null);
  const canvasWrapperRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Scale factor for responsive canvas
  const [scale, setScale] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  // Reset the editor
  const resetEditor = () => {
    setImage(null);
    setMarkers([
      { id: 'topLeft', x: 0, y: 0, label: 'Top Left' },
      { id: 'topRight', x: 0, y: 0, label: 'Top Right' },
      { id: 'bottomRight', x: 0, y: 0, label: 'Bottom Right' },
      { id: 'bottomLeft', x: 0, y: 0, label: 'Bottom Left' }
    ]);
    setMarkerPlacementStep(0);
    setMarkersVisible(false);
  };
  
  // Handle image upload
  const handleImageUpload = (e) => {
    e.preventDefault();
    const file = e.target.files[0];
    if (file && file.type.match('image.*')) {
      processImageFile(file);
    }
  };
  
  // Process the image file
  const processImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        // Reset markers and steps when new image is loaded
        setMarkerPlacementStep(0);
        setMarkersVisible(false);
        
        // Wait for next render cycle then draw the image
        setTimeout(() => {
          drawImageOnCanvas(img);
        }, 100);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };
  
  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.match('image.*')) {
        processImageFile(file);
      }
    }
  };
  
  // Draw image on canvas
  const drawImageOnCanvas = (imageObj) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObj) return;
    
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions to match image dimensions
    canvas.width = imageObj.width;
    canvas.height = imageObj.height;
    setCanvasSize({ width: imageObj.width, height: imageObj.height });
    
    // Calculate scale based on container width
    calculateScale();
    
    // Clear canvas and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imageObj, 0, 0);
    
    // Draw existing markers if visible
    if (markersVisible) {
      drawAreaOutline();
    }
  };
  
  // Calculate scale factor for responsive canvas
  const calculateScale = () => {
    if (!canvasWrapperRef.current || !image) return;
    
    const containerWidth = canvasWrapperRef.current.offsetWidth;
    const newScale = containerWidth / image.width;
    setScale(newScale < 1 ? newScale : 1); // Limit scale to 1 (original size)
  };
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      calculateScale();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [image]);
  
  // Draw area outline based on markers
  const drawAreaOutline = () => {
    if (!canvasRef.current || !markersVisible) return;
    
    const areaOutline = document.querySelector('.area-outline');
    if (!areaOutline) return;
    
    // Calculate the position and dimensions for the area outline
    const topLeft = markers.find(m => m.id === 'topLeft');
    const topRight = markers.find(m => m.id === 'topRight');
    const bottomRight = markers.find(m => m.id === 'bottomRight');
    const bottomLeft = markers.find(m => m.id === 'bottomLeft');
    
    if (!topLeft || !topRight || !bottomRight || !bottomLeft) return;
    
    // Get the min/max x,y coordinates
    const left = Math.min(topLeft.x, bottomLeft.x);
    const top = Math.min(topLeft.y, topRight.y);
    const right = Math.max(topRight.x, bottomRight.x);
    const bottom = Math.max(bottomLeft.y, bottomRight.y);
    
    // Set the position and dimensions of the outline
    areaOutline.style.left = `${left * scale}px`;
    areaOutline.style.top = `${top * scale}px`;
    areaOutline.style.width = `${(right - left) * scale}px`;
    areaOutline.style.height = `${(bottom - top) * scale}px`;
  };
  
  // Handle clicks on canvas to place markers
  const handleCanvasClick = (e) => {
    if (!image || markerPlacementStep >= 4) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate where the click occurred on the actual image/canvas
    const x = Math.round((e.clientX - rect.left) / scale);
    const y = Math.round((e.clientY - rect.top) / scale);
    
    // Update the corresponding marker
    const newMarkers = [...markers];
    newMarkers[markerPlacementStep] = {
      ...newMarkers[markerPlacementStep],
      x,
      y
    };
    
    setMarkers(newMarkers);
    setMarkerPlacementStep(markerPlacementStep + 1);
    
    if (markerPlacementStep === 3) {
      // All markers placed, show them
      setMarkersVisible(true);
    }
  };
  
  // Handle starting marker drag
  const handleMarkerMouseDown = (e, markerId) => {
    e.stopPropagation();
    setActiveMarker(markerId);
  };
  
  // Handle marker dragging
  const handleMarkerMove = (e) => {
    if (!activeMarker || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Calculate where the drag moved to on the actual image/canvas
    const x = Math.round((e.clientX - rect.left) / scale);
    const y = Math.round((e.clientY - rect.top) / scale);
    
    // Make sure coordinates stay within the canvas
    const clampedX = Math.max(0, Math.min(x, canvas.width));
    const clampedY = Math.max(0, Math.min(y, canvas.height));
    
    // Update the marker position
    const newMarkers = markers.map(marker => 
      marker.id === activeMarker 
        ? { ...marker, x: clampedX, y: clampedY } 
        : marker
    );
    
    setMarkers(newMarkers);
    drawAreaOutline();
  };
  
  // Handle marker drag end
  const handleMarkerMouseUp = () => {
    setActiveMarker(null);
  };
  
  // Add event listeners for marker dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      handleMarkerMove(e);
    };
    
    const handleMouseUp = () => {
      handleMarkerMouseUp();
    };
    
    if (activeMarker) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeMarker, markers]);
  
  // Redraw area outline when markers change
  useEffect(() => {
    drawAreaOutline();
  }, [markers, scale, markersVisible]);
  
  // Generate JSON output with marker coordinates
  const generateJSON = () => {
    const productData = {
      name: "Canvas Product",
      dimensions: {
        width: canvasSize.width,
        height: canvasSize.height
      },
      imageArea: {
        topLeft: { x: markers[0].x, y: markers[0].y },
        topRight: { x: markers[1].x, y: markers[1].y },
        bottomRight: { x: markers[2].x, y: markers[2].y },
        bottomLeft: { x: markers[3].x, y: markers[3].y }
      }
    };
    
    return JSON.stringify(productData, null, 2);
  };
  
  // Handle download of JSON configuration
  const handleDownloadJSON = () => {
    const jsonStr = generateJSON();
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(jsonStr)}`;
    
    const a = document.createElement('a');
    a.href = dataUri;
    a.download = 'product-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };
  
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Product Template Creator</h1>
        <p className="subtitle">Define image placement areas on product stock photos</p>
      </header>
      
      <main>
        {!image ? (
          <section className="image-upload-section">
            <div className="instructions">
              <h3>Getting Started</h3>
              <p>Upload a stock product photo to begin defining where customer images will be placed.</p>
              <ul>
                <li>Use high-quality product images (e.g., canvas on wall, mug, etc.)</li>
                <li>Ideally use images with a flat, front-facing view of the product</li>
                <li>After uploading, you'll mark the four corners of where user images should appear</li>
              </ul>
            </div>
            
            <div 
              className={`upload-container ${isDragging ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <svg className="upload-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 0h24v24H0z" fill="none"/>
                <path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8h-5zM5 19l3-4 2 3 3-4 4 5H5z"/>
              </svg>
              <h3>Upload Product Photo</h3>
              <p>Click to browse or drag & drop an image file here</p>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </div>
          </section>
        ) : (
          <section className="editor-section">
            <div className="instructions">
              <h3>
                {markerPlacementStep < 4 
                  ? `Step ${markerPlacementStep + 1}: Place the ${markers[markerPlacementStep].label} corner marker` 
                  : 'All corners marked! You can drag any marker to adjust its position'}
              </h3>
              <p>
                {markerPlacementStep < 4 
                  ? 'Click on the image to place the marker at the corresponding corner of the product image area.' 
                  : 'Drag any marker to fine-tune its position. The red rectangle shows the image placement area.'}
              </p>
            </div>
            
            <div 
              className="canvas-wrapper" 
              ref={canvasWrapperRef}
              style={{
                width: '100%',
                maxWidth: image ? `${image.width}px` : '100%'
              }}
            >
              <div 
                className="canvas-container"
                style={{ 
                  paddingBottom: image ? `${(image.height / image.width) * 100}%` : '75%'
                }}
              >
                <canvas 
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  style={{ 
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                ></canvas>
                
                {/* Area outline */}
                {markersVisible && (
                  <div className="area-outline"></div>
                )}
                
                {/* Markers */}
                {markersVisible && markers.map((marker, index) => (
                  <div 
                    key={marker.id}
                    className="marker"
                    style={{
                      left: `${marker.x * scale}px`,
                      top: `${marker.y * scale}px`
                    }}
                    onMouseDown={(e) => handleMarkerMouseDown(e, marker.id)}
                  ></div>
                ))}
              </div>
            </div>
            
            <div className="controls-section">
              <button onClick={resetEditor} className="secondary">
                Upload Different Image
              </button>
              
              {markerPlacementStep === 4 && (
                <>
                  <button onClick={handleDownloadJSON} className="success">
                    Export Template JSON
                  </button>
                </>
              )}
            </div>
            
            {markerPlacementStep === 4 && (
              <div className="coordinates-display">
                <h3>Marker Coordinates</h3>
                <table className="coordinates-table">
                  <thead>
                    <tr>
                      <th>Corner</th>
                      <th>X</th>
                      <th>Y</th>
                    </tr>
                  </thead>
                  <tbody>
                    {markers.map(marker => (
                      <tr key={marker.id}>
                        <td>{marker.label}</td>
                        <td>{marker.x}</td>
                        <td>{marker.y}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <h3 style={{ marginTop: '20px' }}>JSON Output</h3>
                <pre className="json-display">
                  {generateJSON()}
                </pre>
              </div>
            )}
          </section>
        )}
      </main>
      
      <footer style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#7f8c8d' }}>
        <p>Internal use only - Dzine.ai Canvas App with Prodigi Integration</p>
      </footer>
    </div>
  );
}

export default App;