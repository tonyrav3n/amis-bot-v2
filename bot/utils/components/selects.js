import {
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

import { logger } from '../logger.js';

/**
 * Builds a single-select menu for choosing the counterparty.
 *
 * @returns {import('discord.js').UserSelectMenuBuilder} Configured user select menu.
 */
export function buildCounterpartySelect() {
  logger.debug('Building counterparty select menu');
  return new UserSelectMenuBuilder()
    .setCustomId('counterparty_select')
    .setPlaceholder('Select the user you are trading with...')
    .setMinValues(1)
    .setMaxValues(1);
}

/**
 * Builds the buyer/seller role select menu.
 *
 * @returns {import('discord.js').StringSelectMenuBuilder} Configured role select menu.
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
