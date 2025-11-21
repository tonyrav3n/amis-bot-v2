/**
 * Button Component Builder - Discord UI Button Creation System
 *
 * Provides functions to create standardized Discord buttons with consistent
 * styling, logging, and integration with the bot's interaction handlers.
 * All buttons follow the Components V2 architecture for modern Discord interfaces.
 *
 * Features:
 * - Verification button for user role assignment
 * - Trade creation button for initiating trade flows
 * - Thread management buttons for trade negotiations
 * - Consistent styling and error handling
 * - Comprehensive logging for audit trails
 *
 * Security:
 * - Proper customId naming for interaction routing
 * - Appropriate button styles for different actions
 * - Integration with permission validation systems
 *
 * @module utils/components/buttons
 * @author amis Bot Team
 * @version 2.0.0
 * @since 1.0.0
 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

import { logger } from '../logger.js';

/**
 * Build a verification button for new users with comprehensive logging
 *
 * Creates a success-styled button that assigns the verified role when clicked.
 * This button is used in the /verify_setup command to create verification stations
 * where new users can self-assign the verified role for full server access.
 *
 * Button Configuration:
 * - Style: ButtonStyle.Success (green)
 * - Label: "✅ Verify"
 * - CustomId: "verify_assign_role_btn"
 * - Purpose: User verification and role assignment
 *
 * Integration:
 * - Routes to handleVerifyButton() in buttonsHandler.js
 * - Validates guild context and role existence
 * - Provides user feedback on success/failure
 *
 * @function buildVerifyButton
 * @returns {ActionRowBuilder} Action row containing the verify button
 *
 * @example
 * const button = buildVerifyButton();
 * await interaction.reply({
 *   content: "Welcome! Click below to verify:",
 *   components: [button]
 * });
 *
 * @example
 * // In verification station
 * await channel.send({
 *   content: "Click to get verified and access the server:",
 *   components: [buildVerifyButton()]
 * });
 */
export function buildVerifyButton() {
  logger.debug('🔘 Building verify button');
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_assign_role_btn')
      .setLabel('Verify')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
  );
}

/**
 * Build a create trade button for initiating trade creation flows
 *
 * Creates a primary button that starts the trade creation process by showing
 * a modal for trade details input. This streamlined approach replaces the
 * previous multi-step button flow with a single modal interface.
 *
 * Button Configuration:
 * - Style: ButtonStyle.Primary (blurple)
 * - Label: "Create Trade"
 * - CustomId: "create_trade_flow_btn"
 * - Purpose: Initiate trade creation modal
 *
 * Integration:
 * - Routes to handleCreateTradeButton() in buttonsHandler.js
 * - Shows trade details modal (Components V2)
 * - Collects item, price, counterparty, and role information
 *
 * Benefits:
 * - Single interaction point reduces user friction
 * - Structured data collection through modal
 * - Better validation and error handling
 * - Consistent user experience
 *
 * @function buildTradeButton
 * @returns {ActionRowBuilder} Action row containing the create trade button
 *
 * @example
 * const button = buildTradeButton();
 * await interaction.reply({
 *   content: "Ready to trade?",
 *   components: [button]
 * });
 *
 * @example
 * // In trade station
 * await channel.send({
 *   content: "Start a secure trade with another member:",
 *   components: [buildTradeButton()]
 * });
 */

export function buildTradeButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_trade_flow_btn')
      .setLabel('Start a New Trade')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Success),
  );
}

export function buildCreateThreadButtonsRow(buyerId, sellerId) {
  logger.debug('Building create thread buttons', { buyerId, sellerId });
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`create_thread:${buyerId}:${sellerId}`)
      .setLabel('Confirm Trade')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`cancel_trade`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger),
  );
}

export function buildConnectWalletButton(url) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      // .setCustomId(`connect_wallet`)
      .setLabel('Connect Wallet')
      .setStyle(ButtonStyle.Link)
      .setURL(url),
  );
}
