// Version 1.0.4 - Updated command handling
import { pool } from '../../../config/database.js';

// Collection configurations
export const COLLECTIONS = {
  'cat': {
    name: 'Fcked Cat',
    symbol: 'FCKEDCATZ',
    hasRarity: true,
    logo: '/logos/cat.PNG',
    color: 0xFFF44D // Yellow
  },
  'celeb': {
    name: 'Celebrity Catz',
    symbol: 'CelebCatz',
    hasRarity: false,
    logo: '/logos/celeb.PNG',
    color: 0xFF4D4D // Red
  },
  'mm': {
    name: 'Money Monsters',
    symbol: 'MM',
    hasRarity: true,
    logo: '/logos/monster.PNG',
    color: 0x4DFFFF // Cyan
  },
  'mm3d': {
    name: 'Money Monsters 3D',
    symbol: 'MM3D',
    hasRarity: true,
    logo: '/logos/monster.PNG',
    color: 0x4DFF4D // Green
  },
  'bot': {
    name: 'AI Bitbot',
    symbol: 'AIBB',
    hasRarity: false,
    logo: '/logos/bot.PNG',
    color: 0xFF4DFF // Pink
  }
};

async function getNFTDetails(collection, tokenId) {
  console.log('getNFTDetails called with:', { collection, tokenId, type: typeof tokenId });
  
  const collectionConfig = COLLECTIONS[collection];
  console.log('Collection config:', collectionConfig);

  if (!collectionConfig) {
    console.error('Invalid collection:', collection);
    throw new Error(`Invalid collection "${collection}". Available collections: ${Object.keys(COLLECTIONS).join(', ')}`);
  }

  if (!tokenId || isNaN(tokenId)) {
    console.error('Invalid token ID:', { tokenId, type: typeof tokenId });
    throw new Error(`Invalid token ID "${tokenId}". Please provide a valid number.`);
  }

  let client;
  try {
    console.log('Attempting database connection...');
    client = await pool.connect();
    console.log('Database connection successful');

    const query = `
      SELECT 
        name,
        symbol,
        mint_address,
        owner_wallet,
        owner_discord_id,
        owner_name,
        is_listed,
        list_price,
        last_sale_price,
        rarity_rank,
        image_url
      FROM nft_metadata
      WHERE symbol = $1 AND name = $2
      LIMIT 1
    `;
    const values = [collectionConfig.symbol, `${collectionConfig.name} #${tokenId}`];
    
    console.log('Executing query:', { query, values });
    const result = await client.query(query, values);
    console.log('Query result:', { 
      rowCount: result?.rows?.length,
      firstRow: result?.rows?.[0] ? {
        name: result.rows[0].name,
        symbol: result.rows[0].symbol,
        image_url: result.rows[0].image_url
      } : null
    });

    if (!result || result.rows.length === 0) {
      console.log('NFT not found:', { collection, tokenId });
      throw new Error(`NFT not found: ${collectionConfig.name} #${tokenId}`);
    }

    const nft = result.rows[0];
    console.log('Found NFT data:', {
      name: nft.name,
      owner: nft.owner_discord_id || nft.owner_wallet,
      listed: nft.is_listed,
      price: nft.list_price,
      image_url: nft.image_url
    });

    // Build fields array based on available data
    const fields = [];

    // Owner field - prefer Discord name if available
    fields.push({
      name: '👤 Owner',
      value: nft.owner_name 
        ? `<@${nft.owner_discord_id}>`
        : nft.owner_wallet
          ? `\`${nft.owner_wallet.slice(0, 4)}...${nft.owner_wallet.slice(-4)}\``
          : 'Unknown',
      inline: true
    });

    // Status field - show if listed and price
    fields.push({
      name: '🏷️ Status',
      value: nft.is_listed 
        ? `Listed for ${(Number(nft.list_price) || 0).toFixed(2)} SOL`
        : 'Not Listed',
      inline: true
    });

    // Last sale if available
    if (nft.last_sale_price) {
      fields.push({
        name: '💰 Last Sale',
        value: `${Number(nft.last_sale_price).toFixed(2)} SOL`,
        inline: true
      });
    }

    // Rarity rank if collection supports it
    if (collectionConfig.hasRarity && nft.rarity_rank) {
      fields.push({
        name: '✨ Rarity Rank',
        value: `#${nft.rarity_rank}`,
        inline: true
      });
    }

    return {
      type: 4,
      data: {
        embeds: [{
          title: nft.name,
          description: `[View on Magic Eden](https://magiceden.io/item-details/${nft.mint_address}) • [View on Tensor](https://www.tensor.trade/item/${nft.mint_address})\n\n**Mint:** \`${nft.mint_address}\``,
          color: collectionConfig.color,
          fields: fields,
          thumbnail: {
            url: `https://buxdao.com${collectionConfig.logo}`
          },
          image: {
            url: nft.image_url
          },
          footer: {
            text: "BUXDAO • Putting Community First"
          }
        }]
      }
    };
  } catch (error) {
    console.error('Error in getNFTDetails:', error);
    if (error.code === '57014') {
      throw new Error('The request took too long to process. Please try again.');
    }
    throw error;
  } finally {
    if (client) {
      try {
        await client.release();
        console.log('Database client released');
      } catch (releaseError) {
        console.error('Error releasing client:', releaseError);
      }
    }
  }
}

export async function handleNFTLookup(command) {
  if (!command || typeof command !== 'string') {
    throw new Error('Invalid command format. Expected string in format: collection.tokenId');
  }

  const [collection, tokenIdStr] = command.split('.');

  if (!collection) {
    throw new Error('Missing collection. Available collections: ' + Object.keys(COLLECTIONS).join(', '));
  }

  if (!tokenIdStr) {
    throw new Error('Missing token ID. Format: collection.tokenId');
  }

  const tokenId = parseInt(tokenIdStr);

  if (isNaN(tokenId)) {
    throw new Error(`Invalid token ID "${tokenIdStr}". Please provide a valid number.`);
  }

  // Get NFT details - already formatted for Discord
  return getNFTDetails(collection, tokenId);
} 