import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function ProductCreate() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

        // Call the Netlify function to create a Shopify product
        const response = await fetch('/.netlify/functions/shopifyAuth', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create product');
        }

        const data = await response.json();
        console.log('Product created:', data);
        
        // Redirect to the Shopify checkout URL
        window.location.href = data.checkoutUrl;
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

  // Show loading state while processing
  return (
    <div className="loading-container">
      <h2>Creating Your Canvas Product...</h2>
      <p>Please wait while we prepare your custom canvas.</p>
    </div>
  );
}

export default ProductCreate;