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
  
  // Debug environment variables on startup - minimal version to avoid exposing secrets
  console.log('App initialized, ENV vars status:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- DZINE API Key exists:', !!process.env.REACT_APP_DZINE_API_KEY);
  console.log('- DZINE API Key valid format:', !!process.env.REACT_APP_DZINE_API_KEY && process.env.REACT_APP_DZINE_API_KEY !== 'your_api_key_here');

  // Always use our predefined styles for the UI
  // but we'll map them to real API style codes when making the API request
  useEffect(() => {
    // Our predefined styles that will always be shown in the UI
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

  const handleStyleSelect = async (styleCode) => {
    console.log('Selected style code:', styleCode);
    setSelectedStyle(styleCode);
    
    // Find the selected style
    const selectedStyleObj = styles.find(style => style.style_code === styleCode);
    if (selectedStyleObj && uploadedImage) {
      setIsProcessing(true);
      
      try {
        // Get API key from environment variables
        const apiKey = process.env.REACT_APP_DZINE_API_KEY;
        
        // Check if we have an API key, otherwise directly fall back to mock
        if (!apiKey || apiKey === 'your_api_key_here') {
          console.log('No valid API key found, falling back to mock response');
          throw new Error('No valid API key configured');
        }
        
        // Convert image to base64
        const base64Image = await fileToBase64(uploadedImage);
        
        // Map our UI style codes to actual dzine.ai API style codes
        const styleCodeMapping = {
          'flamenco-dance': 'Style-5e28d7f9-8754-4aae-ac5f-8297dd6f39d5', // Flamenco Dance style
          'gta-comic': 'Style-5b1b0c35-7abc-4f14-8b1d-dc2748f34915', // GTA Comic style
          'toon-face': 'Style-96fb8bd7-c4ed-466d-b94f-5a5625a64bbf'  // Toon Face style
        };
        
        // Get the actual API style code
        const apiStyleCode = styleCodeMapping[styleCode] || styleCode;
        const response = await fetch('https://papi.dzine.ai/openapi/v1/create_task_img2img', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey
          },
          body: JSON.stringify({
            prompt: "Transform this image with the selected style",
            style_code: apiStyleCode,
            style_intensity: 0.9,
            structure_match: 0.7,
            quality_mode: 1,
            generate_slots: [1, 0, 0, 0],
            images: [
              {
                base64_data: base64Image
              }
            ]
          })
        });
        
        if (!response.ok) {
          console.error('API response not OK:', response.status, response.statusText);
          throw new Error(`Failed to create styling task: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('API response:', data);
        
        if (data.code === 200 && data.data && data.data.task_id) {
          // Poll for task completion
          await pollTaskProgress(data.data.task_id);
        } else {
          throw new Error('Invalid API response format');
        }
      } catch (error) {
        console.error('Error processing image:', error);
        setIsProcessing(false);
        
        // Fallback to mock if the API fails
        if (selectedStyleObj.stylizedImage) {
          setResult({ url: selectedStyleObj.stylizedImage });
        }
      }
    }
  };
  
  // Helper function to convert File to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };
  
  // Helper function to poll for task progress
  const pollTaskProgress = async (taskId) => {
    try {
      let isComplete = false;
      let attempts = 0;
      const maxAttempts = 30; // Maximum polling attempts
      
      // Get API key from environment variables
      const apiKey = process.env.REACT_APP_DZINE_API_KEY;
      
      // Check if we have an API key
      if (!apiKey || apiKey === 'your_api_key_here') {
        console.error('No valid API key for polling task progress');
        throw new Error('No valid API key configured');
      }
      
      while (!isComplete && attempts < maxAttempts) {
        attempts++;
        
        // Wait 2 seconds between polls
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check task progress
        const response = await fetch(`https://papi.dzine.ai/openapi/v1/get_task_progress/${taskId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to check task progress: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.code === 200 && data.data) {
          if (data.data.status === 'success' || data.data.status === 'succeeded') {
            isComplete = true;
            
            // Get the first non-empty image URL from generate_result_slots
            const resultUrl = data.data.generate_result_slots.find(url => url && url.trim() !== '');
            
            if (resultUrl) {
              setResult({ url: resultUrl });
            } else {
              throw new Error('No result image found');
            }
          } else if (data.data.status === 'failed') {
            throw new Error(`Task failed: ${data.data.error_reason || 'Unknown error'}`);
          }
          // Still processing, continue polling
        }
      }
      
      if (!isComplete) {
        throw new Error('Task processing timed out');
      }
    } catch (error) {
      console.error('Error polling task progress:', error);
      throw error;
    } finally {
      setIsProcessing(false);
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