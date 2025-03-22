import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import ProductSelect from './ProductSelect';
import ImageEditor from './ImageEditor';

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
        console.log(`Sending img2img request with style_code: ${apiStyleCode}`);
        
        // Prepare request body
        const requestBody = {
          prompt: "Transform this image with the selected style",
          style_code: apiStyleCode,
          style_intensity: 0.7,
          structure_match: 0.7,
          face_match: 1,
          quality_mode: 1,
          generate_slots: [1, 0, 0, 0],
          images: [
            {
              base64_data: base64Image.replace(/^data:image\/[a-z]+;base64,/, '')
            }
          ]
        };
        
        // Make the API call with retries
        const data = await makeApiCall(
          'https://papi.dzine.ai/openapi/v1/create_task_img2img',
          'POST',
          requestBody,
          5 // More retries for this important call
        );
        
        // Debug: Log the full API response
        console.log('API Response:', JSON.stringify(data, null, 2));
        
        if (data.code === 200 && data.data && data.data.task_id) {
          // Poll for task completion
          await pollTaskProgress(data.data.task_id);
        } else if (data.code === 108005) {
          // Handle the specific style invalid error
          throw new Error(`Style not compatible with img2img. Try a different style.`);
        } else {
          console.error('Invalid API response structure:', data);
          throw new Error(`Invalid API response format: ${JSON.stringify(data)}`);
        }
      } catch (error) {
        console.error('Error processing image:', error);
        setIsProcessing(false);
        
        // Show an alert to the user
        alert(`Error: ${error.message}. Using sample image instead.`);
        
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
  
  // Generic function for making API calls with retry logic (copied from StyleTest.js)
  const makeApiCall = async (url, method = 'GET', body = null, retries = 3) => {
    // Get API key
    const apiKey = process.env.REACT_APP_DZINE_API_KEY;
    
    if (!apiKey || apiKey === 'your_api_key_here') {
      throw new Error('No valid API key configured. Please set up your REACT_APP_DZINE_API_KEY');
    }
    
    let lastError = null;
    let delay = 1000;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`Retry attempt ${attempt + 1}/${retries} for ${url}`);
        }
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey.trim(),
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          ...(body && { body: JSON.stringify(body) })
        });
        
        if (!response.ok) {
          // Log the response text for debugging
          const responseText = await response.text();
          console.error('Error response text:', responseText);
          throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }
        
        const responseText = await response.clone().text();
        console.log('Raw response:', responseText);
        return await response.json();
      } catch (error) {
        console.error(`API call attempt ${attempt + 1} failed:`, error);
        lastError = error;
        
        if (attempt < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }
    }
    
    // Provide more specific error message for common issues
    if (lastError instanceof TypeError && lastError.message.includes('fetch')) {
      throw new Error('Network connection issue. Please check your internet connection and try again.');
    } else if (lastError instanceof TypeError && lastError.message.includes('JSON')) {
      throw new Error('Invalid response from server. The API may be temporarily unavailable.');
    } else {
      throw lastError || new Error('API call failed after all retries');
    }
  };

  // Helper function to poll for task progress
  const pollTaskProgress = async (taskId) => {
    try {
      let isComplete = false;
      let attempts = 0;
      const maxAttempts = 60; // Maximum polling attempts (2 minutes)
      const statusMessages = {
        0: 'Starting task...',
        5: 'Processing your image...',
        15: 'Applying style transformation...',
        30: 'Almost there...'
      };
      
      console.log(`Starting task polling, task ID: ${taskId}, max attempts: ${maxAttempts}`);
      
      // Simple elapsed time tracking
      const startTime = Date.now();
      
      while (!isComplete && attempts < maxAttempts) {
        attempts++;
        
        // Show status messages at certain intervals
        if (statusMessages[attempts]) {
          console.log(statusMessages[attempts]);
        }
        
        // Wait 2 seconds between polls
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check task progress using our centralized API call function
        const data = await makeApiCall(
          `https://papi.dzine.ai/openapi/v1/get_task_progress/${taskId}`,
          'GET',
          null,
          3 // 3 retries for status check
        );
        
        // Debug: Log the task progress response (but not on every attempt to avoid console spam)
        if (attempts % 5 === 0 || attempts === 1) {
          console.log(`Task Progress (Attempt ${attempts}/${maxAttempts}):`, JSON.stringify(data, null, 2));
        }
        
        if (data.code === 200 && data.data) {
          const status = data.data.status;
          console.log(`Task status (${attempts}/${maxAttempts}):`, status);
          
          if (status === 'success' || status === 'succeeded' || status === 'succeed') {
            isComplete = true;
            
            // Debug: Log the generate_result_slots
            console.log('Result slots:', data.data.generate_result_slots);
            
            // Check if the generate_result_slots array exists and has contents
            if (!data.data.generate_result_slots || !Array.isArray(data.data.generate_result_slots) || data.data.generate_result_slots.length === 0) {
              console.error('Missing or empty generate_result_slots array in response:', data.data);
              throw new Error('The API returned success but did not provide any result images. Try again.');
            }
            
            // Get the first non-empty image URL from generate_result_slots
            const resultUrl = data.data.generate_result_slots.find(url => url && url.trim() !== '');
            
            if (resultUrl) {
              // Verify that this URL is valid before proceeding
              try {
                new URL(resultUrl); // This will throw if the URL is invalid
                setResult({ url: resultUrl });
                console.log('Successfully retrieved result image URL:', resultUrl);
              } catch (e) {
                console.error('Invalid URL format in result:', resultUrl);
                throw new Error('The API returned an invalid image URL. Please try again.');
              }
            } else {
              console.error('No non-empty URL found in generate_result_slots:', data.data.generate_result_slots);
              throw new Error('No result image found in API response. The transformation might have failed.');
            }
          } else if (status === 'failed') {
            console.error('Task failed:', data.data);
            throw new Error(`Task failed: ${data.data.error_reason || 'Unknown error'}`);
          } else {
            // Still processing, continue polling
            console.log(`Task in progress: ${status}, attempt ${attempts}/${maxAttempts}`);
          }
        } else {
          console.error('Invalid task progress response structure:', data);
          throw new Error(`Invalid task progress format: ${JSON.stringify(data)}`);
        }
      }
      
      if (!isComplete) {
        const timeoutMinutes = Math.round((maxAttempts * 2) / 60);
        throw new Error(`Task processing timed out after ${timeoutMinutes} minutes. Please try again or try a different style.`);
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
              <div className="test-links">
                <a href="/editor" className="test-link">Test Editor Tool →</a>
              </div>
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
                      window.location.href = '/editor';
                    }}
                    className="create-product-button"
                  >
                    Continue to Image Editor
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
        <Route path="/editor" element={<ImageEditor />} />
      </Routes>
    </Router>
  );
}

export default App;