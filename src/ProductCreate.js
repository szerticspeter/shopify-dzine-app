import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function ProductCreate() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  // The product URL from Gelato Personalization Studio
  const GELATO_PRODUCT_URL = "https://ajucd9rvospe0pmm-89634177372.shopifypreview.com/products_preview?preview_key=5eb868d12eb48245bc1526c5761e64e4";

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

  // Automatically redirect to Gelato when image URL is available
  useEffect(() => {
    if (imageUrl) {
      // Construct the Gelato URL with the image as a query parameter
      const gelatoUrl = `${GELATO_PRODUCT_URL}?image=${encodeURIComponent(imageUrl)}`;
      
      // Redirect to Gelato
      window.location.href = gelatoUrl;
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

  // Show loading state while processing
  return (
    <div className="loading-container">
      <h2>Preparing Your Canvas Product...</h2>
      <p>Please wait while we redirect you to the Gelato Personalization Studio.</p>
      
      {/* Hidden form with the image URL that will be submitted to Gelato */}
      {imageUrl && (
        <form id="gelatoForm" style={{ display: 'none' }} action={GELATO_PRODUCT_URL} method="get">
          <input type="hidden" name="properties[Personalized Image]" value={imageUrl} />
        </form>
      )}
    </div>
  );
}

export default ProductCreate;