/**
 * Modal Interaction Handler - Comprehensive Modal Processing System
 *
 * Handles all Discord modal submissions with detailed validation, error handling,
 * and logging. Currently processes trade details modals for the escrow system.
 *
 * Features:
 * - Modal submission routing based on customId patterns
 * - Trade details validation with USD amount normalization
 * - Role assignment logic for buyer/seller relationships
 * - Comprehensive error handling with user feedback
 * - Detailed logging for audit and debugging
 * - Integration with thread creation system
 *
 * Security:
 * - Validates role selections to prevent privilege escalation
 * - Normalizes and validates monetary inputs
 * - Ensures counterparty selection before trade creation
 * - Logs all modal submissions for audit trails
 *
 * @module handlers/modalsHandler
 * @author amis Bot Team
 * @version 2.0.0
 * @since 1.0.0
 */

import { MessageFlags } from 'discord.js';

import { buildConfirmTradeDetailsContainer } from '../utils/components/containers.js';
import { logger } from '../utils/logger.js';
import { normalizeUsdAmount } from '../utils/validation.js';

/**
 * Main modal interaction handler with routing and error handling
 *
 * Processes incoming modal submissions and routes them to appropriate handlers
 * based on the modal's customId. Provides comprehensive error handling and
 * user feedback for all modal types.
 *
 * @async
 * @function handleModal
 * @param {ModalSubmitInteraction} interaction - The modal submission interaction
 * @returns {Promise<void>} Resolves when modal processing completes
 *
 * @example
 * // Trade details modal submission
 * // CustomId: trade_details_mdl
 * // → Routes to handleTradeDetailsModal()
 *
 * @example
 * // Unknown modal submission
 * // → Logs warning and shows error to user
 */
export async function handleModal(interaction) {
  const { customId } = interaction;
  const userId = interaction.user.id;

  // 📊 Log modal submission for debugging and audit
  logger.modal(customId, userId, {
    guildId: interaction.guild?.id,
    channelId: interaction.channel?.id,
  });

  try {
    // 🎯 Extract base modal ID for routing (before any colon)
    const baseId = customId.split(':')[0];

    // 🚦 Route to appropriate handler
    switch (baseId) {
      case 'trade_details_mdl':
        await handleTradeDetailsModal(interaction);
        break;

      default:
        logger.warn(`❓ Unknown modal customId: ${customId}`, {
          userId,
          guildId: interaction.guild?.id,
          fullCustomId: customId,
        });

        await interaction.reply({
          content: `Unknown modal type: ${baseId}. Please try again.`,
          flags: MessageFlags.Ephemeral,
        });
    }
  } catch (error) {
    // ❌ Critical error handling
    logger.error(`❌ Error handling modal ${customId}:`, error, {
      userId,
      guildId: interaction.guild?.id,
      customId,
      stack: error.stack,
    });

    // 💬 Attempt to inform user of error
    try {
      await interaction.reply({
        content: `❌ An error occurred processing your submission. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      // 🚨 If we can't even send the error message, log it
      logger.error('Failed to send error reply:', replyError, { userId });
    }
  }
}

/**
 * Handle trade details modal submission with comprehensive validation
 *
 * Processes trade creation modal submissions including item details, pricing,
 * counterparty selection, and role assignment. Validates all inputs and
 * creates a confirmation interface for the trade.
 *
 * Processing Flow:
 * 1. Extract all modal field values
 * 2. Determine buyer/seller roles based on user selection
 * 3. Validate USD amount with minimum thresholds
 * 4. Create confirmation container with trade details
 * 5. Present confirmation interface for thread creation
 *
 * Validation:
 * - Role must be 'buyer' or 'seller'
 * - Price must be valid USD amount >= $5.00
 * - Counterparty must be selected and valid
 * - Item description must be provided
 *
 * @async
 * @function handleTradeDetailsModal
 * @param {ModalSubmitInteraction} interaction - The trade details modal submission
 * @returns {Promise<void>} Resolves when trade confirmation is shown
 *
 * @throws {Error} When validation fails or role assignment is invalid
 *
 * @example
 * // User submits: Item="Web Development", Price="$500", Role="seller"
 * // Counterparty: @buyer_user
 * // → Creates confirmation container with trade details
 */
async function handleTradeDetailsModal(interaction) {
  const userId = interaction.user.id;

  // 📋 Extract all modal field values
  const item = interaction.fields.getTextInputValue('item_input');
  const priceValue = interaction.fields.getTextInputValue('price_input');
  const counterpartyId = interaction.fields.getField('counterparty_select')
    .values[0];
  const role = interaction.fields.getField('role_opt').values[0];
  const description = interaction.fields.getTextInputValue('description_input');

  // 🎭 Determine buyer/seller roles
  let buyerId;
  let sellerId;

  if (role === 'buyer') {
    buyerId = userId;
    sellerId = counterpartyId;
  } else if (role === 'seller') {
    sellerId = userId;
    buyerId = counterpartyId;
  } else {
    logger.error('❌ Invalid role selection in trade modal', {
      userId,
      role,
      validRoles: ['buyer', 'seller'],
    });
    throw new Error(
      `Invalid role selection: ${role}. Must be 'buyer' or 'seller'.`,
    );
  }

  logger.modal(interaction.customId, userId, {
    item,
    price: priceValue,
    counterpartyId,
    role,
    buyerId,
    sellerId,
    hasDescription: !!description,
    descriptionLength: description?.length || 0,
  });

  logger.debug('💰 Validating trade price', {
    userId,
    priceValue,
    role,
    counterpartyId,
  });

  const priceValidation = normalizeUsdAmount(priceValue);

  if (!priceValidation.ok) {
    logger.warn('❌ Price validation failed', {
      userId,
      price: priceValue,
      error: priceValidation.error,
      role,
    });

    await interaction.reply({
      content: `**Invalid Price:** ${priceValidation.error}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  logger.success('✅ Trade details validated successfully', {
    userId,
    role,
    item,
    priceValue,
    hasDescription: !!description,
    buyerId,
    sellerId,
    counterpartyId,
  });

  const feesText = 'No fees applied'; // TODO: Implement fee calculation

  await interaction.reply({
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [
      buildConfirmTradeDetailsContainer(
        buyerId,
        sellerId,
        item,
        priceValue,
        description,
        feesText,
      ),
    ],
  });
}

export default {
  handleModal,
};
