import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

import { logger } from './logger.js';

let botClient = null;
let supabaseClient = null;

/**
 * Lazy load Supabase client - avoid top-level initialization errors.
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      throw new Error('Supabase environment variables not configured');
    }
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
  }
  return supabaseClient;
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

/**
 * Process wallet connection: verify JWT, authorize user, store wallet address.
 */
async function handleWalletConnection(token, discordUserId, walletAddress) {
  if (!token || !discordUserId || !walletAddress) {
    throw { status: 400, message: 'Missing required parameters' };
  }

  const evmAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!evmAddressRegex.test(walletAddress)) {
    throw { status: 400, message: 'Invalid wallet address format' };
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (jwtError) {
    throw { status: 401, message: jwtError };
  }

  const { tradeId, userType } = decoded;

  const { data: tradeData, error: tradeError } = await getSupabaseClient()
    .from('trades')
    .select('*')
    .eq('trade_id', tradeId)
    .single();

  if (tradeError || !tradeData) {
    throw { status: 404, message: 'Trade not found' };
  }

  const expectedUserId =
    userType === 'buyer' ? tradeData.buyer_id : tradeData.seller_id;
  if (discordUserId !== expectedUserId) {
    throw { status: 403, message: 'Unauthorized: User ID mismatch' };
  }

  const { error: connError } = await getSupabaseClient()
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

  updateDiscordTradeMessage(tradeId, tradeData).catch((err) =>
    logger.warn('Failed to update Discord UI:', err.message),
  );

  return { tradeId, userType, walletAddress };
}

/**
 * Update Discord message when wallet connections change - best effort.
 */
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
    const { buildConnectWalletContainer } = await import(
      './components/containers.js'
    );
    const { data: connections } = await getSupabaseClient()
      .from('wallet_connections')
      .select('*')
      .eq('trade_id', tradeId);

    const buyerConn = connections?.find(
      (c) => c.discord_user_id === tradeData.buyer_id,
    );
    const sellerConn = connections?.find(
      (c) => c.discord_user_id === tradeData.seller_id,
    );

    const container = await buildConnectWalletContainer(
      tradeId,
      tradeData.buyer_id,
      tradeData.seller_id,
      {
        buyerWallet: buyerConn?.wallet_address || null,
        sellerWallet: sellerConn?.wallet_address || null,
      },
      tradeData.buyer_display || registered.buyer_display,
      tradeData.seller_display || registered.seller_display,
    );

    await botMessage.edit({ components: [container.toJSON()] });
  }
}

/**
 * Register a Discord message as the canonical message for a trade.
 * Enables the wallet server to update the message when wallets connect.
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
) {

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
  };

  try {
    const { error } = await getSupabaseClient()
      .from('trades')
      .upsert(tradeData, { onConflict: 'trade_id' });

    if (error) {
      logger.error('Error saving trade data:', error);
      return false;
    }

    logger.info('Registered trade message for updates', {
      tradeId,
      guildId,
      channelId,
      messageId,
      buyerId: buyerId || null,
      sellerId: sellerId || null,
      buyerDisplay: buyerDisplay || null,
      sellerDisplay: sellerDisplay || null,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (err) {
    logger.error('Failed to register trade message:', err);
    return false;
  }
}

/**
 * Debug endpoint - return registry and connections for inspection.
 * GET /api/wallet/debug?tradeId=<tradeId> (optional)
 */
app.get('/api/wallet/debug', async (req, res) => {
  if (!env.DEBUG_MODE) {
    return res.status(403).json({ error: 'Debug mode disabled' });
  }

  try {
    const { tradeId } = req.query;

    if (tradeId) {
      const { data: registryEntry, error: regError } = await getSupabaseClient()
        .from('trades')
        .select('*')
        .eq('trade_id', tradeId)
        .single();

      const { data: connections, error: connError } = await getSupabaseClient()
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
    const { data: registry, error: regError } = await getSupabaseClient()
      .from('trades')
      .select('*');

    const { data: connections, error: connError } = await getSupabaseClient()
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
 * Fetch registered trade message data by tradeId.
 * @returns {Promise<Object|null>}
 */
export async function getRegisteredTradeMessage(tradeId) {
  try {
    const { data, error } = await getSupabaseClient()
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
 * Generate JWT-secured wallet connect URL for the client app.
 * Token expires in 1 hour.
 */
export function generateWalletConnectUrl(tradeId, userType) {
  const token = jwt.sign(
    { tradeId, userType },
    env.JWT_SECRET,
    { expiresIn: '1h' },
  );

  const params = new URLSearchParams();
  params.append('token', token);
  return `${CLIENT_URL}/?${params.toString()}`;
}

/**
 * Fetch trade data by tradeId.
 * GET /api/trade/:tradeId
 */
app.get('/api/trade/:tradeId', async (req, res) => {
  try {
    const { tradeId } = req.params;

    const { data: tradeData, error } = await getSupabaseClient()
      .from('trades')
      .select('*')
      .eq('trade_id', tradeId)
      .single();

    if (error || !tradeData) {
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

/**
 * Fetch wallet connection for a specific trade and user.
 */
export async function getWalletConnection(tradeId, discordUserId) {
  try {
    const { data, error } = await getSupabaseClient()
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

/**
 * Fetch all wallet connections for a trade.
 */
export async function getTradeWalletConnections(tradeId) {
  try {
    const { data, error } = await getSupabaseClient()
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

/**
 * Start wallet connection server on configured port.
 */
export async function startWalletServer(client) {
  botClient = client;
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      logger.info(`Wallet connection server running on port ${PORT}`);
      logger.info(
        `Server URL: ${env.SERVER_URL || `http://localhost:${PORT}`}`,
      );
      resolve(server);
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startWalletServer().catch((error) => {
    logger.error('Failed to start wallet server:', error);
    process.exit(1);
  });
}

export { app as walletServer };
