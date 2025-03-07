import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function ProductCreate() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // The actual published product URL in your Shopify store
  const SHOPIFY_PRODUCT_URL = "https://g2pgc1-08.myshopify.com/products/test-product-for-in-storepage-personalization";
  
  // Set to true to verify the flow and image URL without redirecting
  const TEST_MODE = true;

  useEffect(() => {
    try {
      // Get image URL from the query parameters
      const params = new URLSearchParams(location.search);
      const image = params.get('image');
      
      if (!image) {
        throw new Error('No image URL provided');
      }

      console.log('Received stylized image URL:', image);
      setImageUrl(image);
      setLoading(false);
    } catch (err) {
      console.error('Error processing image URL:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [location.search]);

  // Handle the image URL when available
  useEffect(() => {
    if (imageUrl) {
      if (TEST_MODE) {
        // In test mode, we'll just stay on this page and show the image
        console.log("Test mode active: Not redirecting to Shopify product page");
        setLoading(false);
      } else {
        // Construct the Shopify product URL with the image as a query parameter for in-store personalization
        const shopifyProductUrl = `${SHOPIFY_PRODUCT_URL}?image=${encodeURIComponent(imageUrl)}`;
        
        // Redirect to Shopify product page
        window.location.href = shopifyProductUrl;
      }
    }
  }, [imageUrl]);

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

  // Show test mode or loading state
  if (TEST_MODE && imageUrl) {
    return (
      <div className="success-container">
        <h2>Your Image is Ready for Personalization</h2>
        <p>Here's the stylized image that would be sent to the Gelato product page:</p>
        
        <div className="image-preview" style={{ margin: '20px 0' }}>
          <img 
            src={imageUrl} 
            alt="Stylized result" 
            style={{ maxWidth: '100%', maxHeight: '400px' }} 
          />
        </div>
        
        <p>The image URL has been copied below:</p>
        <textarea 
          readOnly 
          value={imageUrl}
          style={{ width: '100%', padding: '10px', marginBottom: '20px' }}
          rows={3}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <a 
            href={`${SHOPIFY_PRODUCT_URL}?image=${encodeURIComponent(imageUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="checkout-button"
            style={{ 
              backgroundColor: '#4CAF50', 
              color: 'white', 
              padding: '10px 20px',
              textDecoration: 'none',
              borderRadius: '4px'
            }}
          >
            Open in Shopify (New Tab)
          </a>
          
          <button 
            onClick={() => navigate('/')} 
            className="back-button"
            style={{ 
              backgroundColor: '#f1f1f1', 
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create Another Image
          </button>
        </div>
      </div>
    );
  }
  
  // Default loading state
  return (
    <div className="loading-container">
      <h2>Preparing Your Canvas Product...</h2>
      <p>Please wait while we redirect you to the customization page.</p>
      
      {/* Hidden form with the image URL that will be submitted to Shopify */}
      {imageUrl && (
        <form id="shopifyForm" style={{ display: 'none' }} action={SHOPIFY_PRODUCT_URL} method="get">
          <input type="hidden" name="image" value={imageUrl} />
        </form>
      )}
    </div>
  );
}

export default ProductCreate;