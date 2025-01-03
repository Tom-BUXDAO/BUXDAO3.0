import pkg from 'pg';
const { Pool } = pkg;
import axios from 'axios';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Log request details
  console.log('Request URL:', req.url);
  console.log('Request method:', req.method);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Database URL exists:', !!process.env.POSTGRES_URL);

  if (req.method === 'GET') {
    // Handle collection stats endpoint
    if (req.url.startsWith('/api/collections/') && req.url.endsWith('/stats')) {
      const symbol = req.url.split('/')[3];
      try {
        console.log('Fetching stats for:', symbol);
        const response = await axios.get(`https://api-mainnet.magiceden.dev/v2/collections/${symbol}/stats`);
        console.log('Stats response:', response.data);
        return res.status(200).json(response.data);
      } catch (error) {
        console.error('Error fetching stats:', {
          symbol,
          error: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        return res.status(500).json({ 
          error: 'Failed to fetch stats',
          details: error.message,
          status: error.response?.status
        });
      }
    }
    
    // Handle celebcatz images endpoint
    if (req.url === '/api/celebcatz/images') {
      try {
        console.log('Fetching CelebCatz images...');
        const result = await pool.query(`
          SELECT image_url, name 
          FROM nft_metadata 
          WHERE symbol = 'CelebCatz'
          AND name LIKE 'Celebrity Catz #%'
          AND CAST(NULLIF(regexp_replace(name, '.*#', ''), '') AS INTEGER) <= 79
          ORDER BY name
        `);
        
        console.log('Found images:', result.rows.length);
        return res.status(200).json(result.rows);
      } catch (error) {
        console.error('Database error:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
        return res.status(500).json({ 
          error: 'Failed to fetch images', 
          details: error.message,
          code: error.code
        });
      }
    }
  }
  
  console.log('No matching route found');
  return res.status(404).json({ error: 'Not found' });
} 