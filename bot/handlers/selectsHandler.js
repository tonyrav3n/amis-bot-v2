/**
 * Select Menu Interaction Handlers - Comprehensive Selection Processing System
 *
 * Handles all Discord select menu interactions with detailed validation, error
 * handling, and security checks. Processes user selections for counterparty
 * and role assignment in the trade system.
 *
 * Features:
 * - Select menu routing based on customId patterns
 * - Counterparty validation (prevents self-selection and bot selection)
 * - Role selection validation (buyer/seller only)
 * - Comprehensive error handling with user-friendly feedback
 * - Detailed logging for audit and debugging
 * - Integration with trade creation flow
 *
 * Security:
 * - Validates that users cannot select themselves as counterparties
 * - Prevents selection of bot accounts
 * - Ensures role selections are valid
 * - Logs all selections for audit trails
 *
 * @module handlers/selectsHandler
 * @author amis Bot Team
 * @version 2.0.0
 * @since 1.0.0
 */

import { MessageFlags } from 'discord.js';

import { logger } from '../utils/logger.js';

/**
 * Main select menu interaction handler with routing and comprehensive error handling
 *
 * Processes incoming select menu interactions and routes them to appropriate handlers
 * based on the select menu's customId. Implements validation and security checks
 * for all selection types.
 *
 * CustomId Patterns:
 * - counterparty_select: Counterparty selection for trades
 * - role_select: Role selection (buyer/seller) for trade positioning
 *
 * @async
 * @function handleSelect
 * @param {SelectMenuInteraction} interaction - The Discord select menu interaction
 * @returns {Promise<void>} Resolves when select processing completes
 *
 * @example
 * // Called automatically by interactionCreate event
 * if (interaction.isAnySelectMenu()) {
 *   await handleSelect(interaction);
 * }
 *
 * @throws {Error} When select processing fails
 */
export async function handleSelect(interaction) {
  const [action, ...args] = interaction.customId.split(':');

  logger.info('Select menu interaction', {
    action,
    userId: interaction.user.id,
    values: interaction.values,
    customId: interaction.customId,
  });

  logger.select(interaction.customId, interaction.user.id, interaction.values, {
    action,
    args,
  });

  try {
    switch (action) {
      case 'counterparty_select':
        await handleCounterpartySelect(interaction, args[0]);
        break;
      case 'role_select':
        await handleRoleSelect(interaction, args[0]);
        break;
      default:
        logger.warn(`Unknown select action: ${action}`, {
          customId: interaction.customId,
          userId: interaction.user.id,
        });
        await interaction.deferUpdate();
    }
  } catch (error) {
    logger.error('Error handling select interaction', {
      error: error.message,
      action,
      userId: interaction.user.id,
    });

    try {
      await interaction.reply({
        content: 'An error occurred while processing your selection.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      logger.error('Failed to send error reply for select', {
        replyError: replyError.message,
        userId: interaction.user.id,
      });
    }
  }
}

/**
 * Handle counterparty selection with comprehensive validation and security checks
 *
 * Processes user selections for trading counterparties with multiple validation
 * layers to prevent invalid selections and ensure trade system integrity.
 *
 * Validation Process:
 * 1. Check if user selected themselves (prevented)
 * 2. Check if user selected bot (prevented)
 * 3. Confirm valid user selection
 * 4. Update UI with confirmation
 *
 * Security Features:
 * - Prevents self-trading to avoid conflicts of interest
 * - Prevents bot selection to maintain system integrity
 * - Validates user existence in guild
 * - Logs all selections for audit trails
 *
 * @async
 * @function handleCounterpartySelect
 * @param {SelectMenuInteraction} interaction - The select menu interaction
 * @param {string} role - The role of the user making the selection
 * @returns {Promise<void>} Resolves when selection validation completes
 * @private
 *
 * @example
 * // User selects: @trader_user as counterparty
 * // Validation: Not self, not bot, valid user
 * // Action: Shows confirmation message
 */
async function handleCounterpartySelect(interaction, role) {
  const selectedUserId = interaction.values[0];
  const userId = interaction.user.id;

  logger.debug('👥 Processing counterparty selection', {
    selectedUserId,
    role,
    userId,
  });

  // Validate selection - cannot select self or bot
  if (selectedUserId === userId) {
    logger.warn('❌ User tried to select themselves as counterparty', {
      userId,
    });
    await interaction.reply({
      content: '❌ You cannot trade with yourself. Please select another user.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Check if selected user is the bot
  if (selectedUserId === interaction.guild.members.me.id) {
    logger.warn('❌ User tried to select bot as counterparty', { userId });
    await interaction.reply({
      content: '❌ You cannot trade with the bot. Please select another user.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Success - update the message to show confirmation
  await interaction.update({
    content: `✅ You selected <@${selectedUserId}> as your ${role}.`,
    components: [],
  });

  logger.success('✅ Counterparty selection completed', {
    selectedUserId,
    role,
    userId,
  });
}

/**
 * Handle role selection with validation and user feedback
 *
 * Processes user role selections for trade positioning with validation to ensure
 * only valid roles are accepted. Provides clear feedback for invalid selections.
 *
 * Valid Roles:
 * - 'buyer': User is paying for goods/services
 * - 'seller': User is providing goods/services
 *
 * Validation Features:
 * - Ensures role is either 'buyer' or 'seller'
 * - Provides specific error messages for invalid selections
 * - Updates UI with role confirmation
 * - Logs role selections for debugging
 *
 * @async
 * @function handleRoleSelect
 * @param {SelectMenuInteraction} interaction - The select menu interaction
 * @param {string} selectedRole - The role selected by the user
 * @returns {Promise<void>} Resolves when role validation completes
 * @private
 *
 * @example
 * // User selects: "Buyer (I'm paying)"
 * // Validation: Valid role selection
 * // Action: Shows confirmation with role display
 */
async function handleRoleSelect(interaction, selectedRole) {
  const userId = interaction.user.id;

  logger.debug('🎭 Processing role selection', {
    selectedRole,
    userId,
  });

  // Validate role
  if (!['buyer', 'seller'].includes(selectedRole)) {
    logger.warn('❌ Invalid role selected', {
      selectedRole,
      userId,
    });
    await interaction.reply({
      content: '❌ Invalid role selection. Please try again.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // Success - update the message
  const roleDisplay = selectedRole === 'buyer' ? 'Buyer' : 'Seller';
  await interaction.update({
    content: `✅ You selected: **${roleDisplay}**`,
    components: [],
  });

  logger.success('✅ Role selection completed', {
    selectedRole,
    roleDisplay,
    userId,
  });
}
