import express from 'express';
import cors from 'cors';
import axios from 'axios';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3001',
    'https://buxdao-3-0.vercel.app',
    'https://buxdao.com',
    'https://www.buxdao.com'
  ],
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

// Database setup
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Stats endpoint
app.get('/api/collections/:symbol/stats', async (req, res) => {
  const { symbol } = req.params;
  
  try {
    const response = await axios.get(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`);
    res.json(response.data);
  } catch (error) {
    console.error(`Error fetching stats for ${symbol}:`, error.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Add celebcatz images endpoint with optimized query
app.get('/api/celebcatz/images', async (req, res) => {
  console.log('Endpoint hit: /api/celebcatz/images');
  
  // Set a timeout for the request
  req.setTimeout(30000);
  res.setTimeout(30000);
  
  try {
    const query = {
      text: `
        SELECT image_url, name 
        FROM nft_metadata 
        WHERE symbol = $1 
        AND name LIKE $2 
        AND CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER) <= $3
        ORDER BY CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER)
      `,
      values: ['CelebCatz', 'Celebrity Catz #%', 79],
      // Set a query timeout
      query_timeout: 25000
    };
    
    console.log('Executing query...');
    const result = await pool.query(query);
    console.log(`Query completed. Found ${result.rows.length} images`);
    
    if (result.rows.length === 0) {
      console.log('No images found');
      return res.json([]);
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Database query failed:', error);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.message) {
      console.error('Error message:', error.message);
    }
    res.status(500).json({ 
      error: 'Failed to fetch images', 
      details: error.message,
      code: error.code 
    });
  }
});

// Add Printful products endpoint
app.get('/api/printful/products', async (req, res) => {
  try {
    const response = await fetch('https://api.printful.com/store/products', {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Printful API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      throw new Error('Invalid response format from Printful API');
    }

    const products = data.result.map(item => ({
      id: item.id,
      name: item.name,
      thumbnail_url: item.thumbnail_url,
      variants: item.variants || 0,
      sync_product: item.sync_product,
      sync_variants: item.sync_variants
    }));

    res.json(products);
  } catch (error) {
    console.error('Error fetching from Printful:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add Printful product details endpoint
app.get('/api/printful/products/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const response = await fetch(`https://api.printful.com/store/products/${id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Printful API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      throw new Error('Invalid response format from Printful API');
    }

    res.json(data.result);
  } catch (error) {
    console.error('Error fetching product from Printful:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server when this file is run directly
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the Express app
export default app; 