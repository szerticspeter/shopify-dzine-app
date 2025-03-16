import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import ProductSelect from './ProductSelect';

function App() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [styles, setStyles] = useState([]);

  // Fetch available styles from Dzine.ai
  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const response = await fetch('https://papi.dzine.ai/openapi/v1/style/list', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.REACT_APP_DZINE_API_KEY
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.code === 200 && data.data && data.data.list) {
          // Filter to show only specific styles
          const allowedStyles = ['flamenco dance', 'gta comic', 'toon face', 'magic portrait', 'delicate aquarell', 'skyborne realm', 'vibrant impasto'];
          const filteredStyles = data.data.list.filter(style => 
            allowedStyles.includes(style.name.toLowerCase())
          );
          
          setStyles(filteredStyles.length > 0 ? filteredStyles : data.data.list);
          console.log('Available styles after filtering:', filteredStyles);
        } else {
          throw new Error(data.msg || 'Failed to load styles');
        }
      } catch (error) {
        console.error('Error fetching styles:', error);
        
        // Fallback to mock styles with allowed styles if API call fails
        const mockStyles = [
          { style_code: 'mock-style-1', name: 'Flamenco Dance' },
          { style_code: 'mock-style-2', name: 'GTA Comic' },
          { style_code: 'mock-style-3', name: 'Toon Face' },
          { style_code: 'mock-style-4', name: 'Magic Portrait' },
          { style_code: 'mock-style-5', name: 'Delicate Aquarell' },
          { style_code: 'mock-style-6', name: 'Skyborne Realm' },
          { style_code: 'mock-style-7', name: 'Vibrant Impasto' }
        ];
        
        setStyles(mockStyles);
        alert('Error loading styles from API. Using mock styles for testing.');
      }
    };

    fetchStyles();
  }, []);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedImage(file);
      setResult(null);
    }
  };

  const handleStyleSelect = async (styleCode) => {
    console.log('Selected style code:', styleCode);
    setSelectedStyle(styleCode);
    if (uploadedImage) {
      setIsProcessing(true);
      
      try {
        // First, upload the image
        console.log('Starting image upload...');
        const formData = new FormData();
        formData.append('file', uploadedImage);

        const uploadResponse = await fetch('https://papi.dzine.ai/openapi/v1/file/upload', {
          method: 'POST',
          headers: {
            'Authorization': process.env.REACT_APP_DZINE_API_KEY
          },
          body: formData
        });

        const uploadData = await uploadResponse.json();
        console.log('Upload response:', uploadData);

        if (uploadData.code !== 200) {
          throw new Error(uploadData.msg || 'Failed to upload image');
        }

        // Now create the img2img task with the uploaded image URL
        const taskRequestBody = {
          prompt: "Transform this image",
          images: [{
            url: uploadData.data.file_path
          }],
          style_code: styleCode,
          generate_slots: [1,0,0,0],
          quality_mode: 1,
          style_intensity: 0.7,
          structure_match: 0.7,
          color_match: 0,
          face_match: 1
        };
        
        console.log('Creating task with:', taskRequestBody);

        const taskResponse = await fetch('https://papi.dzine.ai/openapi/v1/create_task_img2img', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.REACT_APP_DZINE_API_KEY
          },
          body: JSON.stringify(taskRequestBody)
        });

        const taskData = await taskResponse.json();
        console.log('Task creation response:', taskData);

        if (taskData.code !== 200) {
          throw new Error(taskData.msg || 'Failed to create task');
        }

        // Poll for task completion
        const taskId = taskData.data.task_id;
        let resultUrl = null;
        let attempts = 0;
        const maxAttempts = 60; // 120 seconds total
        
        while (!resultUrl && attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const progressResponse = await fetch(`https://papi.dzine.ai/openapi/v1/get_task_progress/${taskId}`, {
            headers: {
              'Authorization': process.env.REACT_APP_DZINE_API_KEY
            }
          });
          
          const progressData = await progressResponse.json();
          console.log('Progress check attempt', attempts, 'Status:', progressData.data.status);
          console.log('Full progress data:', progressData.data);
          
          // Check for both 'succeeded' and 'succeed'
          if ((progressData.data.status === 'succeeded' || progressData.data.status === 'succeed') && 
              progressData.data.generate_result_slots && 
              progressData.data.generate_result_slots[0]) {
            resultUrl = progressData.data.generate_result_slots[0];
            console.log('Success! Result URL:', resultUrl);
            break;
          } else if (progressData.data.status === 'failed') {
            throw new Error(`Task processing failed: ${progressData.data.error_reason || 'Unknown error'}`);
          } else if (attempts >= maxAttempts) {
            throw new Error('Task processing timed out after 120 seconds');
          }
        }

        if (resultUrl) {
          setResult({ url: resultUrl });
        } else {
          throw new Error('No result URL found in successful response');
        }
        
        // Fallback implementation in case the API call fails
        /*
        // Convert the uploaded image to a Base64 data URL
        const reader = new FileReader();
        reader.readAsDataURL(uploadedImage);
        
        // When the reader is done, set the result
        reader.onloadend = async () => {
          const base64Image = reader.result;
          console.log('Mock processing - created Base64 image');
          
          // Simulate a short processing delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Set the result to the Base64 data URL
          setResult({ url: base64Image });
        };
        */
        
      } catch (error) {
        console.error('Detailed error:', error);
        alert(`Error processing image: ${error.message}`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="App">
            <header className="App-header">
              <h1>Dzine.ai Personalized Products</h1>
            </header>
            
            <main>
              <div className="upload-section">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="file-input"
                />
              </div>

              {uploadedImage && (
                <div className="style-section">
                  <h2>Select Style</h2>
                  <div className="style-grid">
                    {styles.map((style) => (
                      <button
                        key={style.style_code}
                        onClick={() => handleStyleSelect(style.style_code)}
                        className={`style-button ${selectedStyle === style.style_code ? 'selected' : ''}`}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isProcessing && <div className="processing">Processing your image...</div>}

              {result && (
                <div className="result-section">
                  <img src={result.url} alt="Stylized result" />
                  <button 
                    onClick={() => {
                      // Store image in sessionStorage instead of URL parameter
                      sessionStorage.setItem('stylizedImage', result.url);
                      window.location.href = '/products';
                    }}
                    className="create-product-button"
                  >
                    Continue to Products
                  </button>
                </div>
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