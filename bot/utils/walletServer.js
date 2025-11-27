import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

import { getDatabase } from './database.js';
import { logger } from './logger.js';

// Module-level variable to hold the bot client instance
let botClient = null;

// Lazy initialization of database client to avoid top-level errors
let dbClient = null;
function getDbClient() {
  if (!dbClient) {
    dbClient = getDatabase();
  }
  return dbClient;
}

const app = express();
const PORT = env.WALLET_SERVER_PORT || 3001;
const CLIENT_URL = env.CLIENT_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.static('public'));

// Note: Data is now stored in Supabase database instead of in-memory Maps

// HELPER: Handles the core connection logic
async function handleWalletConnection(token, discordUserId, walletAddress) {
  // 1. Validate Input
  if (!token || !discordUserId || !walletAddress) {
    throw { status: 400, message: 'Missing required parameters' };
  }

  // NEW: specific validation for EVM addresses (starts with 0x, 42 chars)
  const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!evmAddressRegex.test(walletAddress)) {
    throw { status: 400, message: 'Invalid wallet address format' };
  }

  // 2. Verify Token
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (jwtError) {
    throw { status: 401, message: jwtError };
  }

  const { tradeId, userType } = decoded;

  // 3. Fetch Trade
  const { data: tradeData, error: tradeError } = await getDbClient()
    .from('trades')
    .select('*')
    .eq('trade_id', tradeId)
    .single();

  if (tradeError || !tradeData) {
    throw { status: 404, message: 'Trade not found' };
  }

  // 4. Authorize User
  const expectedUserId =
    userType === 'buyer' ? tradeData.buyer_id : tradeData.seller_id;
  if (discordUserId !== expectedUserId) {
    throw { status: 403, message: 'Unauthorized: User ID mismatch' };
  }

  // 5. Prevent same wallet for both buyer and seller
  const { data: existingConnections } = await getDbClient()
    .from('wallet_connections')
    .select('wallet_address')
    .eq('trade_id', tradeId)
    .neq('discord_user_id', discordUserId); // other user(s) in this trade

  if (
    existingConnections?.some(
      (c) => c.wallet_address?.toLowerCase() === walletAddress.toLowerCase(),
    )
  ) {
    throw {
      status: 409,
      message:
        'This wallet address is already connected to the other party in this trade.',
    };
  }

  // 6. Upsert Connection
  const { error: connError } = await getDbClient()
    .from('wallet_connections')
    .upsert(
      {
        trade_id: tradeId,
        discord_user_id: discordUserId,
        wallet_address: walletAddress,
      },
      { onConflict: 'trade_id,discord_user_id' },
    );

  if (connError) {
    logger.error('Error storing wallet connection:', connError);
    throw { status: 500, message: 'Failed to store wallet connection' };
  }

  logger.info(
    `Wallet connected: ${tradeId} | ${userType} | ${truncateWalletAddress(walletAddress)}`,
  );

  // 7. Trigger Discord UI Update (Fire and forget / Best effort)
  updateDiscordTradeMessage(tradeId, tradeData).catch((err) =>
    logger.warn('Failed to update Discord UI:', err.message),
  );

  return { tradeId, userType, walletAddress };
}

// HELPER: Extracted Discord Message Update Logic
async function updateDiscordTradeMessage(tradeId, tradeData) {
  if (!botClient) return;

  const registered = (await getRegisteredTradeMessage(tradeId)) || {};
  const guildId = tradeData.guild_id || registered.guild_id;
  const channelId = tradeData.channel_id || registered.channel_id;
  const messageId = registered.message_id;

  if (!guildId || !channelId) return;

  const guild = await botClient.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return;

  let botMessage = null;
  if (messageId) {
    botMessage = await channel.messages.fetch(messageId).catch(() => null);
  }

  // Fallback search if message ID not found
  if (!botMessage) {
    const recent = await channel.messages
      .fetch({ limit: 20 })
      .catch(() => null);
    botMessage = recent?.find(
      (m) =>
        m.author?.id === botClient.user?.id &&
        (m.content.includes(tradeId) || m.components.length > 0),
    );
  }

  if (botMessage) {
    const { buildConnectWalletContainer, buildDevelopmentInProgressContainer } =
      await import('./components/containers.js');
    const { data: connections } = await getDbClient()
      .from('wallet_connections')
      .select('*')
      .eq('trade_id', tradeId);

    const buyerConn = connections?.find(
      (c) => c.discord_user_id === tradeData.buyer_id,
    );
    const sellerConn = connections?.find(
      (c) => c.discord_user_id === tradeData.seller_id,
    );

    const walletStatus = {
      buyerWallet: buyerConn?.wallet_address || null,
      sellerWallet: sellerConn?.wallet_address || null,
    };

    const confirmationStatus = {
      buyerConfirmed: !!tradeData.buyer_confirmed,
      sellerConfirmed: !!tradeData.seller_confirmed,
    };

    const buyerDisplayName =
      tradeData.buyer_display || registered.buyer_display;
    const sellerDisplayName =
      tradeData.seller_display || registered.seller_display;

    const tradeDetails = {
      item: tradeData.item || registered.item,
      price: tradeData.price || registered.price,
      details: tradeData.additional_details || registered.additional_details,
    };

    const container =
      confirmationStatus.buyerConfirmed && confirmationStatus.sellerConfirmed
        ? buildDevelopmentInProgressContainer(
            tradeId,
            tradeData.buyer_id,
            tradeData.seller_id,
            buyerDisplayName,
            sellerDisplayName,
          )
        : await buildConnectWalletContainer(
            tradeId,
            tradeData.buyer_id,
            tradeData.seller_id,
            walletStatus,
            buyerDisplayName,
            sellerDisplayName,
            confirmationStatus,
            tradeDetails,
          );

    await botMessage.edit({ components: [container.toJSON()] });
  }
}

/**
 * Register a Discord message as the canonical message for a trade.
 * Called by the bot after it posts the welcome/connect-wallet container.
 *
 * @param {string} tradeId
 * @param {string} guildId
 * @param {string} channelId
 * @param {string} messageId
 * @param {string|null} buyerId
 * @param {string|null} sellerId
 * @param {string|null} buyerDisplay
 * @param {string|null} sellerDisplay
 * @param {boolean|undefined} buyerConfirmed
 * @param {boolean|undefined} sellerConfirmed
 * @param {string|null} item
 * @param {string|null} price
 * @param {string|null} additionalDetails
 * @returns {boolean}
 */
export async function registerTradeMessage(
  tradeId,
  guildId,
  channelId,
  messageId,
  buyerId = null,
  sellerId = null,
  buyerDisplay = null,
  sellerDisplay = null,
  buyerConfirmed = undefined,
  sellerConfirmed = undefined,
  item = null,
  price = null,
  additionalDetails = null,
) {
  logger.debug('🚀 registerTradeMessage CALLED with params:', {
    tradeId,
    guildId,
    channelId,
    messageId,
    buyerId,
    sellerId,
    buyerDisplay,
    sellerDisplay,
  });

  logger.debug('🔍 registerTradeMessage called with:', {
    tradeId,
    buyerId,
    sellerId,
    buyerDisplay: buyerDisplay || 'NULL/UNDEFINED',
    sellerDisplay: sellerDisplay || 'NULL/UNDEFINED',
    buyerDisplayType: typeof buyerDisplay,
    sellerDisplayType: typeof sellerDisplay,
    buyerDisplayLength: buyerDisplay?.length || 0,
    sellerDisplayLength: sellerDisplay?.length || 0,
    item,
    price,
    additionalDetails,
  });

  if (!tradeId || !guildId || !channelId || !messageId) return false;

  const tradeData = {
    trade_id: tradeId,
    guild_id: guildId,
    channel_id: channelId,
    message_id: messageId,
    buyer_id: buyerId || null,
    seller_id: sellerId || null,
    buyer_display: buyerDisplay || null,
    seller_display: sellerDisplay || null,
    item: item || null,
    price: price || null,
    additional_details: additionalDetails || null,
  };

  if (buyerConfirmed !== undefined) {
    tradeData.buyer_confirmed = buyerConfirmed;
  }

  if (sellerConfirmed !== undefined) {
    tradeData.seller_confirmed = sellerConfirmed;
  }

  try {
    const { error } = await getDbClient()
      .from('trades')
      .upsert(tradeData, { onConflict: 'trade_id' });

    if (error) {
      logger.error('Error saving trade data:', error);
      return false;
    }

    logger.debug('💾 Stored trade data in database:', tradeData);

    // Log registration for debugging and audit
    logger.info('Registered trade message for updates', {
      tradeId,
      guildId,
      channelId,
      messageId,
      buyerId: buyerId || null,
      sellerId: sellerId || null,
      buyerDisplay: buyerDisplay || null,
      sellerDisplay: sellerDisplay || null,
      item: item || null,
      price: price || null,
      additionalDetails: additionalDetails || null,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    logger.error('Failed to register trade message:', err);
    return false;
  }
}

/**
 * Mark a user's Proceed confirmation and return the updated trade record.
 * @param {string} tradeId
 * @param {'buyer'|'seller'} userType
 */
export async function confirmTradeProceedStep(tradeId, userType) {
  if (!tradeId || !userType) {
    throw new Error('Trade ID and user type are required for confirmation.');
  }

  const column =
    userType === 'buyer'
      ? 'buyer_confirmed'
      : userType === 'seller'
        ? 'seller_confirmed'
        : null;

  if (!column) {
    throw new Error(`Invalid user type for confirmation: ${userType}`);
  }

  const { data, error } = await getDbClient()
    .from('trades')
    .update({ [column]: true })
    .eq('trade_id', tradeId)
    .select('*')
    .single();

  if (error) {
    logger.error('Error updating proceed confirmation:', {
      tradeId,
      userType,
      error,
    });
    throw new Error('Failed to store proceed confirmation');
  }

  return data;
}

/**
 * Force a Discord message refresh for a trade using the latest database state.
 * @param {string} tradeId
 * @param {object|null} tradeDataOverride
 */
export async function refreshTradeMessage(tradeId, tradeDataOverride = null) {
  const tradeData =
    tradeDataOverride || (await getRegisteredTradeMessage(tradeId));
  if (!tradeData) {
    return null;
  }

  await updateDiscordTradeMessage(tradeId, tradeData);
  return tradeData;
}

// Debug endpoint - best-effort; returns registry and connections for inspection.
// Access: GET /api/wallet/debug  (optional query param: ?tradeId=<tradeId>)
app.get('/api/wallet/debug', async (req, res) => {
  if (!env.DEBUG_MODE) {
    return res.status(403).json({ error: 'Debug mode disabled' });
  }

  try {
    const { tradeId } = req.query;

    if (tradeId) {
      const { data: registryEntry, error: regError } = await getDbClient()
        .from('trades')
        .select('*')
        .eq('trade_id', tradeId)
        .single();

      const { data: connections, error: connError } = await getDbClient()
        .from('wallet_connections')
        .select('*')
        .eq('trade_id', tradeId);

      if (regError) logger.error('Error fetching registry:', regError);
      if (connError) logger.error('Error fetching connections:', connError);

      return res.json({
        tradeId,
        registry: registryEntry || null,
        connections: connections || [],
      });
    }

    // Return full registries (beware: may be large)
    const { data: registry, error: regError } = await getDbClient()
      .from('trades')
      .select('*');

    const { data: connections, error: connError } = await getDbClient()
      .from('wallet_connections')
      .select('*');

    if (regError) logger.error('Error fetching registry:', regError);
    if (connError) logger.error('Error fetching connections:', connError);

    return res.json({
      registry: registry || [],
      connections: connections || [],
    });
  } catch (err) {
    logger.error('Error in /api/wallet/debug handler', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Return registered trade message entry or null.
 * @param {string} tradeId
 */
export async function getRegisteredTradeMessage(tradeId) {
  try {
    const { data, error } = await getDbClient()
      .from('trades')
      .select('*')
      .eq('trade_id', tradeId)
      .single();

    if (error) {
      logger.error('Error fetching trade data:', error);
      return null;
    }

    return data;
  } catch (err) {
    logger.error('Failed to get registered trade message:', err);
    return null;
  }
}

/**
 * Generate a wallet connect URL for the client app.
 * Uses a secure JWT token to prevent parameter manipulation.
 */
export function generateWalletConnectUrl(tradeId, userType) {
  logger.debug('🔗 Generating wallet connect URL:', {
    tradeId,
    userType,
    clientUrl: env.CLIENT_URL || 'http://localhost:5173',
  });

  // Generate secure JWT token containing tradeId and userType
  const token = jwt.sign(
    { tradeId, userType },
    env.JWT_SECRET,
    { expiresIn: '1h' }, // Token expires in 1 hour
  );

  const params = new URLSearchParams();
  params.append('token', token);
  const url = `${CLIENT_URL}/?${params.toString()}`;

  logger.debug('📤 Generated secure URL:', url);
  return url;
}
// API endpoint to fetch trade data by tradeId
app.get('/api/trade/:tradeId', async (req, res) => {
  try {
    const { tradeId } = req.params;

    const { data: tradeData, error } = await getDbClient()
      .from('trades')
      .select('*')
      .eq('trade_id', tradeId)
      .single();

    logger.debug('🔍 Trade API request', {
      tradeId,
      found: !!tradeData,
      hasTradeData: !!tradeData,
      buyerDisplay: tradeData?.buyer_display || 'NULL/UNDEFINED',
      sellerDisplay: tradeData?.seller_display || 'NULL/UNDEFINED',
      buyerDisplayType: typeof tradeData?.buyer_display,
      sellerDisplayType: typeof tradeData?.seller_display,
      fullTradeData: tradeData,
    });

    if (error || !tradeData) {
      logger.debug('🔍 Trade API request - not found', { tradeId, error });
      return res.status(404).json({ error: 'Trade not found' });
    }

    const responseData = {
      tradeId,
      buyerId: tradeData.buyer_id,
      sellerId: tradeData.seller_id,
      buyerDisplay: tradeData.buyer_display,
      sellerDisplay: tradeData.seller_display,
      guildId: tradeData.guild_id,
      channelId: tradeData.channel_id,
    };

    logger.debug('📤 Trade API response', responseData);
    res.json(responseData);
  } catch (error) {
    logger.error('Error fetching trade data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export function truncateWalletAddress(address) {
  if (!address || address.length < 10) {
    return address;
  }
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

app.post('/api/wallet/callback', async (req, res) => {
  try {
    const { token, discordUserId, walletAddress } = req.body;
    const result = await handleWalletConnection(
      token,
      discordUserId,
      walletAddress,
    );

    // Callback specific: Redirect URL
    const successUrl = `${CLIENT_URL}/success?tradeId=${result.tradeId}&discordUserId=${discordUserId}&walletAddress=${walletAddress}&userType=${result.userType}`;

    res.json({ success: true, redirect: successUrl, ...result });
  } catch (err) {
    // Return specific error status if available, else 500
    res
      .status(err.status || 500)
      .json({ error: err.message || 'Internal server error' });
  }
});
app.post('/api/wallet/update', async (req, res) => {
  try {
    const { token, discordUserId, walletAddress } = req.body;
    await handleWalletConnection(token, discordUserId, walletAddress);

    // Update specific: JSON success
    res.json({ success: true });
  } catch (err) {
    res
      .status(err.status || 500)
      .json({ error: err.message || 'Internal server error' });
  }
});

export async function getWalletConnection(tradeId, discordUserId) {
  try {
    const { data, error } = await getDbClient()
      .from('wallet_connections')
      .select('*')
      .eq('trade_id', tradeId)
      .eq('discord_user_id', discordUserId)
      .single();

    if (error) {
      logger.error('Error fetching wallet connection:', error);
      return null;
    }

    return data;
  } catch (err) {
    logger.error('Failed to get wallet connection:', err);
    return null;
  }
}

export async function getTradeWalletConnections(tradeId) {
  try {
    const { data, error } = await getDbClient()
      .from('wallet_connections')
      .select('*')
      .eq('trade_id', tradeId);

    if (error) {
      logger.error('Error fetching trade wallet connections:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    logger.error('Failed to get trade wallet connections:', err);
    return [];
  }
}

export async function startWalletServer(client) {
  botClient = client;
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      logger.info(`Wallet connection server running on port ${PORT}`);
      logger.info(
        `Server URL: ${env.VITE_SERVER_URL || `http://localhost:${PORT}`}`,
      );
      resolve(server);
    });
  });
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWalletServer().catch((error) => {
    logger.error('Failed to start wallet server:', error);
    process.exit(1);
  });
}

export { app as walletServer };
