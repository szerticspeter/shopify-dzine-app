import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function ProductSelect() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Define product types with correct Prodigi SKUs
  const productTypes = [
    { id: 'canvas', name: 'Canvas Print', prodigiSku: 'canvas-prints/canvas-wrap/12x16-inch' },
    { id: 'mug', name: 'Coffee Mug', prodigiSku: 'drinkware/mugs/11oz-white' },
    { id: 'tshirt', name: 'T-Shirt', prodigiSku: 'clothing/t-shirts/mens/standard/medium-white' }
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
    
    // Just open the Prodigi product page directly in a new tab
    try {
      console.log('Using Prodigi API key:', PRODIGI_CLIENT_KEY ? 'Key available' : 'No key found');
      
      // Save the image to localStorage for demo purposes
      // In a real app, you would upload the image to a server and get a URL
      if (imageUrl.startsWith('data:')) {
        localStorage.setItem('lastDesignImage', imageUrl);
        console.log('Saved image to localStorage for demo');
      }
      
      // Direct to Prodigi's product page
      const prodigiUrl = `https://www.prodigi.com/products/${selectedProduct.prodigiSku}/`;
      console.log('Opening Prodigi product page:', prodigiUrl);
      
      // Show instructions before opening
      alert('You will now be redirected to Prodigi to complete your order. Please upload your image manually on their site.');
      
      // Open in new tab
      window.open(prodigiUrl, '_blank');
      
      // Show download button for the image
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
    } catch (error) {
      console.error('Error opening Prodigi product page:', error);
      alert('There was an error opening the product page. Please try again or refresh the page.');
    }
  };

  // Render a product card for each product type
  const renderProductCard = (product) => {
    return (
      <div 
        key={product.id} 
        className={`product-card ${selectedProduct?.id === product.id ? 'selected' : ''}`}
        onClick={() => handleProductSelect(product)}
        style={{
          border: selectedProduct?.id === product.id ? '2px solid #4CAF50' : '1px solid #ddd',
          borderRadius: '8px',
          padding: '20px',
          margin: '10px',
          cursor: 'pointer',
          backgroundColor: selectedProduct?.id === product.id ? '#f0f9f0' : '#fff',
          maxWidth: '250px'
        }}
      >
        <h3>{product.name}</h3>
        <div className="product-image-container" style={{ position: 'relative', marginBottom: '15px' }}>
          <div style={{ 
            width: '100%', 
            height: '150px', 
            backgroundColor: '#f5f5f5',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
          }}>
            {imageUrl && (
              <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                {/* Product mockup image */}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <span>{product.name} Preview</span>
                </div>
                
                {/* User's image as a small overlay */}
                <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '60px', height: '60px', overflow: 'hidden', border: '2px solid white' }}>
                  <img 
                    src={imageUrl} 
                    alt="Your design" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <p>Apply your design to a {product.name.toLowerCase()}</p>
      </div>
    );
  };

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

  // Product selection screen with image preview
  return (
    <div className="product-select-container" style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      <h2>Select a Product for Your Design</h2>
      
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
      
      {/* Product grid */}
      <div className="product-grid" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
        {productTypes.map(product => renderProductCard(product))}
      </div>
      
      {/* Continue button */}
      <div className="action-buttons" style={{ marginTop: '30px', textAlign: 'center' }}>
        <button 
          onClick={() => {
            console.log('Continue to Customize button clicked');
            openProdigiEditor();
          }}
          disabled={!selectedProduct}
          style={{
            backgroundColor: selectedProduct ? '#4CAF50' : '#ccc',
            color: 'white',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '16px',
            cursor: selectedProduct ? 'pointer' : 'not-allowed',
            marginRight: '10px'
          }}
        >
          Continue to Customize
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
        <h4 style={{ marginTop: 0 }}>About Prodigi Integration</h4>
        <p>This app works with Prodigi to create customized products with your design:</p>
        <ol>
          <li>Select your product type above</li>
          <li>Click "Continue to Customize" to go to Prodigi's website</li>
          <li>Download your image using the download button that will appear</li>
          <li>Upload your downloaded image to Prodigi when prompted</li>
          <li>Complete your order with shipping details</li>
          <li>Pay securely through Prodigi's checkout</li>
        </ol>
        <p><strong>Note:</strong> Prodigi handles all product creation and shipping.</p>
      </div>
    </div>
  );
}

export default ProductSelect;