import dotenv from 'dotenv';
// Load environment variables before anything else
dotenv.config();

import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();

// Basic middleware
app.use(express.json());

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'https://buxdao.com', 'https://www.buxdao.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'Origin']
}));

// Debug middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  console.log(`[API ${new Date().toISOString()}] ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  
  // Add response logging
  const oldSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    console.log(`[API ${new Date().toISOString()}] Response ${res.statusCode} sent in ${duration}ms`);
    return oldSend.apply(res, arguments);
  };
  
  // Set API-specific headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Printful API routes
const PRINTFUL_API_KEY = process.env.PRINTFUL_API_KEY;
const PRINTFUL_API_URL = 'https://api.printful.com';

app.get('/products', async (req, res) => {
  if (!PRINTFUL_API_KEY) {
    console.error('[Printful] API key not configured');
    return res.status(500).json({ error: 'Printful API key not configured' });
  }

  try {
    console.log('[Printful] Fetching products...');
    const response = await axios({
      method: 'get',
      url: `${PRINTFUL_API_URL}/store/products`,
      headers: {
        'Authorization': `Basic ${Buffer.from(PRINTFUL_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      validateStatus: (status) => status >= 200 && status < 300
    });

    if (!response.data || !response.data.result) {
      console.error('[Printful] Invalid response format:', response.data);
      return res.status(500).json({ error: 'Invalid response from Printful API' });
    }

    console.log('[Printful] Successfully fetched products');
    return res.json(response.data.result);
  } catch (error) {
    console.error('[Printful] API error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Failed to fetch products',
      details: error.response?.data || error.message
    });
  }
});

app.get('/products/:id', async (req, res) => {
  if (!PRINTFUL_API_KEY) {
    console.error('[Printful] API key not configured');
    return res.status(500).json({ error: 'Printful API key not configured' });
  }

  const productId = req.params.id;
  if (!productId) {
    return res.status(400).json({ error: 'Product ID is required' });
  }

  try {
    console.log(`[Printful] Fetching product details for ID: ${productId}`);
    const response = await axios({
      method: 'get',
      url: `${PRINTFUL_API_URL}/store/products/${productId}`,
      headers: {
        'Authorization': `Basic ${Buffer.from(PRINTFUL_API_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      validateStatus: (status) => status >= 200 && status < 300
    });

    if (!response.data || !response.data.result) {
      console.error('[Printful] Invalid response format:', response.data);
      return res.status(500).json({ error: 'Invalid response from Printful API' });
    }

    console.log('[Printful] Successfully fetched product details');
    return res.json(response.data.result);
  } catch (error) {
    console.error('[Printful] API error:', error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Failed to fetch product details',
      details: error.response?.data || error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[API] Error handler caught:', err);
  console.error('Stack trace:', err.stack);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code,
    path: req.path
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Start the API server
const API_PORT = process.env.API_PORT || 3002;
app.listen(API_PORT, 'localhost', () => {
  console.log(`API server is running on http://localhost:${API_PORT}`);
});

export default app; 