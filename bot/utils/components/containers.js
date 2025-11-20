/**
 * Container Component Builder - Discord Components V2 Creation System
 *
 * Provides functions to create modern Discord container components with
 * consistent styling, theming, and integration with the bot's interaction
 * handlers. All containers follow the Components V2 architecture for enhanced
 * Discord interfaces with better accessibility and mobile support.
 *
 * Features:
 * - Verification containers for user onboarding
 * - Trade containers for escrow management
 * - Message containers with embed-like styling
 * - Confirmation containers for trade details
 * - Consistent theming and branding
 * - Mobile-responsive design patterns
 *
 * Benefits of Components V2:
 * - Better mobile support and accessibility
 * - More flexible layout options
 * - Enhanced user experience
 * - Future-proof Discord interface standards
 *
 * @module utils/components/containers
 * @author amis Bot Team
 * @version 2.0.0
 * @since 2.0.0
 */

import {
  ContainerBuilder,
  MediaGalleryBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js';

import { COLORS, ASSETS } from '../../config/theme.js';

import {
  buildCreateThreadButtonsRow,
  buildTradeButton,
  buildVerifyButton,
} from './buttons.js';

/**
 * Build a verification container for new user onboarding
 *
 * Creates a complete verification station with welcome message, instructions,
 * and verification button. Uses Components V2 for modern Discord interface
 * with better accessibility and mobile support.
 *
 * Container Structure:
 * - Accent color: VERIFIED_GREEN for brand consistency
 * - Header text: Bold welcome message
 * - Section with instructions and logo thumbnail
 * - Action row with verification button
 *
 * Integration:
 * - Designed for /verify_setup command usage
 * - Pairs with buildVerifyButton() for complete functionality
 * - Handles role assignment through button interaction
 *
 * @function buildVerifyContainer
 * @returns {ContainerBuilder} Complete verification container with button
 *
 * @example
 * // In verification setup command
 * await interaction.reply({
 *   components: [buildVerifyContainer()]
 * });
 *
 * @example
 * // For persistent verification station
 * await channel.send({
 *   content: "New here?",
 *   components: [buildVerifyContainer()]
 * });
 */
export function buildVerifyContainer() {
  return new ContainerBuilder()
    .setAccentColor(COLORS.VERIFIED_GREEN)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('**Welcome to amis.!**'),
    )
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            'Click on the button below to gain access.',
          ),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder({ media: { url: ASSETS.LOGO_URL } }),
        ),
    )
    .addActionRowComponents(buildVerifyButton());
}

/**
 * Build a message container for styled content display (Components V2 replacement for embeds)
 *
 * Creates a modern container with text content, optional header, and branding elements.
 * Designed as a Components V2 replacement for traditional embeds with enhanced styling
 * and better mobile support.
 *
 * Container Features:
 * - Configurable accent color (red, green, blue, yellow)
 * - Optional header with bold formatting
 * - Main content area with flexible text
 * - Optional logo thumbnail and banner image
 * - Footer with amis. branding
 *
 * Styling Options:
 * - Colors: ALERT_RED, VERIFIED_GREEN, BLURPLE, or custom yellow
 * - Header: Optional bold header text
 * - Thumbnail: Optional logo display
 * - Banner: Optional full-width image
 *
 * @function buildSayEmbedContainer
 * @param {string} msgContent - Main message content
 * @param {Object} options - Styling and content options
 * @param {string} [options.header] - Optional header text (bold)
 * @param {string} [options.colorKey='green'] - Color theme ('red', 'green', 'blue', 'yellow')
 * @param {boolean} [options.includeThumb=false] - Include logo thumbnail
 * @param {boolean} [options.includeBanner=false] - Include banner image
 * @returns {ContainerBuilder} Styled container for message display
 *
 * @example
 * // Basic message
 * const container = buildSayEmbedContainer("Welcome to the server!");
 * await channel.send({ components: [container] });
 *
 * @example
 * // Full-featured message
 * const container = buildSayEmbedContainer("Server Announcement", {
 *   header: "Important Notice",
 *   colorKey: 'red',
 *   includeThumb: true,
 *   includeBanner: true
 * });
 * await channel.send({ components: [container] });
 */
export function buildSayContainerContainer(msgContent, options = {}) {
  const {
    header,
    colorKey = 'green',
    includeThumb = false,
    includeBanner = false,
  } = options;

  const colorMap = {
    red: COLORS.ALERT_RED,
    green: COLORS.VERIFIED_GREEN,
    blue: COLORS.BLURPLE,
    yellow: 0xf1c40f,
  };

  let builder = new ContainerBuilder().setAccentColor(colorMap[colorKey]);

  if (header) {
    builder = builder.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${header}**`),
    );
  }

  builder = builder.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(msgContent),
  );

  if (includeThumb) {
    builder = builder.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('\u200B\u200B'),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder({ media: { url: ASSETS.LOGO_URL } }),
        ),
    );
  }

  if (includeBanner) {
    builder = builder.addMediaGalleryComponents(
      new MediaGalleryBuilder({
        items: [
          {
            media: {
              url: ASSETS.BANNER_URL,
            },
          },
        ],
      }),
    );
  }

  return builder;
}

export function buildSayDmContainer(
  msgContent,
  msgTitle,
  embedTitle,
  thumbnail,
) {
  let builder = new ContainerBuilder()
    .setAccentColor(COLORS.VERIFIED_GREEN)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${embedTitle}**`),
    );

  if (msgTitle) {
    builder = builder.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**${msgTitle}**`),
      new TextDisplayBuilder().setContent(msgContent),
    );
  } else {
    builder = builder.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(msgContent),
    );
  }

  if (thumbnail) {
    builder = builder.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('\u200B'))
        .setThumbnailAccessory(
          new ThumbnailBuilder({ media: { url: thumbnail } }),
        ),
    );
  }

  return builder;
}

/**
 * Build a trade creation container for promoting trade services
 *
 * Creates an inviting trade station with header, description, and action button.
 * Designed to encourage users to start secure trades through the bot's escrow system.
 *
 * Container Structure:
 * - Accent color: VERIFIED_GREEN for trust and security
 * - Header: Bold "Start a Secure Trade" message
 * - Description: Detailed explanation of trade benefits
 * - Logo thumbnail for brand consistency
 * - Action row with trade creation button
 *
 * Use Cases:
 * - Persistent trade station in trading channels
 * - Response to /trade_setup commands
 * - General trade promotion in server
 *
 * @function buildTradeContainer
 * @returns {ContainerBuilder} Complete trade promotion container
 *
 * @example
 * // Create trade station
 * await channel.send({
 *   components: [buildTradeContainer()]
 * });
 *
 * @example
 * // In trade setup command
 * await interaction.reply({
 *   content: "Trade Services",
 *   components: [buildTradeContainer()]
 * });
 */
export function buildTradeContainer() {
  return new ContainerBuilder()
    .setAccentColor(COLORS.VERIFIED_GREEN)

    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent('Start a Secure Trade'),
          new TextDisplayBuilder().setContent(
            `Ready to trade? I'll help you create a secure transaction for you and your partner. Click below to begin.`,
          ),
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder({ media: { url: ASSETS.LOGO_URL } }),
        ),
    )
    .addActionRowComponents(buildTradeButton());
}

/**
 * Build a trade confirmation container for final review before thread creation
 *
 * Creates a comprehensive summary of trade details with confirmation buttons.
 * Allows users to review all trade information before committing to thread creation.
 * This is the final step in the trade creation flow.
 *
 * Container Features:
 * - Accent color: VERIFIED_GREEN for security and trust
 * - Header: "Let's Double-Check!" with reassurance text
 * - Large separator for visual organization
 * - Trade details section with buyer, seller, item, price, and fees
 * - Second separator before action buttons
 * - Button row with confirm and cancel options
 *
 * Trade Information Displayed:
 * - Buyer: Discord mention of buyer user
 * - Seller: Discord mention of seller user
 * - Item: Description of item/service being traded
 * - Price: Formatted USD amount
 * - Additional Details: User-provided trade specifics
 * - Fees: Applied fees (currently placeholder)
 *
 * Security Features:
 * - Clear identification of all parties
 * - Final confirmation step prevents mistakes
 * - Cancel option allows safe exit
 * - Private thread creation only after confirmation
 *
 * @function buildConfirmTradeDetailsContainer
 * @param {string} buyerId - Discord user ID of the buyer
 * @param {string} sellerId - Discord user ID of the seller
 * @param {string} item - Description of item/service being traded
 * @param {string} price - Formatted price (e.g., "50.00")
 * @param {string} details - Additional trade details from user
 * @param {string} feesText - Text describing applied fees
 * @returns {ContainerBuilder} Complete trade confirmation interface
 *
 * @example
 * // After modal submission
 * const container = buildConfirmTradeDetailsContainer(
 *   '123456789', '987654321', 'Web Development Services', '500.00',
 *   'Create landing page with React', 'No fees applied'
 * );
 * await interaction.reply({
 *   components: [container]
 * });
 */
export function buildConfirmTradeDetailsContainer(
  buyerId,
  sellerId,
  item,
  price,
  details,
  feesText,
) {
  return new ContainerBuilder()
    .setAccentColor(COLORS.VERIFIED_GREEN)

    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Let's Double-Check!**`),
      new TextDisplayBuilder().setContent(
        'Please make sure everything is perfect. This will become the basis for our secure contract.',
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`Buyer: <@${buyerId}>`),
      new TextDisplayBuilder().setContent(`Seller: <@${sellerId}>`),
      new TextDisplayBuilder().setContent(`Item: ${item}`),
      new TextDisplayBuilder().setContent(`Price: $${price}`),
      new TextDisplayBuilder().setContent(`Additional Details: ${details}`),
      new TextDisplayBuilder().setContent(`Fees: ${feesText}`),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addActionRowComponents(buildCreateThreadButtonsRow(buyerId, sellerId));
}
