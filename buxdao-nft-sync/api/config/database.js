import pg from 'pg';
const { Pool } = pg;

// In production, environment variables are set through the platform
// In development, we load from .env file
if (process.env.NODE_ENV !== 'production') {
  const { fileURLToPath } = await import('url');
  const { dirname, resolve } = await import('path');
  const { default: dotenv } = await import('dotenv');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  
  // Load .env file in development only
  dotenv.config({ path: resolve(__dirname, '../../.env') });
}

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is required');
}

// Parse the connection string
const connectionString = process.env.POSTGRES_URL;

console.log('Initializing database connection pool...', {
  environment: process.env.NODE_ENV,
  hasConnectionString: !!connectionString,
  ssl: process.env.NODE_ENV === 'production'
});

// Create the pool with improved configuration
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Maximum number of clients in the pool
  min: 4,  // Minimum number of idle clients to maintain
  idleTimeoutMillis: 60000, // Close idle clients after 1 minute
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  maxUses: 7500, // Number of times a client can be used before being destroyed
  keepAlive: true, // Keep connections alive
  keepAliveInitialDelayMillis: 10000, // Delay before starting keep-alive probes
  statement_timeout: 30000, // 30 seconds
  idle_in_transaction_session_timeout: 30000, // 30 seconds
  query_timeout: 30000 // 30 seconds
});

// Add pool error handler with reconnection logic
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  if (err.code === '25P03') { // idle-in-transaction timeout
    try {
      client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error rolling back timed out transaction:', rollbackError);
    }
  }
});

// Add pool connect handler with logging
pool.on('connect', client => {
  console.log('New client connected to pool');
  
  // Set session configuration
  client.query(`
    SET statement_timeout = 30000;
    SET idle_in_transaction_session_timeout = 30000;
    SET lock_timeout = 10000;
    SET tcp_keepalives_idle = 60;
    SET tcp_keepalives_interval = 10;
    SET tcp_keepalives_count = 3;
  `).catch(err => {
    console.error('Error configuring client session:', err);
  });
});

// Add pool acquire handler
pool.on('acquire', client => {
  console.log('Client acquired from pool');
});

// Add pool remove handler with reconnection attempt
pool.on('remove', client => {
  console.log('Client removed from pool, checking pool health...');
  
  // Check pool health and log status
  pool.query('SELECT 1')
    .then(() => {
      console.log('Pool health check successful');
    })
    .catch(async err => {
      console.error('Pool health check failed:', err);
      
      // Try to add a new client to the pool
      try {
        const client = await pool.connect();
        console.log('Successfully added new client to pool');
        client.release();
      } catch (error) {
        console.error('Failed to add new client to pool:', error);
      }
    });
});

// Configure a single client for serverless environment
let client = null;
let connecting = null;

async function getClient() {
  // Return existing client if it's already connected
  if (client?.connection?.stream?.readable) {
    console.log('Reusing existing database connection');
    return client;
  }

  // Wait for existing connection attempt if one is in progress
  if (connecting) {
    console.log('Waiting for existing connection attempt...');
    return connecting;
  }

  console.log('Initiating new database connection...');

  // Create new connection with retries
  connecting = new Promise(async (resolve, reject) => {
    let attempts = 3;
    let delay = 1000;

    while (attempts > 0) {
      try {
        client = await pool.connect();
        console.log('Successfully connected to database');
        
        // Configure client session
        await client.query(`
          SET statement_timeout = 10000;
          SET idle_in_transaction_session_timeout = 10000;
          SET tcp_keepalives_idle = 60;
          SET tcp_keepalives_interval = 10;
          SET tcp_keepalives_count = 3;
        `);
        
        // Handle connection errors
        client.on('error', err => {
          console.error('Client error:', err);
          client = null;
        });

        // Test the connection
        const result = await client.query('SELECT NOW()');
        console.log('Database connection test successful:', result.rows[0]);

        resolve(client);
        break;
      } catch (error) {
        attempts--;
        console.error('Database connection attempt failed:', {
          message: error.message,
          code: error.code,
          attemptsLeft: attempts,
          delay
        });
        
        if (attempts === 0) {
          client = null;
          reject(error);
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  }).finally(() => {
    connecting = null;
  });

  return connecting;
}

// Export both pool and getClient
export { pool, getClient };
