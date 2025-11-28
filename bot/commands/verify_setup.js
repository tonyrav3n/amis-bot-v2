import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  MessageFlags,
} from 'discord.js';

import { buildVerifyContainer } from '../utils/components/containers.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('verify_setup')
  .setDescription(`Post 'Verify' container`)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts([InteractionContextType.Guild]);

/**
 * Sends the verification container to the invoking channel.
 *
 * @param {import('discord.js').ChatInputCommandInteraction} interaction - The slash command interaction.
 * @returns {Promise<void>} Resolves when the response is sent.
 */
export async function execute(interaction) {
  try {
    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [buildVerifyContainer()],
    });
  } catch (error) {
    logger.error('Failed to send verification setup message', error);
    await interaction.editReply({
      content: `❌ Failed to create verification station. Please check bot permissions and try again.`,
    });
  }
}
