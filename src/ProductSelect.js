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
  
  // Define product types
  const productTypes = [
    { id: 'canvas', name: 'Canvas Print', prodigiSku: 'GLOBAL-CFP-30x40CM' },
    { id: 'mug', name: 'Coffee Mug', prodigiSku: 'GLOBAL-MUG-11OZ' },
    { id: 'tshirt', name: 'T-Shirt', prodigiSku: 'GLOBAL-TSHIRT-L' }
  ];
  
  // For image uploads via Prodigi WebSDK - Use Prodigi's demo key for testing
  const PRODIGI_CLIENT_KEY = "prodigi-demo-key";
  
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
    
    // Load Prodigi WebSDK script
    const loadProdigiSDK = () => {
      // Remove any existing script first to prevent duplicates
      const existingScripts = document.querySelectorAll('script[src*="prodigi-web-to-print-sdk"]');
      existingScripts.forEach(script => script.remove());
      
      console.log('Loading Prodigi SDK script...');
      
      const script = document.createElement('script');
      script.src = 'https://sdk.prodigi.com/web-to-print/v5/prodigi-web-to-print-sdk.umd.min.js';
      script.async = false;
      script.id = 'prodigi-sdk-script';
      
      script.onload = () => {
        console.log('Prodigi WebSDK script loaded successfully');
        setSdkLoaded(true);
        
        // Check if the SDK is properly loaded
        if (window.ProdigiWebToPreviewAndPrint) {
          console.log('ProdigiWebToPreviewAndPrint global object is available');
        } else {
          console.warn('SDK script loaded but ProdigiWebToPreviewAndPrint global object not found');
          console.log('Available window properties:', Object.keys(window).filter(key => key.toLowerCase().includes('prodigi')));
        }
      };
      
      script.onerror = (error) => {
        console.error('Error loading Prodigi WebSDK:', error);
        alert('Failed to load the Prodigi SDK. Please refresh and try again.');
      };
      
      document.head.appendChild(script);
    };
    
    loadProdigiSDK();
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
    
    // For debugging - let's see what's available in the window object
    console.log('Checking for Prodigi SDK availability...');
    console.log('SDK Loaded state:', sdkLoaded);
    console.log('Window properties containing "prodigi":', 
      Object.keys(window).filter(key => key.toLowerCase().includes('prodigi')));
    
    // Direct integration approach - Use a simpler approach for testing
    try {
      // Try using window.open with the editor URL directly
      const directUrl = `https://configurator.prodigi.com/product/configure?product=${selectedProduct.prodigiSku}&client_key=${PRODIGI_CLIENT_KEY}`;
      console.log('Opening direct URL:', directUrl);
      
      // Open in new tab
      window.open(directUrl, '_blank');
      
      // As a fallback, also try the SDK if available
      if (window.ProdigiWebToPreviewAndPrint) {
        console.log('SDK global object found, attempting initialization');
        
        try {
          const sdk = window.ProdigiWebToPreviewAndPrint.initialize({
            clientKey: PRODIGI_CLIENT_KEY
          });
          
          console.log('SDK initialized successfully, opening product builder');
          
          sdk.openProductBuilder({
            sku: selectedProduct.prodigiSku,
            images: [
              {
                url: imageUrl,
                thumbnailUrl: imageUrl
              }
            ],
            callbackUrl: window.location.origin
          });
        } catch (sdkError) {
          console.error('Error initializing Prodigi SDK:', sdkError);
        }
      } else {
        console.warn('ProdigiWebToPreviewAndPrint not found in window object');
      }
    } catch (error) {
      console.error('Error opening Prodigi editor:', error);
      alert('There was an error opening the product editor. Please try again or refresh the page.');
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
      
      {/* For development purposes - show status of SDK loading */}
      <div style={{ marginTop: '30px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '4px', fontSize: '12px' }}>
        <p>SDK Status: {sdkLoaded ? 'Loaded' : 'Not loaded'}</p>
        <p>Selected Product: {selectedProduct ? selectedProduct.name : 'None'}</p>
        <p>Image URL Available: {imageUrl ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
}

export default ProductSelect;