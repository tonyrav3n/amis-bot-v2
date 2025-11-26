import {
  MessageFlags,
  TextDisplayBuilder,
  ChannelType,
  ThreadAutoArchiveDuration,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import { env } from '../config/env.js';
import {
  buildConfirmTradeDetailsContainer,
  buildConnectWalletContainer,
} from '../utils/components/containers.js';
import { buildTradeDetailsModal } from '../utils/components/modals.js';
import { logger } from '../utils/logger.js';

const { VERIFIED_ROLE_ID } = env;

const THREAD_ARCHIVE_DURATION = ThreadAutoArchiveDuration.OneWeek;
const MAX_THREAD_NAME_LENGTH = 100;
const THREAD_PREFIX = '🛒 Trade ';

/**
 * Route button interactions to appropriate handlers based on customId.
 */
export async function handleButton(interaction) {
  const args = interaction.customId.split(':');
  const [action, ...rest] = args;

  switch (action) {
    case 'verify_assign_role_btn':
      return await handleVerifyButton(interaction);

    case 'create_trade_flow_btn':
      return await handleCreateTradeButton(interaction);

    case 'create_thread': {
      // customId format: create_thread:{buyerId}:{sellerId}
      const [buyerId, sellerId] = rest;
      return await handleCreateThreadButton(interaction, buyerId, sellerId);
    }

    case 'connect_wallet': {
      // customId format: connect_wallet:{tradeId}:{buyerId}:{sellerId}
      const [tradeId, buyerId, sellerId] = rest;
      return await handleConnectWalletButton(
        interaction,
        tradeId,
        buyerId,
        sellerId,
      );
    }
    case 'cancel_trade':
      logger.info('Cancel trade button clicked', {
        userId: interaction.user.id,
      });
      await interaction.update({
        content: 'Cancelled',
        components: [],
      });
      return;

    default:
      logger.warn('Unknown button action:', {
        action,
        customId: interaction.customId,
      });
      await interaction.deferUpdate();
  }
}

/**
 * Handle verify button - assign verified role to user.
 */
async function handleVerifyButton(interaction) {
  logger.info('Verify button clicked', { userId: interaction.user.id });

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  const { guild } = interaction;
  if (!guild) {
    logger.error('No guild in verify handler');
    return await interaction.editReply({ content: '❌ Server error.' });
  }
  const verifiedRoleId = VERIFIED_ROLE_ID;

  try {
    const verifiedRole =
       guild.roles.cache.get(verifiedRoleId) ||
       (await guild.roles.fetch(verifiedRoleId).catch(() => null));

     if (!verifiedRole) {
       return await interaction.editReply({
         content: '⚠️ The verification role could not be found on this server.',
       });
     }

     const { member } = interaction;

     if (member.roles.cache.has(verifiedRoleId)) {
       return await interaction.editReply({
         content: 'ℹ️ You are already verified!',
       });
     }

     await member.roles.add(verifiedRole, 'Verify button assignment');

    await interaction.editReply({
      content: '✅ You have been verified and now have access to the server!',
    });
  } catch (error) {
    logger.error('Error assigning verification role:', error);
    await interaction.editReply({
      content: 'There was an error verifying you on this server.',
    });
  }
}

/**
 * Show trade details modal for user input.
 */
async function handleCreateTradeButton(interaction) {
  logger.info('Create trade button clicked', { userId: interaction.user.id });
  await interaction.showModal(buildTradeDetailsModal());
}

/**
 * Create private trade thread and register it for wallet connection updates.
 */
async function handleCreateThreadButton(interaction, buyerId, sellerId) {
  if (!buyerId || !sellerId) {
    logger.error('Missing buyerId or sellerId for thread creation', {
      buyerId,
      sellerId,
      userId: interaction.user.id,
    });
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }
    await interaction.editReply({
      content:
        '❌ Unable to create thread: missing buyer or seller information. Please restart the trade creation flow.',
    });
    return;
  }

  await interaction.deferUpdate();
  const loadingText = new TextDisplayBuilder().setContent(
    '⏳ *Creating private thread...*',
  );
  const loadingContainer = buildConfirmTradeDetailsContainer(buyerId, sellerId);
  const loadingPayload = loadingContainer
    .spliceComponents(0, loadingContainer.components.length, loadingText)
    .toJSON();
  await interaction.editReply({ components: [loadingPayload] });

  try {
    const { guild } = interaction;
    if (!guild) throw new Error('No guild context');

    const botMember = guild.members.me;
    const channelPerms = interaction.channel.permissionsFor(botMember);
    if (!channelPerms.has(['ManageThreads', 'SendMessagesInThreads'])) {
      throw new Error(
        'Bot lacks thread permissions (ManageThreads, SendMessagesInThreads)',
      );
    }

    logger.info('Fetching members', { buyerId, sellerId });
    const buyerMember = await guild.members.fetch(buyerId).catch(() => null);
    const sellerMember = await guild.members.fetch(sellerId).catch(() => null);

    // Extract display names with multiple fallbacks
    const buyerDisplay =
      buyerMember?.displayName ||
      buyerMember?.user?.username ||
      buyerMember?.user?.displayName ||
      `User ${buyerId.slice(-4)}`;
    const sellerDisplay =
      sellerMember?.displayName ||
      sellerMember?.user?.username ||
      sellerMember?.user?.displayName ||
      `User ${sellerId.slice(-4)}`;

    logger.debug('Member display names resolved', {
      buyerId,
      buyerDisplay,
      sellerId,
      sellerDisplay,
    });

    if (!buyerMember || !sellerMember) {
      throw new Error(
        `Could not fetch buyer (${buyerId}) or seller (${sellerId})`,
      );
    }

    const buyerLast4 = buyerId.slice(-4);
    const sellerLast4 = sellerId.slice(-4);
    const timestamp = Math.floor(Date.now() / 1000);
    const rawTitle = `${THREAD_PREFIX}[${buyerLast4}-${sellerLast4}-${timestamp}]`;
    const threadTitle =
      rawTitle.length > MAX_THREAD_NAME_LENGTH
        ? rawTitle.substring(0, MAX_THREAD_NAME_LENGTH - 1)
        : rawTitle;
    const tradeId = `${buyerLast4}-${sellerLast4}-${timestamp}`;

    const thread = await interaction.channel.threads.create({
      name: threadTitle,
      type: ChannelType.PrivateThread,
      autoArchiveDuration: THREAD_ARCHIVE_DURATION,
      invitable: false,
    });

    await thread.members.add(buyerId);
    await thread.members.add(sellerId);

    const walletContainer = await buildConnectWalletContainer(
      tradeId,
      buyerId,
      sellerId,
      {},
      buyerDisplay,
      sellerDisplay,
    );
    const welcomeMessage = await thread.send({
      flags: MessageFlags.IsComponentsV2,
      components: [walletContainer.toJSON()],
    });

    try {
      const { registerTradeMessage } = await import('../utils/walletServer.js');
      await registerTradeMessage(
        tradeId,
        guild.id,
        thread.id,
        welcomeMessage.id,
        buyerId,
        sellerId,
        buyerDisplay,
        sellerDisplay,
      );
      logger.debug('Trade message registered successfully', { tradeId });
    } catch (regErr) {
      logger.warn(
        'Could not register trade message for updates',
        regErr?.message || regErr,
      );
    }

    const successText = new TextDisplayBuilder().setContent(
      `**✅ Success!** Your private trade channel has been created: ${thread.toString()}`,
    );
    const successContainer = buildConfirmTradeDetailsContainer(
      buyerId,
      sellerId,
    );
    const successPayload = successContainer
      .spliceComponents(0, successContainer.components.length, successText)
      .toJSON();
    await interaction.editReply({ components: [successPayload] });
  } catch (error) {
    logger.error('Thread creation failed', {
      error: error.message,
      buyerId,
      sellerId,
    });

    const errorText = new TextDisplayBuilder().setContent(
      `**Thread Creation Failed:** ${error.message}. Please check bot permissions/logs.`,
    );
    const errorContainer = buildConfirmTradeDetailsContainer(buyerId, sellerId);
    const errorPayload = errorContainer
      .spliceComponents(0, errorContainer.components.length, errorText)
      .toJSON();
    await interaction.editReply({ components: [errorPayload] });
  }
}

/**
 * Handle wallet connection button - generate wallet connect URL.
 */
async function handleConnectWalletButton(
  interaction,
  tradeId,
  buyerId,
  sellerId,
) {
  let userType = null;

  if (interaction.user.id === buyerId) {
    userType = 'buyer';
  } else if (interaction.user.id === sellerId) {
    userType = 'seller';
  } else {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }
    await interaction.editReply({
      content:
        '❌ You are not a participant in this trade and cannot connect a wallet.',
    });
    return;
  }

  try {
    const { generateWalletConnectUrl } = await import(
      '../utils/walletServer.js'
    );

    const walletConnectUrl = generateWalletConnectUrl(tradeId, userType);

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }
    await interaction.editReply({
      content: `🔗 **${userType.charAt(0).toUpperCase() + userType.slice(1)} Wallet Connection**\n\nClick the button below to connect your wallet for trade \`${tradeId}\`.`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel(
              `Connect ${userType.charAt(0).toUpperCase() + userType.slice(1)} Wallet`,
            )
            .setStyle(ButtonStyle.Link)
            .setURL(walletConnectUrl),
        ),
      ],
    });
  } catch (error) {
    logger.error('Error handling wallet connection:', error);
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }
    await interaction.editReply({
      content: '❌ Error initiating wallet connection. Please try again.',
    });
  }
}
