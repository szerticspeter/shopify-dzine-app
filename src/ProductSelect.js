import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function ProductSelect() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  // Default selected product to the cushion from the example
  const [selectedProduct, setSelectedProduct] = useState({
    id: 'cushion', 
    name: 'Suede Cushion', 
    prodigiUrl: 'https://www.prodigi.com/products/homeware/cushions/suede-cushion/',
    prodigiShopCode: 'suede_12x12_cushion'
  });
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Focus only on the cushion product for now (as per the example)
  const productTypes = [
    { 
      id: 'cushion', 
      name: 'Suede Cushion', 
      prodigiUrl: 'https://www.prodigi.com/products/homeware/cushions/suede-cushion/',
      prodigiShopCode: 'suede_12x12_cushion'
    }
  ];
  
  // For image uploads via Prodigi WebSDK
  // Use environment variable if available, fall back to demo key for testing
  const PRODIGI_CLIENT_KEY = process.env.REACT_APP_PRODIGI_API_KEY || "prodigi-demo-key";
  
  // Test image URL for debugging (Unsplash image)
  const TEST_IMAGE_URL = "https://plus.unsplash.com/premium_photo-1664474619075-644dd191935f?q=80&w=1469&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

  useEffect(() => {
    try {
      // Get image from sessionStorage instead of URL parameter
      const image = sessionStorage.getItem('stylizedImage') || TEST_IMAGE_URL; // Fallback to test image
      
      if (!image) {
        throw new Error('No image data found. Please upload and stylize an image first.');
      }

      // Check if it's a Base64 data URL
      if (image.startsWith('data:image/')) {
        console.log('Received Base64 image data from sessionStorage');
      } else {
        console.log('Received image URL from sessionStorage');
      }
      
      setImageUrl(image);
      setLoading(false);
    } catch (err) {
      console.error('Error processing image data:', err);
      setError(err.message);
      setLoading(false);
    }
  }, []);

  const handleProductSelect = (productType) => {
    setSelectedProduct(productType);
    console.log('Selected product:', productType);
  };
  
  // State for iframe control
  const [showIframe, setShowIframe] = useState(false);
  const [iframeUrl, setIframeUrl] = useState('');
  
  const openProdigiEditor = () => {
    console.log('Opening Prodigi editor...');
    
    if (!selectedProduct) {
      alert('Please select a product first');
      return;
    }
    
    if (!imageUrl) {
      alert('No image available. Please go back and create an image first.');
      return;
    }
    
    try {
      console.log('Using Prodigi API key:', PRODIGI_CLIENT_KEY ? 'Key available' : 'No key found');
      
      // For base64 images, we need to handle them differently
      if (imageUrl.startsWith('data:')) {
        localStorage.setItem('lastDesignImage', imageUrl);
        console.log('Saved image to localStorage for demo');
        
        // Show message about downloading the image
        alert('For Base64 images, you need to download the image and then upload it in the Prodigi editor.');
        
        // Show download button for the image
        displayDownloadButton();
        
        // Use the regular product page for base64 images
        const prodigiUrl = selectedProduct.prodigiUrl;
        // Set the iframe URL to the regular product page
        setIframeUrl(prodigiUrl);
        setShowIframe(true);
        
        return;
      }
      
      // DIRECT URL APPROACH with iframe: Use the direct shop.prodigi.com URL with image parameter
      // Get the templateId for the selected product (not SKU - templateId is needed for deep links)
      const templateId = selectedProduct.prodigiShopCode;
      console.log('Using templateId for Prodigi deep link:', templateId);
      
      // Calculate image dimensions (we'll use fixed dimensions for now)
      const imageDimensions = "1280x1280"; // Default dimensions
      
      // Build the direct shop URL with image parameter using the templateId 
      // Format: https://shop.prodigi.com/${brandName}/create/${templateId}?image=${imageUrl}|${imageWidth}x${imageHeight}
      const directShopUrl = `https://shop.prodigi.com/prodigi/create/${templateId}?image=${encodeURIComponent(imageUrl)}|${imageDimensions}`;
      
      console.log('Setting Prodigi shop URL in iframe:', directShopUrl);
      
      // Set the iframe URL and show it instead of redirecting
      setIframeUrl(directShopUrl);
      setShowIframe(true);
      
    } catch (error) {
      console.error('Error setting up Prodigi editor:', error);
      alert('There was an error setting up the product editor. Please try again or refresh the page.');
      
      // Fallback to the direct product URL without image parameter
      const prodigiUrl = selectedProduct.prodigiUrl;
      console.log('Falling back to regular product page:', prodigiUrl);
      
      // Set the iframe URL to the fallback URL
      setIframeUrl(prodigiUrl);
      setShowIframe(true);
      
      // Show download button for the image as fallback
      displayDownloadButton();
    }
  };
  
  // Helper function to display the download button for manual uploads
  const displayDownloadButton = () => {
    const downloadContainer = document.createElement('div');
    downloadContainer.style.padding = '20px';
    downloadContainer.style.margin = '20px auto';
    downloadContainer.style.maxWidth = '500px';
    downloadContainer.style.backgroundColor = '#f5f5f5';
    downloadContainer.style.borderRadius = '8px';
    downloadContainer.style.textAlign = 'center';
    
    const heading = document.createElement('h3');
    heading.innerText = 'Download Your Image';
    heading.style.marginTop = '0';
    
    const instructions = document.createElement('p');
    instructions.innerText = 'First download your image, then upload it to Prodigi when prompted.';
    
    const downloadButton = document.createElement('button');
    downloadButton.innerText = 'Download Image';
    downloadButton.style.padding = '10px 20px';
    downloadButton.style.backgroundColor = '#2196F3';
    downloadButton.style.color = 'white';
    downloadButton.style.border = 'none';
    downloadButton.style.borderRadius = '4px';
    downloadButton.style.cursor = 'pointer';
    downloadButton.style.marginTop = '10px';
    
    downloadButton.onclick = () => {
      // Create an anchor element for downloading
      const a = document.createElement('a');
      a.href = imageUrl;
      a.download = 'stylized-design.jpg';
      a.click();
    };
    
    downloadContainer.appendChild(heading);
    downloadContainer.appendChild(instructions);
    downloadContainer.appendChild(downloadButton);
    
    // Find a good place to insert it in the DOM
    const actionButtons = document.querySelector('.action-buttons');
    if (actionButtons) {
      actionButtons.parentNode.insertBefore(downloadContainer, actionButtons.nextSibling);
    } else {
      // Fallback - add to body
      document.body.appendChild(downloadContainer);
    }
  };

  // We no longer need the product card renderer since we're only using a single product

  // If there's an error, show it
  if (error) {
    return (
      <div className="error-container">
        <h2>Error Processing Image</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  // Product selection screen with image preview or iframe
  return (
    <div className="product-select-container" style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      {!showIframe ? (
        // Product selection view
        <>
          <h2>Customize Your Suede Cushion</h2>
          
          {/* Image preview */}
          {imageUrl && (
            <div className="image-preview-container" style={{ marginBottom: '30px', textAlign: 'center' }}>
              <h3>Your Stylized Image</h3>
              <img 
                src={imageUrl} 
                alt="Stylized design" 
                style={{ maxWidth: '300px', maxHeight: '300px', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          )}
          
          {/* Product info */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <p>Your design will be applied to a premium 12"x12" Suede Cushion.</p>
            <img 
              src="https://images.ctfassets.net/rw1l6cgr235r/73vvfy1Wr6wxKvCMQCXw88/aab1ba99f38d7c0a277e8a1d5e502504/cushion-suede-square-01-min.jpg" 
              alt="Suede Cushion Example" 
              style={{ maxWidth: '200px', margin: '10px auto', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          
          {/* Continue button */}
          <div className="action-buttons" style={{ marginTop: '30px', textAlign: 'center' }}>
            <button 
              onClick={() => {
                console.log('Continue to Customize button clicked');
                openProdigiEditor();
              }}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Customize Your Cushion
            </button>
            
            <button 
              onClick={() => navigate('/')}
              style={{
                backgroundColor: '#f1f1f1',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              Create Another Design
            </button>
          </div>
          
          {/* Helper text */}
          <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '14px' }}>
            <h4 style={{ marginTop: 0 }}>About This Product</h4>
            <p>This premium Suede Cushion features:</p>
            <ul>
              <li>12"x12" size (30.5 x 30.5cm)</li>
              <li>Soft suede-like material</li>
              <li>Custom printed with your unique design</li>
              <li>High-quality production by Prodigi</li>
              <li>Worldwide shipping available</li>
            </ul>
            <p><strong>Note:</strong> When you click "Customize", you'll be able to adjust the positioning of your design directly within the editor below.</p>
          </div>
        </>
      ) : (
        // Prodigi iframe view
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Customize Your Suede Cushion</h2>
            <button 
              onClick={() => setShowIframe(false)}
              style={{
                backgroundColor: '#f1f1f1',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Back to Selection
            </button>
          </div>
          
          {/* Prodigi iframe */}
          <div style={{ border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden', marginBottom: '20px' }}>
            <iframe 
              src={iframeUrl} 
              title="Prodigi Customizer"
              style={{ width: '100%', height: '800px', border: 'none' }}
              allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi"
            />
          </div>
          
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '14px' }}>
            <p><strong>Having trouble?</strong> If the Prodigi customizer doesn't load correctly, you can also <a href={iframeUrl} target="_blank" rel="noopener noreferrer">open it in a new tab</a>.</p>
          </div>
        </>
      )}
    </div>
  );
}

export default ProductSelect;