import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import ProductSelect from './ProductSelect';

function App() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [styles, setStyles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize predefined styles instead of fetching from API
  useEffect(() => {
    // Predefined styles with image paths
    const predefinedStyles = [
      { 
        style_code: 'flamenco-dance', 
        name: 'Flamenco Dance', 
        originalImage: '/images/family.jpg',
        stylizedImage: '/images/family-flamenco-dance.jpg'
      },
      { 
        style_code: 'gta-comic', 
        name: 'GTA Comic', 
        originalImage: '/images/family.jpg',
        stylizedImage: '/images/family-gta-comic.jpg'
      },
      { 
        style_code: 'toon-face', 
        name: 'Toon Face', 
        originalImage: '/images/family.jpg',
        stylizedImage: '/images/family-toon-face.jpg'
      }
    ];
    
    setStyles(predefinedStyles);
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    processFile(file);
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };
  
  const handleButtonClick = () => {
    fileInputRef.current.click();
  };
  
  const processFile = (file) => {
    if (file) {
      // Compress the image before setting it
      compressImage(file, 1200, 0.8).then(compressedFile => {
        console.log('Original size:', file.size / 1024 / 1024, 'MB');
        console.log('Compressed size:', compressedFile.size / 1024 / 1024, 'MB');
        setUploadedImage(compressedFile);
        setResult(null);
      }).catch(error => {
        console.error('Image compression failed:', error);
        // Fallback to original file if compression fails
        setUploadedImage(file);
        setResult(null);
      });
    }
  };
  
  // Function to compress/resize image before upload
  const compressImage = (file, maxWidth, quality) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = event => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions while maintaining aspect ratio
          if (width > maxWidth) {
            height = Math.round(height * maxWidth / width);
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to blob with quality setting (0.0 to 1.0)
          canvas.toBlob(blob => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            // Create a new File object from the blob
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }, 'image/jpeg', quality);
        };
        img.onerror = error => {
          reject(error);
        };
      };
      reader.onerror = error => {
        reject(error);
      };
    });
  };

  const handleStyleSelect = (styleCode) => {
    console.log('Selected style code:', styleCode);
    setSelectedStyle(styleCode);
    
    // Find the selected style
    const selectedStyleObj = styles.find(style => style.style_code === styleCode);
    if (selectedStyleObj) {
      setIsProcessing(true);
      
      // Simulate processing
      setTimeout(() => {
        setResult({ url: selectedStyleObj.stylizedImage });
        setIsProcessing(false);
      }, 500);
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="App">
            <header className="App-header">
              <h1>Give a Special Gift</h1>
              <p className="subtitle">Order a stylized image of your loved ones on premium products</p>
            </header>
            
            <main>
              <section className="product-samples">
                <h2>Perfect for Any Special Occasion</h2>
                <div className="products-container">
                  <div className="product-item">
                    <img src="/images/mug-sample.png" alt="Stylized photo on a mug" />
                    <span>Custom Mugs</span>
                  </div>
                  <div className="product-item">
                    <img src="/images/cushion-sample.png" alt="Stylized photo on a cushion" />
                    <span>Photo Cushions</span>
                  </div>
                  <div className="product-item">
                    <img src="/images/canvas-sample.jpg" alt="Stylized photo on canvas" />
                    <span>Canvas Prints</span>
                  </div>
                </div>
                <p className="sample-description">
                  Turn cherished photos into unique artwork that will be treasured for years to come.
                  Perfect for birthdays, anniversaries, or just to show how much you care.
                </p>
              </section>
              <section className="create-gift-section">
                <h2>Create Your Gift in 3 Easy Steps</h2>
                <div className="steps-container">
                  <div className="step-item">
                    <div className="step-number">1</div>
                    <p>Upload a photo of your loved ones</p>
                  </div>
                  <div className="step-item">
                    <div className="step-number">2</div>
                    <p>Select an artistic style to transform it</p>
                  </div>
                  <div className="step-item">
                    <div className="step-number">3</div>
                    <p>Choose your product and place your order</p>
                  </div>
                </div>
                
                <div 
                  className={`upload-section ${isDragging ? 'drag-over' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <svg className="upload-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3h-2zM7 9l1.41 1.41L11 7.83V16h2V7.83l2.59 2.58L17 9l-5-5-5 5z"/>
                  </svg>
                  
                  <h3 className="upload-heading">Start with Your Photo</h3>
                  
                  <p className="upload-text">
                    {uploadedImage 
                      ? `Selected file: ${uploadedImage.name}` 
                      : 'Upload a clear photo of your loved ones - family portraits work best!'}
                  </p>
                  
                  <button 
                    className="upload-button"
                    onClick={handleButtonClick}
                  >
                    {uploadedImage ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="file-input"
                    id="file-input"
                  />
                  <label htmlFor="file-input" className="file-input-label"></label>
                </div>
              </section>

              {uploadedImage && (
                <section className="style-section">
                  <h2>Choose an Artistic Style</h2>
                  <p className="style-description">
                    Select one of our artistic styles to transform your photo into a unique piece of art.
                  </p>
                  <div className="style-grid">
                    {styles.map((style) => (
                      <button
                        key={style.style_code}
                        onClick={() => handleStyleSelect(style.style_code)}
                        className={`style-button ${selectedStyle === style.style_code ? 'selected' : ''}`}
                      >
                        <div className="style-images">
                          <img src={style.originalImage} alt="Original" />
                          <img src={style.stylizedImage} alt={`${style.name} style`} />
                        </div>
                        <div className="style-name">{style.name}</div>
                        {selectedStyle === style.style_code && (
                          <div className="selected-badge">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                              <path d="M0 0h24v24H0z" fill="none"/>
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {isProcessing && <div className="processing">Processing your image...</div>}

              {result && (
                <section className="result-section">
                  <h2>Your Stylized Image is Ready!</h2>
                  <p className="result-description">
                    Your photo has been transformed! Now choose your perfect product.
                  </p>
                  <div className="result-image-container">
                    <img src={result.url} alt="Your stylized image result" />
                  </div>
                  <button 
                    onClick={() => {
                      // Store image in sessionStorage instead of URL parameter
                      sessionStorage.setItem('stylizedImage', result.url);
                      window.location.href = '/products';
                    }}
                    className="create-product-button"
                  >
                    Continue to Select Products
                  </button>
                  <p className="guarantee-text">
                    <svg className="guarantee-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M0 0h24v24H0z" fill="none"/>
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                    </svg>
                    100% satisfaction guarantee • Premium quality products • Fast shipping
                  </p>
                </section>
              )}
            </main>
          </div>
        } />
        <Route path="/products" element={<ProductSelect />} />
      </Routes>
    </Router>
  );
}

export default App;