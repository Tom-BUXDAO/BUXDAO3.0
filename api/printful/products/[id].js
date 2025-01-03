export const config = {
  runtime: 'edge'
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400'
      }
    });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Extract id from URL path
  const url = new URL(req.url);
  const paths = url.pathname.split('/');
  const id = paths[paths.length - 1];

  try {
    console.log(`Fetching Printful product details for ID: ${id}`);
    
    if (!process.env.PRINTFUL_API_KEY) {
      throw new Error('PRINTFUL_API_KEY is not set');
    }

    const response = await fetch(`https://api.printful.com/store/products/${id}`, {
      headers: {
        'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Printful API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`Printful API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.result) {
      console.error('Invalid response format from Printful API:', data);
      throw new Error('Invalid response format from Printful API');
    }

    return new Response(JSON.stringify(data.result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=60'
      }
    });
  } catch (error) {
    console.error(`Error fetching product ${id} from Printful:`, error);
    return new Response(JSON.stringify({ 
      error: error.message,
      id: id,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
} 