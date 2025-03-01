import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function ProductCreate() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productData, setProductData] = useState(null);
  const [checkoutUrl, setCheckoutUrl] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const createProduct = async () => {
      try {
        // Get image URL from the query parameters
        const params = new URLSearchParams(location.search);
        const imageUrl = params.get('image');
        
        if (!imageUrl) {
          throw new Error('No image URL provided');
        }

        console.log('Creating product with image URL:', imageUrl);

        // Call the Netlify function to create a Shopify product
        const response = await fetch('/.netlify/functions/shopifyAuth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create product');
        }

        console.log('Product created:', data);
        
        // Store the product data and checkout URL
        setProductData(data.product);
        setCheckoutUrl(data.checkoutUrl);
        setLoading(false);
      } catch (err) {
        console.error('Error creating product:', err);
        setError(err.message);
        setLoading(false);
      }
    };

    createProduct();
  }, [location.search]);

  // If there's an error, show it
  if (error) {
    return (
      <div className="error-container">
        <h2>Error Creating Product</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Back to Home</button>
      </div>
    );
  }

  // If product is created successfully, show checkout link
  if (productData && checkoutUrl) {
    return (
      <div className="success-container">
        <h2>Your Canvas Product is Ready!</h2>
        <p>Your custom canvas print has been created successfully.</p>
        
        <div className="product-details">
          <h3>Product Details:</h3>
          <p><strong>Title:</strong> {productData.product.title}</p>
          <p><strong>Price:</strong> ${productData.product.variants[0].price}</p>
        </div>
        
        {/* Open link in new tab to avoid cross-origin issues */}
        <a 
          href={checkoutUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="checkout-button"
        >
          Proceed to Checkout
        </a>
        
        <button onClick={() => navigate('/')} className="back-button">
          Create Another Canvas
        </button>
      </div>
    );
  }

  // Show loading state while processing
  return (
    <div className="loading-container">
      <h2>Creating Your Canvas Product...</h2>
      <p>Please wait while we prepare your custom canvas.</p>
    </div>
  );
}

export default ProductCreate;