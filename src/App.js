import React, { useState } from 'react';
import './App.css';

function App() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedImage(file);
      setResult(null);
    }
  };

  const handleStyleSelect = async (style) => {
    setSelectedStyle(style);
    if (uploadedImage) {
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append('image', uploadedImage);
        formData.append('style', style);

        const response = await fetch('https://api.dzine.ai/v1/stylize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_DZINE_API_KEY}`
          },
          body: formData
        });

        const data = await response.json();
        setResult(data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const styles = [
    { id: 'modern', name: 'Modern' },
    { id: 'abstract', name: 'Abstract' },
    { id: 'painterly', name: 'Painterly' }
  ];

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
                  key={style.id}
                  onClick={() => handleStyleSelect(style.id)}
                  className={`style-button ${selectedStyle === style.id ? 'selected' : ''}`}
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