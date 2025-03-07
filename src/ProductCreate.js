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
  
  // Always show download option since direct injection isn't possible
  const TEST_MODE = true;
  
  // Test image URL for debugging (Unsplash image)
  const TEST_IMAGE_URL = "https://plus.unsplash.com/premium_photo-1664474619075-644dd191935f?q=80&w=1469&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

  useEffect(() => {
    try {
      // Get image URL or Base64 data from the query parameters
      const params = new URLSearchParams(location.search);
      const image = params.get('image');
      
      if (!image) {
        throw new Error('No image data provided');
      }

      // Check if it's a Base64 data URL
      if (image.startsWith('data:image/')) {
        console.log('Received Base64 image data');
      } else {
        console.log('Received image URL:', image);
      }
      
      setImageUrl(image);
      setLoading(false);
    } catch (err) {
      console.error('Error processing image data:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [location.search]);

  // Create the image injection script
  const createImageInjectionScript = (imageUrl) => {
    // This script will run on the Shopify product page
    const injectionScript = `
      // Wait for the page to fully load
      window.addEventListener('load', async function() {
        try {
          console.log('Image injection script running...');
          
          // Function to wait for an element to appear in the DOM
          function waitForElement(selector, timeout = 10000) {
            return new Promise((resolve, reject) => {
              const startTime = Date.now();
              
              const checkElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                  resolve(element);
                  return;
                }
                
                if (Date.now() - startTime > timeout) {
                  reject(new Error(\`Element \${selector} not found after \${timeout}ms\`));
                  return;
                }
                
                setTimeout(checkElement, 100);
              };
              
              checkElement();
            });
          }
          
          // Wait for the file upload button to appear
          const uploadButton = await waitForElement('.personalization-file-upload button, [data-testid="file-upload-button"], button[aria-label="Upload Image"]');
          console.log('Found upload button:', uploadButton);
          
          // Fetch the image from the URL
          const response = await fetch('${imageUrl}');
          const blob = await response.blob();
          
          // Create a File object from the Blob
          const fileName = 'stylized-image.jpg';
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          
          // Create a FileList-like object
          const fileList = {
            0: file,
            length: 1,
            item: (index) => index === 0 ? file : null
          };
          
          // Find the file input element
          const fileInput = document.querySelector('input[type="file"]');
          
          if (fileInput) {
            // Override the files property
            Object.defineProperty(fileInput, 'files', {
              value: fileList,
              writable: false
            });
            
            // Dispatch change event
            const event = new Event('change', { bubbles: true });
            fileInput.dispatchEvent(event);
            console.log('Successfully injected image into file input');
          } else {
            // If we can't find the file input, click the upload button to open the file dialog
            console.log('File input not found. Clicking upload button instead...');
            uploadButton.click();
            
            // Alert the user with instructions as a fallback
            setTimeout(() => {
              alert('Please select the stylized image from your download folder');
            }, 1000);
          }
        } catch (error) {
          console.error('Error in image injection script:', error);
          alert('Could not automatically upload the image. Please download and upload it manually.');
        }
      });
    `;
    
    return injectionScript;
  };

  // Handle the image URL when available
  useEffect(() => {
    if (imageUrl) {
      if (TEST_MODE) {
        // In test mode, we'll just stay on this page and show the image
        console.log("Test mode active: Not redirecting to Shopify product page");
        setLoading(false);
      } else {
        // Create the image injection script
        const injectionScript = createImageInjectionScript(imageUrl);
        
        // Construct the Shopify product URL
        const shopifyProductUrl = `${SHOPIFY_PRODUCT_URL}`;
        
        // After testing, we found that Shopify's customizer requires a manual file upload
        // Let's download the image automatically, then redirect to Shopify
        
        // Create a self-executing async function to use await
        (async () => {
          try {
            // Fetch the image data
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            
            // Create a download link
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'stylized-image.jpg';
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Clean up
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
            
            // Alert the user about next steps and redirect
            alert('Image downloaded! Now you will be redirected to the product page. Click "Replace image", select "My device", and choose the downloaded image.');
            
            // Redirect to Shopify
            window.location.href = SHOPIFY_PRODUCT_URL;
          } catch (error) {
            console.error('Error preparing image for Shopify:', error);
            alert('Error downloading the image. You will be redirected to the product page, but you might need to return and download the image manually.');
            
            // Still redirect to Shopify even if the download fails
            window.location.href = SHOPIFY_PRODUCT_URL;
          }
        })();
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
        <p>Here's the stylized image that would be sent to the Shopify product page:</p>
        
        <div className="image-preview" style={{ margin: '20px 0' }}>
          <img 
            src={imageUrl} 
            alt="Stylized result" 
            style={{ maxWidth: '100%', maxHeight: '400px' }} 
          />
        </div>
        
        <h3>Testing Options</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={() => {
              console.log("Testing with Unsplash image URL");
              
              // Store the test image URL in sessionStorage
              sessionStorage.setItem('styleImageUrl', TEST_IMAGE_URL);
              
              // Open the Shopify product page in a new tab
              window.open(SHOPIFY_PRODUCT_URL, '_blank');
            }}
            style={{
              backgroundColor: '#9C27B0',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              marginBottom: '20px',
              cursor: 'pointer'
            }}
          >
            Test With Unsplash Image
          </button>
        </div>
        
        <p>The image URL/data has been copied below:</p>
        <textarea 
          readOnly 
          value={imageUrl}
          style={{ width: '100%', padding: '10px', marginBottom: '20px' }}
          rows={3}
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
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
          
          {/* Download Image Button with improved handling for both Base64 and URLs */}
          <button 
            onClick={() => {
              // Using an async IIFE (Immediately Invoked Function Expression)
              (async () => {
                try {
                  // For both URLs and Base64 data, fetch and download
                  const response = await fetch(imageUrl);
                  const blob = await response.blob();
                  
                  // Create download link
                  const downloadUrl = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = downloadUrl;
                  a.download = 'stylized-image.jpg';
                  
                  // Trigger download
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  
                  // Clean up
                  setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
                  
                  alert('Image downloaded successfully! Now open the Shopify product page, click "Replace image", select "My device", and choose the downloaded image.');
                } catch (error) {
                  console.error('Error downloading image:', error);
                  alert('Error downloading image. Please try a different image or method.');
                }
              })();
            }}
            className="download-button"
            style={{ 
              backgroundColor: '#2196F3', 
              color: 'white', 
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Download Image
          </button>
          
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