import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './App.css';

function StyleTest() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [styleList, setStyleList] = useState([]);
  const [groupedStyles, setGroupedStyles] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const [baseModels, setBaseModels] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Fetch style list on component mount
  useEffect(() => {
    fetchStyleList();
  }, []);

  // Fetch style list from the Dzine.ai API
  const fetchStyleList = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get API key from environment variables
      const apiKey = process.env.REACT_APP_DZINE_API_KEY;
      
      // Check if we have an API key
      if (!apiKey || apiKey === 'your_api_key_here') {
        throw new Error('No valid API key configured. Please set up your REACT_APP_DZINE_API_KEY');
      }
      
      // Fetch the style list
      console.log('Fetching style list with API key:', apiKey.substring(0, 5) + '...');
      
      const response = await fetch('https://papi.dzine.ai/openapi/v1/style/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey.trim() // Make sure there's no whitespace
        }
      });
      
      if (!response.ok) {
        console.error('Style list fetch failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch style list: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Style list API response code:', data.code);
      
      if (data.code === 200 && data.data && data.data.list) {
        const styles = data.data.list;
        console.log(`Received ${styles.length} styles from API`);
        setStyleList(styles);
        
        // Group styles by base_model
        const grouped = {};
        const models = new Set();
        
        styles.forEach(style => {
          const model = style.base_model;
          models.add(model);
          
          if (!grouped[model]) {
            grouped[model] = [];
          }
          
          grouped[model].push(style);
        });
        
        console.log('Found base models:', Array.from(models));
        console.log('Grouped styles:', Object.keys(grouped).map(key => `${key}: ${grouped[key].length} styles`));
        
        setGroupedStyles(grouped);
        setBaseModels(Array.from(models).sort());
      } else {
        console.error('Invalid style list API response structure:', data);
        throw new Error(`Invalid style list API response: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error('Error fetching style list:', error);
      setError(error.message);
      
      // Create some mock data for testing UI if API fails
      const mockModels = ['S', 'X'];
      const mockGrouped = {
        'S': [
          { name: 'Mock S Style 1', style_code: 'mock-s-1', base_model: 'S' },
          { name: 'Mock S Style 2', style_code: 'mock-s-2', base_model: 'S' }
        ],
        'X': [
          { name: 'Mock X Style 1', style_code: 'mock-x-1', base_model: 'X' },
          { name: 'Mock X Style 2', style_code: 'mock-x-2', base_model: 'X' }
        ]
      };
      
      setBaseModels(mockModels);
      setGroupedStyles(mockGrouped);
    } finally {
      setIsLoading(false);
    }
  };

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
  
  // Function to compress/resize image before upload (same as in App.js)
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

  const applyStyle = async (styleCode, baseModel) => {
    console.log('Applying style:', styleCode, 'with base model:', baseModel);
    setSelectedStyle(styleCode);
    setResult(null);
    setStatusMessage(null);
    setProgress(0);
    
    if (uploadedImage) {
      setIsProcessing(true);
      setError(null);
      
      // Check if it's an X base model (which doesn't support img2img)
      if (baseModel === 'X') {
        console.log('Model X detected - these models do not support img2img operations');
        setTimeout(() => {
          setIsProcessing(false);
          setError('Base Model X styles cannot be used with img2img transformations. Please try a style from Base Model S instead.');
        }, 1000); // Add a small delay so the user sees the processing indicator
        return;
      }
      
      try {
        // Get API key from environment variables
        const apiKey = process.env.REACT_APP_DZINE_API_KEY;
        
        // Check if we have an API key
        if (!apiKey || apiKey === 'your_api_key_here') {
          throw new Error('No valid API key configured');
        }
        
        // Convert image to base64
        const base64Image = await fileToBase64(uploadedImage);
        
        // Make the API request to apply the style
        console.log(`Sending img2img request with style_code: ${styleCode} (base model: ${baseModel})`);
        const response = await fetch('https://papi.dzine.ai/openapi/v1/create_task_img2img', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey.trim() // Make sure there's no whitespace
          },
          body: JSON.stringify({
            prompt: "Transform this image with the selected style",
            style_code: styleCode,
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
          throw new Error(`Failed to create styling task: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Debug: Log the full API response
        console.log('API Response:', JSON.stringify(data, null, 2));
        
        if (data.code === 200 && data.data && data.data.task_id) {
          // Poll for task completion
          await pollTaskProgress(data.data.task_id, baseModel);
        } else if (data.code === 108005) {
          // Handle the specific style invalid error
          throw new Error(`Style not compatible with img2img. This is common with Model X styles. Try a Model S style instead.`);
        } else {
          console.error('Invalid API response structure:', data);
          throw new Error(`Invalid API response format: ${JSON.stringify(data)}`);
        }
      } catch (error) {
        console.error('Error processing image:', error);
        setIsProcessing(false);
        setError(`Failed to process image: ${error.message}`);
      }
    } else {
      setError('Please upload an image first');
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
  const pollTaskProgress = async (taskId, baseModel) => {
    try {
      let isComplete = false;
      let attempts = 0;
      // Increase timeout for S base model which might take longer
      const maxAttempts = baseModel === 'S' ? 60 : 30; // More attempts for S model (2 mins vs 1 min)
      let statusMessageShown = null;
      
      console.log(`Starting task polling for ${baseModel} model, task ID: ${taskId}, max attempts: ${maxAttempts}`);
      
      // Get API key from environment variables
      const apiKey = process.env.REACT_APP_DZINE_API_KEY;
      
      // Check if we have an API key
      if (!apiKey || apiKey === 'your_api_key_here') {
        throw new Error('No valid API key configured');
      }
      
      // Function to show status message to user
      const updateStatusMessage = (status, attempt) => {
        const progressPct = Math.round((attempt/maxAttempts) * 100);
        const message = `Processing image (${status})... ${progressPct}%`;
        if (message !== statusMessageShown) {
          statusMessageShown = message;
          // Update the status message and progress states
          setStatusMessage(message);
          setProgress(progressPct);
          // Also update document title
          document.title = `Processing: ${progressPct}%`;
        }
      };
      
      while (!isComplete && attempts < maxAttempts) {
        attempts++;
        
        // Wait 2 seconds between polls
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check task progress
        const response = await fetch(`https://papi.dzine.ai/openapi/v1/get_task_progress/${taskId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': apiKey.trim() // Make sure there's no whitespace
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to check task progress: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Debug: Log the task progress response (but not on every attempt to avoid console spam)
        if (attempts % 5 === 0 || attempts === 1) {
          console.log(`Task Progress (Attempt ${attempts}/${maxAttempts}):`, JSON.stringify(data, null, 2));
        }
        
        if (data.code === 200 && data.data) {
          const status = data.data.status;
          console.log(`Task status (${attempts}/${maxAttempts}):`, status);
          
          // Update the user with progress
          updateStatusMessage(status, attempts);
          
          if (status === 'success' || status === 'succeeded') {
            isComplete = true;
            setError(null); // Clear status message
            
            // Debug: Log the generate_result_slots
            console.log('Result slots:', data.data.generate_result_slots);
            
            // Get the first non-empty image URL from generate_result_slots
            const resultUrl = data.data.generate_result_slots.find(url => url && url.trim() !== '');
            
            if (resultUrl) {
              setResult({ url: resultUrl });
              console.log('Successfully retrieved result image URL:', resultUrl);
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
        throw new Error(`Task processing timed out after ${maxAttempts * 2} seconds. The S base model can sometimes take longer than our timeout period. Try again or try a different style.`);
      }
    } catch (error) {
      console.error('Error polling task progress:', error);
      setError(`Task error: ${error.message}`);
      throw error;
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
      setProgress(0);
      document.title = 'Dzine.ai Style Testing'; // Reset the page title
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Dzine.ai Style Testing</h1>
        <p className="subtitle">Test different styles and base models with your images</p>
        <Link to="/" className="back-link">Back to Home</Link>
      </header>
      
      <main>
        <section className="upload-section-container">
          <h2>Upload Test Image</h2>
          <div 
            className={`upload-section ${isDragging ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg className="upload-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 15v3H6v-3H4v3c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-3h-2zM7 9l1.41 1.41L11 7.83V16h2V7.83l2.59 2.58L17 9l-5-5-5 5z"/>
            </svg>
            
            <h3 className="upload-heading">Upload Your Test Image</h3>
            
            <p className="upload-text">
              {uploadedImage 
                ? `Selected file: ${uploadedImage.name}` 
                : 'Upload an image to test with different styles'}
            </p>
            
            <button 
              className="upload-button"
              onClick={handleButtonClick}
            >
              {uploadedImage ? 'Change Image' : 'Upload Image'}
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
          <div className="uploaded-image-preview">
            <h3>Preview of Uploaded Image</h3>
            <img 
              src={URL.createObjectURL(uploadedImage)} 
              alt="Uploaded preview" 
              className="image-preview"
            />
          </div>
        )}
        
        {isLoading ? (
          <div className="loading">Loading style list...</div>
        ) : error && !baseModels.length ? (
          <div className="error">Error: {error}</div>
        ) : (
          <section className="style-test-section">
            <h2>Test Styles by Base Model</h2>
            <p className="test-instruction">
              Upload an image first, then click on a style to apply it. Styles are grouped by base model.
            </p>
            
            <div className="tabs">
              {baseModels.map(model => (
                <div key={model} className="tab-container">
                  <h3 className="model-heading">Model: {model}</h3>
                  <div className="style-grid-test">
                    {groupedStyles[model]?.map(style => (
                      <button
                        key={style.style_code}
                        onClick={() => applyStyle(style.style_code, style.base_model)}
                        className={`style-button-test ${selectedStyle === style.style_code ? 'selected' : ''}`}
                        disabled={!uploadedImage || isProcessing}
                      >
                        <div className="style-name-test">{style.name}</div>
                        <div className="style-info">Style Code: {style.style_code}</div>
                        {style.cover_url && (
                          <img 
                            src={style.cover_url} 
                            alt={`${style.name} sample`} 
                            className="style-preview"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/images/placeholder.png';
                              e.target.alt = 'Preview not available';
                            }}
                          />
                        )}
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
                </div>
              ))}
            </div>
          </section>
        )}
        
        {isProcessing && (
          <div className="processing">
            <div className="spinner"></div>
            <p id="processing-status">
              {statusMessage || "Processing your image with the selected style..."}
            </p>
            {progress > 0 && (
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
            )}
          </div>
        )}
        
        {error && uploadedImage && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {result && (
          <section className="result-section-test">
            <h2>Style Test Result</h2>
            <div className="result-container">
              <div className="image-comparison">
                <div className="original-image">
                  <h4>Original Image</h4>
                  <img 
                    src={URL.createObjectURL(uploadedImage)} 
                    alt="Original" 
                    className="comparison-image"
                  />
                </div>
                <div className="styled-image">
                  <h4>Styled Result</h4>
                  <img 
                    src={result.url} 
                    alt="Styled result" 
                    className="comparison-image"
                  />
                </div>
              </div>
              <div className="result-info">
                <p>
                  The selected style has been applied successfully!
                </p>
                <button 
                  className="download-button"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = result.url;
                    link.download = 'styled-image.jpg';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  Download Result
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default StyleTest;