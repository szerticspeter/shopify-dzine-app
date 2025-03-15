import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function ProductSelect() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Define product types
  const productTypes = [
    { id: 'canvas', name: 'Canvas Print', prodigiSku: 'GLOBAL-CFP-30x40CM' },
    { id: 'mug', name: 'Coffee Mug', prodigiSku: 'GLOBAL-MUG-11OZ' },
    { id: 'tshirt', name: 'T-Shirt', prodigiSku: 'GLOBAL-TSHIRT-L' }
  ];
  
  // For image uploads via Prodigi WebSDK
  const PRODIGI_CLIENT_KEY = "demo"; // Replace with your Prodigi client key
  
  // Test image URL for debugging (Unsplash image)
  const TEST_IMAGE_URL = "https://plus.unsplash.com/premium_photo-1664474619075-644dd191935f?q=80&w=1469&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

  useEffect(() => {
    try {
      // Get image from sessionStorage instead of URL parameter
      const image = sessionStorage.getItem('stylizedImage');
      
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
      
      const script = document.createElement('script');
      script.src = 'https://sdk.prodigi.com/web-to-print/v5/prodigi-web-to-print-sdk.umd.min.js';
      script.async = false; // Load synchronously to ensure it's available
      script.id = 'prodigi-sdk-script';
      script.onload = () => {
        console.log('Prodigi WebSDK loaded successfully');
        // Verify that the global object is available
        if (window.ProdigiWebToPreviewAndPrint) {
          console.log('ProdigiWebToPreviewAndPrint global object is available');
        } else {
          console.warn('ProdigiWebToPreviewAndPrint global object not found after loading script');
        }
      };
      script.onerror = (error) => {
        console.error('Error loading Prodigi WebSDK:', error);
      };
      document.head.appendChild(script);
    };
    
    loadProdigiSDK();
  }, [location.search]);

  const handleProductSelect = (productType) => {
    setSelectedProduct(productType);
  };
  
  const openProdigiEditor = () => {
    if (!selectedProduct || !imageUrl) {
      alert('Please select a product and ensure image is loaded');
      return;
    }
    
    // Check if Prodigi SDK is loaded, using the correct global object name
    if (window.ProdigiWebToPreviewAndPrint) {
      console.log("Found ProdigiWebToPreviewAndPrint, initializing SDK");
      
      // Initialize the Prodigi WebSDK with your client key
      const sdk = window.ProdigiWebToPreviewAndPrint.initialize({
        clientKey: PRODIGI_CLIENT_KEY
      });
      
      // Launch the editor with the selected product and image
      sdk.openProductBuilder({
        sku: selectedProduct.prodigiSku,
        images: [
          {
            url: imageUrl,
            thumbnailUrl: imageUrl
          }
        ],
        callbackUrl: window.location.origin, // Optional: URL to return to after order completion
        onComplete: (result) => {
          console.log('Order completed', result);
          // Handle order completion (e.g., show success message)
          alert('Order completed successfully!');
        },
        onCancel: () => {
          console.log('Order cancelled');
          // Handle cancellation
          alert('Order was cancelled.');
        }
      });
    } else {
      console.error("Prodigi SDK not found in window object. Available globals:", Object.keys(window).filter(key => key.includes('Prodigi')));
      
      // Try to load the SDK again
      const script = document.createElement('script');
      script.src = 'https://sdk.prodigi.com/web-to-print/v5/prodigi-web-to-print-sdk.umd.min.js';
      script.async = true;
      script.onload = () => {
        console.log('Prodigi WebSDK loaded dynamically, attempting to initialize now');
        if (window.ProdigiWebToPreviewAndPrint) {
          const sdk = window.ProdigiWebToPreviewAndPrint.initialize({
            clientKey: PRODIGI_CLIENT_KEY
          });
          
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
        } else {
          alert('Failed to load Prodigi WebSDK. Please refresh the page and try again.');
        }
      };
      document.body.appendChild(script);
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
          onClick={openProdigiEditor}
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
    </div>
  );
}

export default ProductSelect;