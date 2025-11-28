import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  MessageFlags,
} from 'discord.js';

import { buildTradeContainer } from '../utils/components/containers.js';

export const data = new SlashCommandBuilder()
  .setName('create_trade_setup')
  .setDescription(`Post 'Create Trade' container`)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts([InteractionContextType.Guild]);

/**
 * Sends the trade creation container to the invoking channel.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - The slash command interaction.
 * @returns {Promise<void>} Resolves when the response is sent.
 */
export async function execute(interaction) {
  await interaction.reply({
    flags: MessageFlags.IsComponentsV2,
    components: [buildTradeContainer()],
  });
}
