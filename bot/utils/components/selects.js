import {
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

import { logger } from '../logger.js';

/**
 * Build a user select menu for choosing a trading counterparty
 *
 * Creates a Discord user select menu that allows users to choose another member
 * for trading. The selection is validated to prevent self-selection and bot
 * selection, ensuring trade system integrity.
 *
 * Select Menu Configuration:
 * - CustomId: "counterparty_select"
 * - Placeholder: "Select the user you are trading with..."
 * - Min/Max Values: 1 (exactly one selection required)
 * - Validation: Prevents self-selection and bot selection
 *
 * Integration:
 * - Routes to handleCounterpartySelect() in selectsHandler.js
 * - Validates user selection before trade creation
 * - Provides user feedback for invalid selections
 *
 * @function buildCounterpartySelect
 * @returns {ActionRowBuilder} Action row containing the user select menu
 *
 * @example
 * // In trade flow after role selection
 * const selectMenu = buildCounterpartySelect();
 * await interaction.update({
 *   content: "Who are you trading with?",
 *   components: [selectMenu]
 * });
 *
 * @example
 * // For buyer role
 * await interaction.reply({
 *   content: "Select the seller for your trade:",
 *   components: [buildCounterpartySelect()]
 * });
 */
export function buildCounterpartySelect() {
  logger.debug('Building counterparty select menu');
  return new UserSelectMenuBuilder()
    .setCustomId(`counterparty_select`)
    .setPlaceholder('Select the user you are trading with...')
    .setMinValues(1)
    .setMaxValues(1);
}

/**
 * Build a role selection menu for trade positioning
 *
 * Creates a string select menu that allows users to choose their role in a trade
 * transaction. Users can select either 'buyer' (paying party) or 'seller'
 * (providing party) to establish their position in the trade relationship.
 *
 * Select Menu Configuration:
 * - CustomId: "role_opt"
 * - Placeholder: "Select your role..."
 * - Options:
 *   - "💸 Buyer (I'm paying)" → value: "buyer"
 *   - "📦 Seller (I'm providing the item)" → value: "seller"
 *
 * Integration:
 * - Routes to handleRoleSelect() in selectsHandler.js
 * - Determines trade relationship (buyer/seller dynamics)
 * - Used in trade creation flow after counterparty selection
 *
 * @function buildRoleSelectionSelect
 * @returns {ActionRowBuilder} Action row containing the role select menu
 *
 * @example
 * // In trade creation flow
 * const roleMenu = buildRoleSelectionSelect();
 * await interaction.reply({
 *   content: "What is your role in this trade?",
 *   components: [roleMenu]
 * });
 *
 * @example
 * // After counterparty selection
 * await interaction.update({
 *   content: "Choose your position:",
 *   components: [buildRoleSelectionSelect()]
 * });
 */

export function buildRoleSelectionSelect() {
  logger.debug('Building role selection menu');
  return new StringSelectMenuBuilder()
    .setCustomId('role_opt')
    .setPlaceholder('Select your role...')
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel(`💸 Buyer (I'm paying)`)
        .setValue('buyer'),
      new StringSelectMenuOptionBuilder()
        .setLabel(`📦 Seller (I'm providing the item)`)
        .setValue('seller'),
    );
}
