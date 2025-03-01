import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [styles, setStyles] = useState([]);

  // Mock styles for testing
  useEffect(() => {
    // Use mock styles instead of fetching from Dzine API
    const mockStyles = [
      { style_code: 'mock-style-1', name: 'Watercolor' },
      { style_code: 'mock-style-2', name: 'Oil Painting' },
      { style_code: 'mock-style-3', name: 'Sketch' },
      { style_code: 'mock-style-4', name: 'Abstract' },
      { style_code: 'mock-style-5', name: 'Digital Art' },
      { style_code: 'mock-style-6', name: 'Pencil Drawing' }
    ];
    
    setStyles(mockStyles);
    
    /* REAL IMPLEMENTATION COMMENTED OUT
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
          setStyles(data.data.list);
          console.log('Available styles:', data.data.list);
        } else {
          throw new Error(data.msg || 'Failed to load styles');
        }
      } catch (error) {
        console.error('Error fetching styles:', error);
        alert('Error loading available styles');
      }
    };

    fetchStyles();
    */
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
        // MOCK IMPLEMENTATION FOR TESTING
        // Skip Dzine.ai API calls and just use the uploaded image directly
        
        // Create a URL for the uploaded image
        const imageUrl = URL.createObjectURL(uploadedImage);
        console.log('Mock processing - using original image:', imageUrl);
        
        // Simulate a short processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Set the result to the original image URL
        setResult({ url: imageUrl });
        
        /* REAL IMPLEMENTATION COMMENTED OUT
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
          style_intensity: 1,
          structure_match: 0.8,
          color_match: 0,
          face_match: 0
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
    <div className="App">
      <header className="App-header">
        <h1>Dzine.ai Canvas Creator</h1>
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
              onClick={() => window.location.href = `/products/create?image=${result.url}`}
              className="create-product-button"
            >
              Create Canvas Product
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;