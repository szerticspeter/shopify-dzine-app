/**
 * Shopify Image Injection Script
 * 
 * This script should be added to your Shopify theme's product-template.liquid file
 * Add it right before the closing </body> tag
 */

<script>
// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Check if we have an image URL in sessionStorage
  const imageUrl = sessionStorage.getItem('styleImageUrl');
  
  if (!imageUrl) {
    console.log('No image URL found in sessionStorage');
    return;
  }
  
  console.log('Found image URL in sessionStorage:', imageUrl);
  
  // Function to wait for an element to appear in the DOM
  function waitForElement(selector, callback, maxWaitTime = 10000) {
    const startTime = Date.now();
    
    function checkElement() {
      const element = document.querySelector(selector);
      
      if (element) {
        console.log('Found element:', selector);
        callback(element);
        return;
      }
      
      if (Date.now() - startTime > maxWaitTime) {
        console.error('Element not found after waiting:', selector);
        return;
      }
      
      setTimeout(checkElement, 100);
    }
    
    checkElement();
  }
  
  // Wait for the file upload button to appear
  waitForElement('.personalization-file-upload button, [data-testid="file-upload-button"], button[aria-label="Upload Image"], input[type="file"]', async function(uploadElement) {
    try {
      // Check if the element is a file input or a button
      const isInput = uploadElement.tagName.toLowerCase() === 'input';
      
      // If it's a button, click it to open the file dialog
      if (!isInput) {
        console.log('Found upload button, clicking it...');
        uploadElement.click();
        
        // Now wait for the file input to appear
        waitForElement('input[type="file"]', async function(fileInput) {
          await injectImageToFileInput(fileInput, imageUrl);
        });
      } else {
        // It's already a file input
        await injectImageToFileInput(uploadElement, imageUrl);
      }
    } catch (error) {
      console.error('Error injecting image:', error);
    }
  });
  
  // Function to fetch an image and inject it into a file input
  async function injectImageToFileInput(fileInput, imageUrl) {
    try {
      console.log('Fetching image from URL:', imageUrl);
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      console.log('Image fetched, creating File object');
      const fileName = 'stylized-image.jpg';
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      
      // Create a FileList-like object
      const fileList = {
        0: file,
        length: 1,
        item: (index) => index === 0 ? file : null
      };
      
      // Override the files property
      Object.defineProperty(fileInput, 'files', {
        value: fileList,
        writable: false
      });
      
      // Dispatch change event
      const event = new Event('change', { bubbles: true });
      fileInput.dispatchEvent(event);
      
      console.log('Successfully injected image into file input');
      
      // Clear the sessionStorage to prevent reuse on page refresh
      sessionStorage.removeItem('styleImageUrl');
    } catch (error) {
      console.error('Error in image injection:', error);
      alert('Could not automatically upload the image. Please download and upload it manually.');
    }
  }
});
</script>