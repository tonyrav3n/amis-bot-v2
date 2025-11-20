/**
 * Verify Setup Command - Admin Interface for User Verification
 *
 * Admin-only slash command that creates a public verification station with a button.
 * New users click the button to receive the verified role and gain full server access.
 *
 * Features:
 * - Creates a styled container with welcome message and verification button
 * - Uses Components V2 for modern Discord interface
 * - Fully logged for audit and debugging purposes
 * - Error handling with user-friendly feedback
 *
 * Configuration:
 * - Role ID is configured via VERIFIED_ROLE_ID environment variable
 * - Button appearance and message are customizable via theme constants
 *
 * Security:
 * - Admin-only permissions prevent user abuse
 * - Role assignment is logged for audit trails
 * - Error handling prevents privilege escalation
 *
 * @module commands/verify_setup
 * @author amis Bot Team
 * @version 2.0.0
 * @since 1.0.0
 *
 * @example
 * // Admin types: /verify_setup
 * // Bot creates: Verification station with button
 * // Users click: Receive verified role automatically
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
  MessageFlags,
} from 'discord.js';

import { buildVerifyContainer } from '../utils/components/containers.js';
import { logger } from '../utils/logger.js';

/**
 * Slash command data definition
 * Configures the /verify_setup command with admin-only permissions
 */
export const data = new SlashCommandBuilder()
  .setName('verify_setup')
  .setDescription(`Post 'Verify' container`)
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts([InteractionContextType.Guild]);

/**
 * Execute the verify_setup command
 *
 * Sends a public message with an embed explaining the verification process
 * and a button that users can click to get verified and access the server.
 *
 * @param {ChatInputCommandInteraction} interaction - The slash command interaction
 * @returns {Promise<void>}
 *
 * @example
 * // Admin types: /verify_setup
 * // Bot sends: Embed with "Verify Me" button
 * // New users click button to get verified role
 */
/**
 * Execute the verify_setup command with comprehensive logging and error handling
 *
 * Creates a verification station that allows new users to self-assign the verified role.
 * The command is admin-only and creates a persistent message with a verification button.
 *
 * @async
 * @function execute
 * @param {ChatInputCommandInteraction} interaction - The slash command interaction
 * @returns {Promise<void>} Resolves when the verification station is created
 *
 * @throws {Error} When message creation fails (permissions, rate limits, etc.)
 *
 * @example
 * // Admin uses: /verify_setup
 * // Result: Creates verification container in current channel
 * // UI: Shows welcome message with "✅ Verify" button
 * // Action: Users click button to get verified role
 */
export async function execute(interaction) {
  // Command Execution Logging
  logger.info('Command /verify_setup executed', {
    userId: interaction.user.id,
    guildId: interaction.guild.id,
    guildName: interaction.guild.name,
    channelId: interaction.channel.id,
    channelName: interaction.channel.name,
  });

  try {
    // Create verification station with Components V2
    logger.debug('Creating verification station', {
      guildName: interaction.guild.name,
      componentsV2: true,
    });

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [buildVerifyContainer()],
    });

    // Success logging
    logger.success('Verification setup message sent successfully', {
      guildName: interaction.guild.name,
      guildId: interaction.guild.id,
      channelId: interaction.channel.id,
      channelName: interaction.channel.name,
    });
  } catch (error) {
    // Error handling with comprehensive logging
    logger.error('Failed to send verification setup message', {
      error: error.message,
      errorCode: error.code,
      stack: error.stack,
      guildName: interaction.guild.name,
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      channelId: interaction.channel.id,
    });

    // 💬 Inform admin of failure
    await interaction.editReply({
      content: `❌ Failed to create verification station. Please check bot permissions and try again.`,
    });

    // 🚨 Re-throw for potential further handling
    throw error;
  }
}
