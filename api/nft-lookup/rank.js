import { pool } from '../config/database.js';

// Collection configurations (only collections with rarity)
const COLLECTIONS = {
  'cat': {
    name: 'Fcked Cat',
    symbol: 'FCKEDCATZ',
    hasRarity: true,
    logo: '/logos/cat.PNG',
    color: 0xFFF44D // Yellow
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
  }
};

export default async function handler(req, res) {
  console.log('Rank lookup request:', {
    method: req.method,
    body: req.body,
    headers: req.headers,
    url: req.url
  });

  if (req.method !== 'POST') {
    return res.status(405).json({
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: 'Only POST requests are allowed',
          color: 0xFF0000
        }]
      }
    });
  }

  const { collection, symbol, rank } = req.body;
  console.log('Request parameters:', { 
    collection, 
    symbol, 
    rank, 
    typeRank: typeof rank,
    typeCollection: typeof collection,
    typeSymbol: typeof symbol
  });

  if (!collection || !symbol || rank === undefined) {
    return res.status(400).json({
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: 'Collection, symbol, and rank are required',
          color: 0xFF0000
        }]
      }
    });
  }

  const collectionConfig = COLLECTIONS[collection];
  if (!collectionConfig) {
    return res.status(400).json({
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: `Collection "${collection}" not found. Available collections: ${Object.keys(COLLECTIONS).join(', ')}`,
          color: 0xFF0000
        }]
      }
    });
  }

  if (!collectionConfig.hasRarity) {
    return res.status(400).json({
      type: 4,
      data: {
        embeds: [{
          title: 'Error',
          description: `Collection "${collectionConfig.name}" does not support rarity ranking`,
          color: 0xFF0000
        }]
      }
    });
  }

  let client;
  try {
    client = await pool.connect();
    console.log('Looking up NFT by rank:', { collection, symbol, rank });

    // Get the NFT details directly - remove the count query
    const result = await client.query(
      `SELECT n.*, 
              ur.discord_id as lister_discord_id,
              ur.discord_name as lister_discord_name,
              ur2.discord_id as owner_discord_id,
              ur2.discord_name as owner_name
       FROM nft_metadata n
       LEFT JOIN user_roles ur ON ur.wallet_address = n.original_lister
       LEFT JOIN user_roles ur2 ON ur2.wallet_address = n.owner_wallet
       WHERE n.symbol = $1 
       AND n.rarity_rank = $2 
       LIMIT 1`,
      [symbol, rank]
    );

    console.log('Query result:', {
      found: result.rows.length > 0,
      firstRow: result.rows[0] ? {
        name: result.rows[0].name,
        owner: result.rows[0].owner_wallet,
        original_lister: result.rows[0].original_lister,
        is_listed: result.rows[0].is_listed,
        mint: result.rows[0].mint_address,
        rank: result.rows[0].rarity_rank
      } : null
    });

    if (!result || result.rows.length === 0) {
      console.log('NFT not found:', { collection, rank });
      return res.status(200).json({
        type: 4,
        data: {
          tts: false,
          content: "",
          embeds: [{
            title: 'Error',
            description: `No NFT found with rank #${rank} in ${collectionConfig.name}`,
            color: 0xFF0000
          }],
          allowed_mentions: { parse: [] }
        }
      });
    }

    const nft = result.rows[0];

    // Build fields array based on available data
    const fields = [];

    // Owner field - cascade through available options
    fields.push({
      name: '👤 Owner',
      value: nft.lister_discord_name 
        ? nft.lister_discord_name
        : nft.original_lister
        ? `\`${nft.original_lister.slice(0, 4)}...${nft.original_lister.slice(-4)}\``
        : nft.owner_name
        ? nft.owner_name
        : `\`${nft.owner_wallet.slice(0, 4)}...${nft.owner_wallet.slice(-4)}\``,
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

    // Always show rarity rank since these collections have it
    fields.push({
      name: '✨ Rarity Rank',
      value: `#${nft.rarity_rank}`,
      inline: true
    });

    const response = {
      type: 4,
      data: {
        tts: false,
        content: "",
        embeds: [{
          title: nft.name,
          description: `[View on Magic Eden](https://magiceden.io/item-details/${nft.mint_address}) • [View on Tensor](https://www.tensor.trade/item/${nft.mint_address})\n\nMint: \`${nft.mint_address || 'Unknown'}\``,
          color: collectionConfig.color,
          fields: fields,
          thumbnail: {
            url: `https://buxdao.com${collectionConfig.logo}`
          },
          image: nft.image_url ? {
            url: nft.image_url.startsWith('http') ? nft.image_url : `https://buxdao.com${nft.image_url}`
          } : null,
          footer: {
            text: "BUXDAO • Putting Community First"
          }
        }],
        allowed_mentions: { parse: [] }
      }
    };

    console.log('Sending response:', JSON.stringify(response));
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error looking up NFT by rank:', error);
    return res.status(500).json({
      type: 4,
      data: {
        embeds: [{
          title: 'Database Error',
          description: error.message,
          color: 0xFF0000
        }]
      }
    });
  } finally {
    if (client) {
      await client.release();
    }
  }
} 