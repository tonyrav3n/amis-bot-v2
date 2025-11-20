import {
  ChannelType,
  MessageFlags,
  SlashCommandBuilder,
  PermissionFlagsBits,
  InteractionContextType,
} from 'discord.js';

import {
  buildSayDmContainer,
  buildSayContainerContainer,
} from '../utils/components/containers.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('say')
  .setDescription('Send messages or embeds to channels or DMs')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setContexts([InteractionContextType.Guild])

  // /say message
  .addSubcommand((sub) =>
    sub
      .setName('message')
      .setDescription('Sends message to specified channel')
      .addChannelOption((opt) =>
        opt
          .setName('channel')
          .setDescription('What channel should I send this message to?')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('message')
          .setDescription('Input message content')
          .setRequired(true),
      ),
  )

  // /say container
  .addSubcommand((sub) =>
    sub
      .setName('container')
      .setDescription('Sends container message to specified channel')
      .addChannelOption((opt) =>
        opt
          .setName('channel')
          .setDescription(
            'What channel should I send this container message to?',
          )
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('message')
          .setDescription('Input message content')
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName('header').setDescription('Input header content'),
      )
      .addStringOption((opt) =>
        opt
          .setName('color')
          .setDescription('Select colour (Default: Green)')
          .addChoices(
            { name: '🔴 Red', value: 'red' },
            { name: '🟢 Green', value: 'green' },
            { name: '🔵 Blue', value: 'blue' },
            { name: '🟡 Yellow', value: 'yellow' },
          ),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('include_thumbnail')
          .setDescription('Include logo thumbnail in the container'),
      )
      .addBooleanOption((opt) =>
        opt
          .setName('include_banner')
          .setDescription('Include banner image in the container'),
      ),
  )

  // /say dm
  .addSubcommand((sub) =>
    sub
      .setName('dm')
      .setDescription('Sends a direct message to specified member')
      .addUserOption((opt) =>
        opt
          .setName('member')
          .setDescription('Which member should I send direct message to?')
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt
          .setName('message')
          .setDescription('Input message content')
          .setRequired(true),
      )
      .addStringOption((opt) =>
        opt.setName('title').setDescription('Input title'),
      ),
  );

/**
 * Execute the say command with comprehensive logging and error handling
 *
 * Handles three subcommands for different messaging needs:
 * 1. message: Plain text channel messages
 * 2. container: Styled container messages (Components V2)
 * 3. dm: Direct messages to users
 *
 * @async
 * @function execute
 * @param {ChatInputCommandInteraction} interaction - The slash command interaction
 * @returns {Promise<void>} Resolves when the command completes
 *
 * @example
 * // Admin uses: /say message channel:#announcements message:"Hello everyone!"
 * // Bot sends: "Hello everyone!" to #announcements
 * // Admin sees: "Message sent to #announcements successfully!"
 *
 * @example
 * // Admin uses: /say container channel:#announcements message:"Welcome!" header:"Server News" color:green
 * // Bot sends: Styled container to #announcements
 * // Admin sees: "Message sent to #announcements successfully!"
 *
 * @example
 * // Admin uses: /say dm member:@User message:"Hi there!" title:"Private Message"
 * // Bot sends: DM to @User
 * // Admin sees: "Message sent to @User successfully!" (or error if DMs disabled)
 */
export async function execute(interaction) {
  logger.info('Command /say executed', {
    userId: interaction.user.id,
    guildId: interaction.guild.id,
    guildName: interaction.guild.name,
  });

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const sub = interaction.options.getSubcommand(true);
  logger.debug(`Subcommand: ${sub}`, {
    userId: interaction.user.id,
    subcommand: sub,
  });

  try {
    if (sub === 'message') {
      const channel = interaction.options.getChannel('channel', true);
      const msgContent = interaction.options.getString('message', true);

      logger.debug('Sending message', {
        channel: channel.name,
        channelId: channel.id,
        content: `${msgContent.substring(0, 50)}${msgContent.length > 50 ? '...' : ''}`,
        contentLength: msgContent.length,
      });

      const sent = await channel.send({ content: msgContent });

      logger.success('Message sent successfully', {
        channel: channel.name,
        channelId: channel.id,
        messageId: sent.id,
        messageUrl: sent.url,
      });

      // Confirm success to admin
      return interaction.editReply({
        content: `Message sent to ${channel} successfully! Link: ${sent.url}`,
      });
    }

    if (sub === 'container') {
      const channel = interaction.options.getChannel('channel', true);
      const msgContent = interaction.options.getString('message', true);
      const header = interaction.options.getString('header') || undefined;
      const colorKey = interaction.options.getString('color') || 'green';
      const includeThumb =
        interaction.options.getBoolean('include_thumbnail') ?? false;
      const includeBanner =
        interaction.options.getBoolean('include_banner') ?? false;

      logger.debug('Sending container (Components V2)', {
        channel: channel.name,
        channelId: channel.id,
        header,
        color: colorKey,
        includeThumb,
        includeBanner,
        contentPreview: `${msgContent.substring(0, 50)}${msgContent.length > 50 ? '...' : ''}`,
      });

      const container = buildSayContainerContainer(msgContent, {
        header,
        colorKey,
        includeThumb,
        includeBanner,
      });

      const sent = await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

      logger.success('Container sent successfully', {
        channel: channel.name,
        channelId: channel.id,
        messageId: sent.id,
        messageUrl: sent.url,
        componentsV2: true,
      });

      return interaction.reply({
        content: `Message sent to ${channel} successfully! Link: ${sent.url}`,
      });
    }

    if (sub === 'dm') {
      const member = interaction.options.getMember('member');
      const user = member?.user ?? interaction.options.getUser('member', true);
      const msgContent = interaction.options.getString('message', true);
      const msgTitle = interaction.options.getString('title');
      const embedTitle = `Message from ${interaction.guild.name}`;
      const thumbnail = interaction.guild.iconURL() ?? null;

      logger.debug('Sending DM', {
        targetUser: user.tag,
        targetUserId: user.id,
        guildName: interaction.guild.name,
        title: msgTitle,
        contentPreview: `${msgContent.substring(0, 50)}${msgContent.length > 50 ? '...' : ''}`,
      });

      // 🏗️ Build DM embed
      const container = buildSayDmContainer(
        msgContent,
        msgTitle,
        embedTitle,
        thumbnail,
      );

      try {
        // 🚀 Send DM to user
        await user.send({
          flags: MessageFlags.IsComponentsV2,
          components: [container],
        });

        logger.success('DM sent successfully', {
          targetUser: user.tag,
          targetUserId: user.id,
        });

        // ✅ Confirm success to admin
        return interaction.editReply({
          content: `Message sent to ${user} successfully!`,
        });
      } catch (error) {
        // ❌ Handle DM sending errors
        logger.error('Failed to send DM', {
          targetUser: user.tag,
          targetUserId: user.id,
          error: error.message,
          errorCode: error.code,
        });

        // 🛡️ Handle Discord's "Cannot send messages to this user" error
        if (error.code === 50007) {
          return interaction.editReply({
            content: `Cannot send DM to ${user} as their DMs are disabled.`,
          });
        }

        // 🚨 Re-throw other errors for general error handler
        throw error;
      }
    }
  } catch (err) {
    logger.error(`Error in /say ${sub}:`, err, {
      userId: interaction.user.id,
      guildId: interaction.guild.id,
      subcommand: sub,
    });

    return interaction.editReply({
      content: 'An error occurred while sending the message.',
    });
  }
}
