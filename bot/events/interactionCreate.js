import { handleButton } from '../handlers/buttonsHandler.js';
import { handleModal } from '../handlers/modalsHandler.js';
import { handleSelect } from '../handlers/selectsHandler.js';
import { logger } from '../utils/logger.js';

export const name = 'interactionCreate';
export const once = false;

/**
 * Routes Discord interactions to appropriate handlers.
 * @param {Client} client - The Discord client instance
 * @param {Interaction} interaction - The interaction that was created
 */
export async function execute(client, interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        logger.warn(`Unknown command: ${interaction.commandName}`, {
          userId: interaction.user.id,
          guildId: interaction.guild?.id,
        });
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error(
          `Error executing command ${interaction.commandName}:`,
          error,
          {
            userId: interaction.user.id,
            guildId: interaction.guild?.id,
            commandName: interaction.commandName,
          },
        );

        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content:
                'An error occurred while executing this command. Please try again.',
              ephemeral: true,
            });
          }
        } catch (replyError) {
          logger.error('Failed to send error reply:', replyError);
        }
      }
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (interaction.isAnySelectMenu()) {
      await handleSelect(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModal(interaction);
      return;
    }

    logger.warn('Unknown interaction type received:', {
      type: interaction.type,
      customId: interaction.customId || 'N/A',
      userId: interaction.user.id,
      guildId: interaction.guild?.id,
    });
  } catch (error) {
    logger.error('Critical error in interaction handler:', error, {
      interactionType: interaction?.type,
      userId: interaction?.user?.id,
      guildId: interaction?.guild?.id,
    });
  }
}
