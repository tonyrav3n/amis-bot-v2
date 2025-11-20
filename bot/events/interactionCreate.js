/**
 * InteractionCreate Event Handler - Main Interaction Router
 *
 * Central event handler that processes all Discord interactions with comprehensive
 * logging, error handling, and routing to specialized handlers. Acts as the main
 * dispatcher for the bot's interactive functionality.
 *
 * Features:
 * - Slash command execution with error isolation
 * - Button interaction routing with detailed logging
 * - Select menu handling with validation
 * - Modal submission processing
 * - Comprehensive error handling and recovery
 * - Debug mode support for detailed interaction tracking
 *
 * Security:
 * - Validates command existence before execution
 * - Isolates errors to prevent cascading failures
 * - Logs all interactions for audit trails
 *
 * @module events/interactionCreate
 * @author amis Bot Team
 * @version 2.0.0
 * @since 1.0.0
 */

import { handleButton } from '../handlers/buttonsHandler.js';
import { handleModal } from '../handlers/modalsHandler.js';
import { handleSelect } from '../handlers/selectsHandler.js';
import { logger } from '../utils/logger.js';

export const name = 'interactionCreate';
export const once = false;

/**
 * Main execution function for interaction processing
 *
 * Processes incoming Discord interactions and routes them to appropriate handlers
 * based on interaction type. Provides comprehensive error handling and logging
 * for all interaction types.
 *
 * Flow:
 * 1. Validate and route slash commands
 * 2. Handle button clicks with customId parsing
 * 3. Process select menu interactions
 * 4. Handle modal submissions
 *
 * @async
 * @function execute
 * @param {Client} client - The Discord client instance
 * @param {Interaction} interaction - The interaction that was created
 * @returns {Promise<void>} Resolves when interaction processing completes
 */
export async function execute(client, interaction) {
  try {
    // 🗣️ Handle slash commands (e.g., /create_trade, /verify_setup)
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        logger.warn(`Unknown command: ${interaction.commandName}`, {
          userId: interaction.user.id,
          guildId: interaction.guild?.id,
        });
        return;
      }

      logger.command(interaction.commandName, interaction.user.id, {
        guildId: interaction.guild?.id,
        channelId: interaction.channel?.id,
      });

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
      logger.button(interaction.customId, interaction.user.id, {
        guildId: interaction.guild?.id,
        channelId: interaction.channel?.id,
      });
      await handleButton(interaction);
      return;
    }

    if (interaction.isAnySelectMenu()) {
      logger.select(
        interaction.customId,
        interaction.user.id,
        interaction.values,
        {
          guildId: interaction.guild?.id,
          channelId: interaction.channel?.id,
        },
      );
      await handleSelect(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      logger.modal(interaction.customId, interaction.user.id, {
        guildId: interaction.guild?.id,
        channelId: interaction.channel?.id,
        fields: interaction.fields.fields.map((field) => ({
          customId: field.customId,
          value: field.value?.substring(0, 100), // Limit for logging
        })),
      });
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
