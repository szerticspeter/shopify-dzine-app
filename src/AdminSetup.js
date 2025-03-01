import React, { useState } from 'react';
import './App.css';

function AdminSetup() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const createWebhook = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    
    try {
      const response = await fetch('/.netlify/functions/createWebhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create webhook');
      }
      
      setResult(data);
    } catch (err) {
      console.error('Error creating webhook:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Dzine.ai Canvas Creator - Admin Setup</h1>
      </header>
      
      <main>
        <div className="admin-section">
          <h2>Shopify Integration Setup</h2>
          <p>
            This page allows you to set up the necessary Shopify webhooks for
            order processing with Gelato. Before proceeding, ensure you have:
          </p>
          <ul className="setup-list">
            <li>Added your Shopify API credentials to Netlify environment variables</li>
            <li>Added your Gelato API key to Netlify environment variables</li>
          </ul>
          
          <button 
            onClick={createWebhook}
            className="setup-button"
            disabled={loading}
          >
            {loading ? 'Creating Webhook...' : 'Create Shopify Order Webhook'}
          </button>
          
          {error && (
            <div className="error-message">
              <h3>Error!</h3>
              <p>{error}</p>
            </div>
          )}
          
          {result && (
            <div className="success-message">
              <h3>Webhook Created Successfully!</h3>
              <p>The Shopify webhook has been registered to process orders with Gelato.</p>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminSetup;