import {
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

export function buildCounterpartySelect() {
  return new UserSelectMenuBuilder()
    .setCustomId(`counterparty_select`)
    .setPlaceholder('Select the user you are trading with...')
    .setMinValues(1)
    .setMaxValues(1);
}

export function buildRoleSelectionSelect() {
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
