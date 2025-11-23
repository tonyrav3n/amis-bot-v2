import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  MessageFlags,
} from 'discord.js';

import { buildTradeContainer } from '../utils/components/containers.js';

/** Slash command data definition. */
export const data = new SlashCommandBuilder()
  .setName('create_trade_setup')
  .setDescription(`Post 'Create Trade' container`)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts([InteractionContextType.Guild]);

/** Execute the create_trade command. */
export async function execute(interaction) {
  await interaction.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [buildTradeContainer()],
  });
}
