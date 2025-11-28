import { MessageFlags } from 'discord.js';

import { logger } from '../utils/logger.js';

/**
 * Routes select menu interactions to their handler based on custom ID.
 *
 * @param {import('discord.js').AnySelectMenuInteraction} interaction - The select menu interaction.
 * @returns {Promise<void>}
 */
export async function handleSelect(interaction) {
  const [action] = interaction.customId.split(':');

  try {
    switch (action) {
      default:
        logger.warn(`Unknown select action: ${action}`);
        await interaction.deferUpdate();
    }
  } catch (error) {
    logger.error('Error handling select interaction:', error);

    try {
      await interaction.reply({
        content: 'An error occurred while processing your selection.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      logger.error('Failed to send error reply for select:', replyError);
    }
  }
}
