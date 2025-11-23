import cors from 'cors';
import express from 'express';

import { env } from '../config/env.js';

const app = express();
const PORT = env.WALLET_SERVER_PORT || 3001;

app.use(
  cors({
    origin: true, // Allow all origins for development
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.static('public'));

const walletConnections = new Map();

// Registry to track the bot message that corresponds to a given trade.
// This allows the wallet server to find and update the original welcome/container
// message that was posted by the bot when the private thread was created.
const tradeMessageRegistry = new Map();

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
 * @returns {boolean}
 */
export function registerTradeMessage(
  tradeId,
  guildId,
  channelId,
  messageId,
  buyerId = null,
  sellerId = null,
  buyerDisplay = null,
  sellerDisplay = null,
) {
  console.log('🚀 registerTradeMessage CALLED with params:', {
    tradeId,
    guildId,
    channelId,
    messageId,
    buyerId,
    sellerId,
    buyerDisplay,
    sellerDisplay,
  });

  console.log('🔍 registerTradeMessage called with:', {
    tradeId,
    buyerId,
    sellerId,
    buyerDisplay: buyerDisplay || 'NULL/UNDEFINED',
    sellerDisplay: sellerDisplay || 'NULL/UNDEFINED',
    buyerDisplayType: typeof buyerDisplay,
    sellerDisplayType: typeof sellerDisplay,
    buyerDisplayLength: buyerDisplay?.length || 0,
    sellerDisplayLength: sellerDisplay?.length || 0,
  });

  if (!tradeId || !guildId || !channelId || !messageId) return false;

  const tradeData = {
    guildId,
    channelId,
    messageId,
    buyerId: buyerId || null,
    sellerId: sellerId || null,
    buyerDisplay: buyerDisplay || null,
    sellerDisplay: sellerDisplay || null,
    registeredAt: new Date().toISOString(),
  };

  console.log('💾 Storing trade data:', tradeData);
  tradeMessageRegistry.set(tradeId, tradeData);

  // Log registration for debugging and audit
  try {
    console.info('Registered trade message for updates', {
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
  } catch (logErr) {
    // Do not throw on logging failure; best-effort.
    // Keep minimal noise in production.
    try {
      console.warn(
        'Failed to log trade message registration',
        logErr?.message || logErr,
      );
    } catch (logErr) {
      console.warn(
        'Failed to log trade message registration',
        logErr?.message || logErr,
      );
    }
  }

  return true;
}

// Debug endpoint - best-effort; returns registry and connections for inspection.
// Access: GET /api/wallet/debug  (optional query param: ?tradeId=<tradeId>)
app.get('/api/wallet/debug', (req, res) => {
  try {
    const { tradeId } = req.query;

    if (tradeId) {
      const registryEntry = tradeMessageRegistry.get(tradeId) || null;
      const connections = [];
      for (const [key, conn] of walletConnections.entries()) {
        if (key.startsWith(`${tradeId}:`)) connections.push(conn);
      }
      return res.json({ tradeId, registry: registryEntry, connections });
    }

    // Return full registries (beware: may be large)
    const registry = {};
    for (const [k, v] of tradeMessageRegistry.entries()) {
      registry[k] = v;
    }
    const connections = [];
    for (const [k, v] of walletConnections.entries()) {
      connections.push([k, v]);
    }
    return res.json({ registry, connections });
  } catch (err) {
    console.error('Error in /api/wallet/debug handler', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Return registered trade message entry or null.
 * @param {string} tradeId
 */
export function getRegisteredTradeMessage(tradeId) {
  return tradeMessageRegistry.get(tradeId) || null;
}

/**
 * Generate a wallet connect URL for the client app.
 * Only passes tradeId and userType - all other data is fetched server-side.
 */
export function generateWalletConnectUrl(tradeId, userType) {
  console.log('🔗 Generating wallet connect URL:', {
    tradeId,
    userType,
    clientUrl: env.CLIENT_URL || 'http://localhost:5173',
  });

  const clientUrl = env.CLIENT_URL || 'http://localhost:5173';
  const params = new URLSearchParams();
  params.append('tradeId', tradeId);
  params.append('userType', userType);
  const url = `${clientUrl}/?${params.toString()}`;

  console.log('📤 Generated URL:', url);
  return url;
}
// API endpoint to fetch trade data by tradeId
app.get('/api/trade/:tradeId', (req, res) => {
  try {
    const { tradeId } = req.params;
    const tradeData = tradeMessageRegistry.get(tradeId);

    console.log('🔍 Trade API request', {
      tradeId,
      found: !!tradeData,
      hasTradeData: !!tradeData,
      buyerDisplay: tradeData?.buyerDisplay || 'NULL/UNDEFINED',
      sellerDisplay: tradeData?.sellerDisplay || 'NULL/UNDEFINED',
      buyerDisplayType: typeof tradeData?.buyerDisplay,
      sellerDisplayType: typeof tradeData?.sellerDisplay,
      fullTradeData: tradeData,
    });

    if (!tradeData) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    const responseData = {
      tradeId,
      buyerId: tradeData.buyerId,
      sellerId: tradeData.sellerId,
      buyerDisplay: tradeData.buyerDisplay,
      sellerDisplay: tradeData.sellerDisplay,
      guildId: tradeData.guildId,
      channelId: tradeData.channelId,
    };

    console.log('📤 Trade API response', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching trade data:', error);
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
    const { tradeId, discordUserId, walletAddress } = req.body;

    if (!tradeId || !discordUserId || !walletAddress) {
      console.warn('Invalid wallet callback data', {
        tradeId,
        discordUserId,
        walletAddress,
      });
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Fetch trade data from registry
    const tradeData = tradeMessageRegistry.get(tradeId);
    if (!tradeData) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    // Store wallet connection
    const connectionKey = `${tradeId}:${discordUserId}`;
    walletConnections.set(connectionKey, {
      tradeId,
      discordUserId,
      walletAddress,
      guildId: tradeData.guildId,
      channelId: tradeData.channelId,
      buyerId: tradeData.buyerId,
      sellerId: tradeData.sellerId,
      buyerDisplay: tradeData.buyerDisplay,
      sellerDisplay: tradeData.sellerDisplay,
      connectedAt: new Date().toISOString(),
    });

    console.info('Wallet connection callback received', {
      tradeId,
      discordUserId,
      walletAddress: truncateWalletAddress(walletAddress),
    });

    // Best-effort: attempt to update the original bot message container for this trade.
    // 1) Check registry for an exact messageId
    // 2) If not found, try to locate a bot-authored message in the channel that references the tradeId
    try {
      const registered = getRegisteredTradeMessage(tradeId) || null;
      const targetGuildId =
        tradeData.guildId || (registered && registered.guildId);
      const targetChannelId =
        tradeData.channelId || (registered && registered.channelId);
      const targetMessageId = registered && registered.messageId;

      // Dynamically import the bot client to avoid top-level circular imports
      let botClient = null;
      try {
        const botModule = await import('../bot.js');
        botClient = botModule?.client;
      } catch (impErr) {
        // ignore - best-effort
        console.warn(
          'Could not import bot client to update message (best-effort):',
          impErr?.message || impErr,
        );
      }

      if (botClient && targetGuildId && targetChannelId) {
        const guild =
          botClient.guilds.cache.get(targetGuildId) ||
          (await botClient.guilds.fetch(targetGuildId).catch(() => null));
        if (guild) {
          const channel =
            guild.channels.cache.get(targetChannelId) ||
            (await guild.channels.fetch(targetChannelId).catch(() => null));
          if (channel) {
            // Try to fetch the registered message by id first
            let botMessage = null;
            if (targetMessageId) {
              botMessage = await channel.messages
                .fetch(targetMessageId)
                .catch(() => null);
            }

            // Fallback: scan recent messages for a bot-authored message that references the tradeId or has components
            if (!botMessage) {
              const recent = await channel.messages
                .fetch({ limit: 50 })
                .catch(() => null);
              if (recent) {
                botMessage =
                  recent.find((m) => {
                    if (m.author?.id !== botClient.user?.id) return false;
                    if (m.components && m.components.length > 0) return true;
                    if (m.content && tradeId && m.content.includes(tradeId))
                      return true;
                    return false;
                  }) || null;
              }
            }

            if (botMessage) {
              try {
                // Build updated container and replace components
                const { buildConnectWalletContainer } = await import(
                  './components/containers.js'
                );
                const tradeConns = getTradeWalletConnections(tradeId);

                // Map wallets to buyer/seller using trade data
                const buyerConn =
                  tradeConns.find(
                    (c) => c.discordUserId === tradeData.buyerId,
                  ) || null;
                const sellerConn =
                  tradeConns.find(
                    (c) => c.discordUserId === tradeData.sellerId,
                  ) || null;

                const buyerDisplay =
                  tradeData.buyerDisplay ||
                  (registered && registered.buyerDisplay
                    ? registered.buyerDisplay
                    : null);
                const sellerDisplay =
                  tradeData.sellerDisplay ||
                  (registered && registered.sellerDisplay
                    ? registered.sellerDisplay
                    : null);

                console.log('Updating wallet container', {
                  tradeId,
                  buyerDisplay,
                  sellerDisplay,
                  buyerWallet: buyerConn
                    ? truncateWalletAddress(buyerConn.walletAddress)
                    : null,
                  sellerWallet: sellerConn
                    ? truncateWalletAddress(sellerConn.walletAddress)
                    : null,
                });

                const container = await buildConnectWalletContainer(
                  tradeId,
                  tradeData.buyerId,
                  tradeData.sellerId,
                  {
                    buyerWallet: buyerConn
                      ? truncateWalletAddress(buyerConn.walletAddress)
                      : null,
                    sellerWallet: sellerConn
                      ? truncateWalletAddress(sellerConn.walletAddress)
                      : null,
                  },
                  buyerDisplay,
                  sellerDisplay,
                );

                await botMessage
                  .edit({ components: [container.toJSON()] })
                  .catch((e) => {
                    console.warn(
                      'Failed to edit bot message with updated container (best-effort):',
                      e?.message || e,
                    );
                  });

                // If we located the message by search (no registered entry), register it for future direct edits
                if (!registered && botMessage?.id) {
                  try {
                    // store registration for future callback updates
                    tradeMessageRegistry.set(tradeId, {
                      guildId: targetGuildId,
                      channelId: targetChannelId,
                      messageId: botMessage.id,
                      buyerId: tradeData.buyerId,
                      sellerId: tradeData.sellerId,
                      buyerDisplay: tradeData.buyerDisplay,
                      sellerDisplay: tradeData.sellerDisplay,
                      registeredAt: new Date().toISOString(),
                    });
                    console.info(
                      'Registered trade message for future updates',
                      { tradeId, messageId: botMessage.id },
                    );
                  } catch (regErr) {
                    console.warn(
                      'Failed to register trade message after editing',
                      regErr?.message || regErr,
                    );
                  }
                }
              } catch (buildErr) {
                console.warn(
                  'Failed to build/update connect wallet container',
                  buildErr?.message || buildErr,
                );
              }
            } else {
              console.info(
                'No bot message found in channel to update for trade',
                { tradeId },
              );
            }
          }
        }
      } else {
        console.info(
          'Insufficient context to auto-update Discord UI for wallet callback',
          {
            tradeId,
            registered: !!registered,
          },
        );
      }
    } catch (notifyErr) {
      console.warn(
        'Failed to auto-update discord message after wallet callback (best-effort):',
        notifyErr?.message || notifyErr,
      );
    }

    // Return success response with redirect URL
    const successUrl = `${env.CLIENT_URL || 'http://localhost:5173'}/success?tradeId=${encodeURIComponent(tradeId)}&discordUserId=${encodeURIComponent(discordUserId)}&walletAddress=${encodeURIComponent(walletAddress)}`;
    res.json({
      success: true,
      redirect: successUrl,
      tradeId,
      discordUserId,
      walletAddress: truncateWalletAddress(walletAddress),
    });
  } catch (error) {
    console.error('Error handling wallet callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export function getWalletConnection(tradeId, discordUserId) {
  const connectionKey = `${tradeId}:${discordUserId}`;
  return walletConnections.get(connectionKey) || null;
}

export function getTradeWalletConnections(tradeId) {
  const connections = [];
  for (const [key, connection] of walletConnections.entries()) {
    if (key.startsWith(`${tradeId}:`)) {
      connections.push(connection);
    }
  }
  return connections;
}

export async function startWalletServer() {
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.info(`Wallet connection server running on port ${PORT}`);
      console.info(
        `Server URL: ${env.SERVER_URL || `http://localhost:${PORT}`}`,
      );
      resolve(server);
    });
  });
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startWalletServer().catch((error) => {
    console.error('Failed to start wallet server:', error);
    process.exit(1);
  });
}

export { app as walletServer };
