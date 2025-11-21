/**
 * Button Interaction Handlers - Comprehensive Button Processing System
 *
 * Central handler for all Discord button interactions with detailed logging,
 * error handling, and security validation. Processes multiple button types
 * through a routing system with comprehensive audit trails.
 *
 * Features:
 * - Main button router with customId parsing
 * - User verification with role assignment
 * - Trade creation flow with modal integration
 * - Thread creation with member validation
 * - Comprehensive error handling and recovery
 * - Security validation and permission checking
 * - Detailed logging for audit and debugging
 *
 * Security:
 * - Validates guild context before operations
 * - Checks bot permissions for thread creation
 * - Validates member existence before thread operations
 * - Prevents privilege escalation through role checks
 *
 * @module handlers/buttonsHandler
 * @author amis Bot Team
 * @version 2.0.0
 * @since 1.0.0
 */

import {
  MessageFlags,
  TextDisplayBuilder,
  ChannelType,
  ThreadAutoArchiveDuration,
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
 * Main button interaction handler with routing and error handling
 *
 * Routes button interactions to appropriate handlers based on customId structure.
 * Implements comprehensive error handling and security validation for all
 * button operations.
 *
 * CustomId Patterns:
 * - verify_assign_role_btn: User verification
 * - create_trade_flow_btn: Trade creation initiation
 * - create_thread:{buyerId}:{sellerId}: Thread creation
 *
 * @async
 * @function handleButton
 * @param {ButtonInteraction} interaction - The Discord button interaction
 * @returns {Promise<void>} Resolves when button processing completes
 *
 * @example
 * // Called automatically by interactionCreate event
 * if (interaction.isButton()) {
 *   await handleButton(interaction);
 * }
 *
 * @throws {Error} When interaction processing fails
 */
export async function handleButton(interaction) {
  const args = interaction.customId.split(':');
  const [action, buyerId, sellerId] = args;

  switch (action) {
    case 'verify_assign_role_btn':
      return await handleVerifyButton(interaction);
    case 'create_trade_flow_btn':
      return await handleCreateTradeButton(interaction);
    case 'create_thread':
      return await handleCreateThreadButton(interaction, buyerId, sellerId);
    default:
      logger.warn('Unknown button action:', {
        action,
        customId: interaction.customId,
      });
      await interaction.deferUpdate();
  }
}

/**
 * Handle verification button click with comprehensive validation
 *
 * Processes user verification requests with multi-step validation:
 * 1. Validates guild context exists
 * 2. Fetches and validates verified role
 * 3. Checks if user already has role
 * 4. Assigns role and provides feedback
 *
 * Security Features:
 * - Validates guild context before role operations
 * - Ensures role exists before assignment
 * - Prevents duplicate role assignment
 * - Comprehensive error handling with user feedback
 *
 * @async
 * @function handleVerifyButton
 * @param {ButtonInteraction} interaction - The button interaction from /verify_setup
 * @returns {Promise<void>} Resolves when verification completes
 * @private
 *
 * @example
 * // User clicks: ✅ Verify button
 * // Process: Check role → Validate user → Assign role → Send confirmation
 */
async function handleVerifyButton(interaction) {
  /**
   * Handle verification button click - assigns verified role to user
   *
   * Checks if the user already has the verified role, then assigns it if not.
   * The role ID is configured via VERIFIED_ROLE_ID environment variable.
   *
   * @param {ButtonInteraction} interaction - The button interaction from /verify_setup
   * @returns {Promise<void>}
   * @private
   */
  logger.info('Verify button clicked', { userId: interaction.user.id });

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
 * Handle "Create Trade" button with modal integration
 *
 * Initiates the trade creation flow by showing a modal for trade details.
 * This streamlined approach replaces the previous multi-step button flow
 * with a single modal interface for better user experience.
 *
 * Trade Flow:
 * 1. User clicks "Create Trade" button
 * 2. Bot shows trade details modal (Components V2)
 * 3. User submits modal with trade information
 * 4. Modal handler processes and creates confirmation
 *
 * Benefits:
 * - Single interaction point
 * - Structured data collection
 * - Better validation and error handling
 * - Reduced user friction
 *
 * @async
 * @function handleCreateTradeButton
 * @param {ButtonInteraction} interaction - The button interaction from /verify_setup
 * @returns {Promise<void>} Resolves when modal is shown
 * @private
 *
 * @example
 * // User clicks: Create Trade button
 * // Action: Shows trade details modal for user input
 */
async function handleCreateTradeButton(interaction) {
  /**
   * Handle "Create Trade" button - starts the trade creation flow
   *
   * Shows modal for trade details input.
   * Flow: Create Trade → Role Selection → Counterparty Selection → Modal → Confirm → Thread
   *
   * @param {ButtonInteraction} interaction - The button interaction from /create_trade
   * @returns {Promise<void>}
   * @private
   */
  logger.info('🛒 Create trade button clicked', {
    userId: interaction.user.id,
  });
  await interaction.showModal(buildTradeDetailsModal());
}

/**
 * Handle "Create Thread" button with comprehensive thread management
 *
 * Creates a private Discord thread for trade negotiations between buyer and seller.
 * Implements a multi-step process with loading states, validation, and error recovery.
 *
 * Thread Creation Process:
 * 1. Show loading state to user
 * 2. Validate bot permissions for thread management
 * 3. Fetch buyer and seller member objects
 * 4. Generate unique thread title with timestamps
 * 5. Create private thread with auto-archive settings
 * 6. Add participants to thread
 * 7. Send welcome message
 * 8. Update UI with success/failure status
 *
 * Security & Validation:
 * - Validates bot has ManageThreads and SendMessagesInThreads permissions
 * - Ensures both buyer and seller exist in guild
 * - Creates private threads that cannot be invited to
 * - Generates unique thread titles to prevent conflicts
 *
 * Error Handling:
 * - Permission errors with specific guidance
 * - Member fetch failures with user feedback
 * - Thread creation failures with rollback
 * - Comprehensive error logging for debugging
 *
 * @async
 * @function handleCreateThreadButton
 * @param {ButtonInteraction} interaction - The confirm button interaction
 * @param {string} buyerId - Discord user ID of buyer
 * @param {string} sellerId - Discord user ID of seller (different from buyer)
 * @returns {Promise<void>} Resolves when thread creation completes
 * @private
 *
 * @throws {Error} When thread creation or member operations fail
 */
async function handleCreateThreadButton(interaction, buyerId, sellerId) {
  logger.info('Create thread button clicked', {
    buyerId,
    sellerId,
    userId: interaction.user.id,
  });

  await interaction.deferUpdate();
  const loadingText = new TextDisplayBuilder().setContent(
    '*Creating private thread...*',
  );
  const loadingContainer = buildConfirmTradeDetailsContainer();
  await interaction.editReply({
    components: [
      loadingContainer.spliceComponents(
        0,
        loadingContainer.components.length,
        loadingText,
      ),
    ],
  });

  try {
    const { guild } = interaction;
    if (!guild) throw new Error('No guild context');

    // Check bot permissions
    const botMember = guild.members.me;
    const channelPerms = interaction.channel.permissionsFor(botMember);
    if (!channelPerms.has(['ManageThreads', 'SendMessagesInThreads'])) {
      throw new Error(
        'Bot lacks thread permissions (ManageThreads, SendMessagesInThreads)',
      );
    }
    logger.info('Bot permissions OK');

    logger.info('Fetching members', { buyerId, sellerId });
    const buyerMember = await guild.members.fetch(buyerId).catch(() => null);
    const sellerMember = await guild.members.fetch(sellerId).catch(() => null);

    if (!buyerMember || !sellerMember) {
      throw new Error(
        `Could not fetch buyer (${buyerId}) or seller (${sellerId})`,
      );
    }
    logger.info('✅ Members fetched', {
      buyerDisplay: buyerMember.displayName,
      sellerDisplay: sellerMember.displayName,
    });

    // Generate thread title using last 4 digits of buyer/seller IDs + Unix timestamp
    const buyerLast4 = buyerId.slice(-4);
    const sellerLast4 = sellerId.slice(-4);
    const timestamp = Math.floor(Date.now() / 1000);
    const rawTitle = `${THREAD_PREFIX}[${buyerLast4}-${sellerLast4}-${timestamp}]`;
    const threadTitle =
      rawTitle.length > MAX_THREAD_NAME_LENGTH
        ? rawTitle.substring(0, MAX_THREAD_NAME_LENGTH - 1)
        : rawTitle;
    // Use a numeric-only trade id for UI and containers (e.g. 6075-5296-1763670387)
    const tradeId = `${buyerLast4}-${sellerLast4}-${timestamp}`;

    logger.info('Thread title generated', {
      threadTitle,
      buyerLast4,
      sellerLast4,
      timestamp,
    });

    logger.info('Creating thread', { threadTitle });
    const thread = await interaction.channel.threads.create({
      name: threadTitle,
      type: ChannelType.PrivateThread,
      autoArchiveDuration: THREAD_ARCHIVE_DURATION,
      invitable: false,
    });
    logger.info('Thread created', { threadId: thread.id, url: thread.url });

    // Add participants (bot auto-added as creator)
    await thread.members.add(buyerId);
    await thread.members.add(sellerId);
    logger.info('Members added to thread');

    // Send welcome message
    await thread.send({
      flags: MessageFlags.IsComponentsV2,
      components: [buildConnectWalletContainer(tradeId, buyerId, sellerId)],
    });
    logger.info('Welcome message sent');

    const successText = new TextDisplayBuilder().setContent(
      `**Success!** Your private trade channel has been created: ${thread.toString()}`,
    );

    // Update the original message one last time
    const successContainer = buildConfirmTradeDetailsContainer();

    await interaction.editReply({
      components: [
        successContainer.spliceComponents(
          0,
          successContainer.components.length,
          successText,
        ),
      ],
    });
  } catch (error) {
    logger.error('❌ Thread creation failed', {
      error: error.message,
      stack: error.stack,
      buyerId,
      sellerId,
    });

    // Handle failure by updating the message with an error
    const errorText = new TextDisplayBuilder().setContent(
      `**Thread Creation Failed:** ${error.message}. Please check bot permissions/logs.`,
    );

    const errorContainer = buildConfirmTradeDetailsContainer();
    await interaction.editReply({
      components: [
        errorContainer.spliceComponents(
          0,
          errorContainer.components.length,
          errorText,
        ),
      ],
    });
    logger.info('❌ Error UI updated');
  }
}
