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
import { consumeTradeDraft } from '../utils/tradeDrafts.js';

const { VERIFIED_ROLE_ID } = env;

const THREAD_ARCHIVE_DURATION = ThreadAutoArchiveDuration.OneWeek;
const MAX_THREAD_NAME_LENGTH = 100;
const THREAD_PREFIX = '🛒 Trade ';

/**
 * Routes button interactions to appropriate handlers based on customId.
 * @param {ButtonInteraction} interaction - The Discord button interaction
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
      // customId format: create_thread:{buyerId}:{sellerId}:{tradeDraftId?}
      const [buyerId, sellerId, tradeDraftId] = rest;
      return await handleCreateThreadButton(interaction, buyerId, sellerId, tradeDraftId);
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

    case 'proceed_trade': {
      const [tradeId, buyerId, sellerId] = rest;
      return await handleProceedButton(
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
 * Handles verification button click - assigns verified role to user.
 * @param {ButtonInteraction} interaction - The button interaction
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
    // Fetch the verified role from cache or API
    const verifiedRole =
      guild.roles.cache.get(verifiedRoleId) ||
      (await guild.roles.fetch(verifiedRoleId).catch(() => null));

    if (!verifiedRole) {
      return await interaction.editReply({
        content: '⚠️ The verification role could not be found on this server.',
      });
    }

    const { member } = interaction;

    // Check if user is already verified
    if (member.roles.cache.has(verifiedRoleId)) {
      return await interaction.editReply({
        content: 'ℹ️ You are already verified!',
      });
    }

    // Assign the verified role
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
 * Shows trade details modal for user input.
 * @param {ButtonInteraction} interaction - The button interaction
 */
async function handleCreateTradeButton(interaction) {
  logger.info('Create trade button clicked', { userId: interaction.user.id });
  await interaction.showModal(buildTradeDetailsModal());
}

/**
 * Creates a private Discord thread for trade negotiations.
 * @param {ButtonInteraction} interaction - The button interaction
 * @param {string} buyerId - Discord user ID of buyer
 * @param {string} sellerId - Discord user ID of seller
 * @param {string} tradeDraftId - Temporary identifier for trade details
 */
async function handleCreateThreadButton(interaction, buyerId, sellerId, tradeDraftId = null) {
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

  // Retrieve trade details from draft store
  let item = '';
  let price = '';
  let additionalDetails = '';
  
  if (tradeDraftId) {
    const draft = consumeTradeDraft(tradeDraftId);
    if (draft) {
      item = draft.item || '';
      price = draft.price || '';
      additionalDetails = draft.additionalDetails || '';
    } else {
      logger.warn('Trade draft not found or expired:', tradeDraftId);
    }
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

    logger.debug('Member fetch results', {
      buyerId,
      buyerFetched: !!buyerMember,
      buyerDisplayName: buyerMember?.displayName,
      buyerUserUsername: buyerMember?.user?.username,
      buyerUserDisplayName: buyerMember?.user?.displayName,
      buyerFinalDisplay: buyerDisplay,
      sellerId,
      sellerFetched: !!sellerMember,
      sellerDisplayName: sellerMember?.displayName,
      sellerUserUsername: sellerMember?.user?.username,
      sellerUserDisplayName: sellerMember?.user?.displayName,
      sellerFinalDisplay: sellerDisplay,
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

    logger.debug('Building initial wallet container', {
      tradeId,
      buyerDisplay,
      sellerDisplay,
    });

    const tradeDetails = { item, price, details: additionalDetails };

    const walletContainer = await buildConnectWalletContainer(
      tradeId,
      buyerId,
      sellerId,
      {},
      buyerDisplay,
      sellerDisplay,
      { buyerConfirmed: false, sellerConfirmed: false },
      tradeDetails,
    );
    const welcomeMessage = await thread.send({
      flags: MessageFlags.IsComponentsV2,
      components: [walletContainer.toJSON()],
    });

    logger.debug('Welcome message sent, registering trade', {
      tradeId,
      messageId: welcomeMessage.id,
      buyerDisplay,
      sellerDisplay,
    });

    console.log('🎯 ABOUT TO REGISTER TRADE MESSAGE - THIS SHOULD LOG');
    try {
      console.log('🔄 Attempting to register trade message:', {
        tradeId,
        guildId: guild.id,
        threadId: thread.id,
        messageId: welcomeMessage.id,
        buyerId,
        sellerId,
        buyerDisplay,
        sellerDisplay,
        item,
        price,
        additionalDetails,
      });

      const { registerTradeMessage } = await import('../utils/walletServer.js');
      console.log('📦 Imported registerTradeMessage function');

      const result = await registerTradeMessage(
        tradeId,
        guild.id,
        thread.id,
        welcomeMessage.id,
        buyerId,
        sellerId,
        buyerDisplay,
        sellerDisplay,
        false,
        false,
        item,
        price,
        additionalDetails,
      );

      console.log('✅ Trade message registration result:', result);
      console.log('🎉 TRADE REGISTRATION COMPLETED SUCCESSFULLY');
      logger.debug('Trade message registered successfully');
    } catch (regErr) {
      console.error('❌ Failed to register trade message:', {
        error: regErr?.message || regErr,
        tradeId,
        stack: regErr?.stack,
      });
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
 * Handles wallet connection button click.
 * @param {ButtonInteraction} interaction - The button interaction
 * @param {string} tradeId - The trade ID
 * @param {string} buyerId - The buyer ID
 * @param {string} sellerId - The seller ID
 */
async function handleConnectWalletButton(
  interaction,
  tradeId,
  buyerId,
  sellerId,
) {
  console.log('🔘 WALLET BUTTON CLICKED:', {
    tradeId,
    buyerId,
    sellerId,
    userId: interaction.user.id,
    channelId: interaction.channelId,
  });

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

  console.log('👤 Determined user type:', {
    userType,
    userId: interaction.user.id,
    buyerId,
    sellerId,
  });

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

/**
 * Handles dual confirmation proceed button clicks.
 */
async function handleProceedButton(interaction, tradeId, buyerId, sellerId) {
  const userId = interaction.user.id;
  let userType = null;

  if (userId === buyerId) {
    userType = 'buyer';
  } else if (userId === sellerId) {
    userType = 'seller';
  } else {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }
    await interaction.editReply({
      content: '❌ Only the buyer or seller can confirm this trade.',
    });
    return;
  }

  try {
    const {
      confirmTradeProceedStep,
      getRegisteredTradeMessage,
      getWalletConnection,
      refreshTradeMessage,
    } = await import('../utils/walletServer.js');

    const walletConnection = await getWalletConnection(tradeId, userId);
    if (!walletConnection) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }
      await interaction.editReply({
        content:
          '🔐 Please connect your wallet before confirming. Use the **Connect Your Wallet** button above.',
      });
      return;
    }

    const tradeData = await getRegisteredTradeMessage(tradeId);
    if (!tradeData) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }
      await interaction.editReply({
        content:
          '❌ Unable to find this trade. Please restart the flow or contact support.',
      });
      return;
    }

    const alreadyConfirmed =
      userType === 'buyer'
        ? !!tradeData.buyer_confirmed
        : !!tradeData.seller_confirmed;

    let updatedTrade = tradeData;
    let responseMessage =
      '✅ You have already confirmed. Waiting for the other participant.';

    if (!alreadyConfirmed) {
      updatedTrade = await confirmTradeProceedStep(tradeId, userType);
      const bothConfirmed =
        updatedTrade?.buyer_confirmed && updatedTrade?.seller_confirmed;

      await refreshTradeMessage(tradeId, updatedTrade);

      responseMessage = bothConfirmed
        ? '✅ Both confirmations recorded. Development in progress — we will update this thread once the next action is ready.'
        : '⚡ Confirmation received. Waiting for the other participant to confirm.';
    }

    if (!interaction.deferred && !interaction.replied) {
      await interaction.reply({
        content: responseMessage,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.editReply({ content: responseMessage });
    }
  } catch (error) {
    logger.error('Error handling proceed confirmation:', error);
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }
    await interaction.editReply({
      content: '❌ Unable to record your confirmation. Please try again.',
    });
  }
}
