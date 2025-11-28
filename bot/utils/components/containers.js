import {
  ContainerBuilder,
  MediaGalleryBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import { COLORS, ASSETS } from '../../config/theme.js';
import { truncateWalletAddress } from '../walletServer.js';

import {
  buildConnectWalletButton,
  buildCreateThreadButtonsRow,
  buildProceedButton,
  buildTradeButton,
  buildVerifyButton,
} from './buttons.js';

/**
 * Builds the verification container shown to new users.
 *
 * @returns {import('discord.js').ContainerBuilder} The verification container.
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
 * Builds a styled container for standard channel messages.
 *
 * @param {string} msgContent - Main message body.
 * @param {object} [options={}] - Optional visual overrides.
 * @param {string} [options.header] - Optional header text.
 * @param {string} [options.colorKey='green'] - Accent color key.
 * @param {boolean} [options.includeThumb=false] - Whether to show the logo thumbnail.
 * @param {boolean} [options.includeBanner=false] - Whether to include the banner image.
 * @returns {import('discord.js').ContainerBuilder} Configured container builder.
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

/**
 * Builds a DM container for sending styled direct messages.
 *
 * @param {string} msgContent - Main message text.
 * @param {string|null} msgTitle - Optional title line.
 * @param {string} embedTitle - Server name or top-level label.
 * @param {string|null} thumbnail - Server icon or thumbnail URL.
 * @returns {import('discord.js').ContainerBuilder} Configured container builder.
 */
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
 * Builds the container that advertises the secure trade flow.
 *
 * @returns {import('discord.js').ContainerBuilder} Container inviting users to start a trade.
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
 * Builds the confirmation container displayed after modal submission.
 *
 * @param {string} buyerId - Discord ID of the buyer.
 * @param {string} sellerId - Discord ID of the seller.
 * @param {string} [item] - Item name.
 * @param {string} [price] - Formatted price.
 * @param {string} [details] - Additional terms.
 * @param {string} [feesText] - Text describing fees.
 * @param {string|null} [tradeDraftId=null] - Draft ID if available.
 * @returns {import('discord.js').ContainerBuilder} Confirmation container.
 */
export function buildConfirmTradeDetailsContainer(
  buyerId,
  sellerId,
  item,
  price,
  details,
  feesText,
  tradeDraftId = null,
) {
  const tradeDetailsComponents = [
    new TextDisplayBuilder().setContent(`Buyer: <@${buyerId}>`),
    new TextDisplayBuilder().setContent(`Seller: <@${sellerId}>`),
    new TextDisplayBuilder().setContent(`Item: ${item}`),
    new TextDisplayBuilder().setContent(`Price: $${price}`),
  ];

  if (details) {
    tradeDetailsComponents.push(
      new TextDisplayBuilder().setContent(`Additional Details: ${details}`),
    );
  }

  tradeDetailsComponents.push(
    new TextDisplayBuilder().setContent(`Fees: ${feesText}`),
  );

  const container = new ContainerBuilder()
    .setAccentColor(COLORS.VERIFIED_GREEN)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**Let's Double-Check!**`),
      new TextDisplayBuilder().setContent(
        'Please make sure everything is perfect.',
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addTextDisplayComponents(...tradeDetailsComponents)
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    );

  // Add action row: if both parties present, show confirm/cancel buttons.
  // If missing, show a disabled placeholder to avoid crashes and make intent clear.
  if (buyerId && sellerId) {
    container.addActionRowComponents(
      buildCreateThreadButtonsRow(buyerId, sellerId, tradeDraftId),
    );
  } else {
    container.addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('missing_participants')
          .setLabel('Participants missing')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
      ),
    );
  }

  return container;
}

/**
 * Builds the wallet-connection container shown inside private trade threads.
 *
 * @param {string} tradeId - Trade identifier displayed in the UI.
 * @param {string} buyerId - Discord ID for the buyer.
 * @param {string} sellerId - Discord ID for the seller.
 * @param {object} [walletStatus={}] - Current wallet connection state.
 * @param {string|null} [walletStatus.buyerWallet] - Connected buyer wallet address.
 * @param {string|null} [walletStatus.sellerWallet] - Connected seller wallet address.
 * @param {string|null} [buyerDisplay=null] - Buyer display name fallback.
 * @param {string|null} [sellerDisplay=null] - Seller display name fallback.
 * @param {object} [confirmationStatus={}] - Proceed confirmation status.
 * @param {boolean} [confirmationStatus.buyerConfirmed] - Whether the buyer confirmed.
 * @param {boolean} [confirmationStatus.sellerConfirmed] - Whether the seller confirmed.
 * @param {object} [tradeDetails={}] - Item, price, and detail metadata.
 * @param {string} [tradeDetails.item] - Item name.
 * @param {string} [tradeDetails.price] - Price string.
 * @param {string} [tradeDetails.details] - Additional details string.
 * @returns {Promise<import('discord.js').ContainerBuilder>} Promise resolving to the container builder.
 */
export async function buildConnectWalletContainer(
  tradeId,
  buyerId,
  sellerId,
  walletStatus = {},
  _buyerDisplay = null,
  _sellerDisplay = null,
  confirmationStatus = {},
  tradeDetails = {},
) {
  const buyerConnected = !!walletStatus.buyerWallet;
  const sellerConnected = !!walletStatus.sellerWallet;

  const buyerConfirmed = !!confirmationStatus.buyerConfirmed;
  const sellerConfirmed = !!confirmationStatus.sellerConfirmed;

  const { item, price, details } = tradeDetails;

  const allConfirmed = buyerConfirmed && sellerConfirmed;

  const truncatedTradeId = tradeId.length > 10 ? `${tradeId.slice(0, 4)}...${tradeId.slice(-4)}` : tradeId;

  const buyerWalletDisplay = buyerConnected
    ? `\`${truncateWalletAddress(walletStatus.buyerWallet)}\``
    : '`[No Wallet]`';
  
  const buyerStatusText = buyerConnected
    ? (buyerConfirmed ? '✅ **READY**' : '🔴 **WAITING**')
    : '⏳ **CONNECT WALLET**';

  const sellerWalletDisplay = sellerConnected
    ? `\`${truncateWalletAddress(walletStatus.sellerWallet)}\``
    : '`[No Wallet]`';
  
  const sellerStatusText = sellerConnected
    ? (sellerConfirmed ? '✅ **READY**' : '🔴 **WAITING**')
    : '⏳ **CONNECT WALLET**';

  const playersSection = 
    `👤 **Buyer:** <@${buyerId}>\n` +
    `│  ${buyerWalletDisplay} • ${buyerStatusText}\n\n` +
    `🏷️ **Seller:** <@${sellerId}>\n` +
    `│  ${sellerWalletDisplay} • ${sellerStatusText}`;

  const footerText = allConfirmed
    ? `Trade ID: \`${truncatedTradeId}\` • Both parties have confirmed. Preparing next step...`
    : `Trade ID: \`${truncatedTradeId}\` • Both parties must confirm to continue.`;

  const container = new ContainerBuilder()
    .setAccentColor(COLORS.PENDING_DARK_GREY)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# STATUS: PENDING'),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Item:** ${item || 'Not provided'}\n` +
        `**Price:** \`${price || '0'}\`\n` +
        `_${details || 'Please review terms below.'}_`
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('**The Players**'),
      new TextDisplayBuilder().setContent(playersSection),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addActionRowComponents(
      buildConnectWalletButton(tradeId, buyerId, sellerId),
    );

  if (!allConfirmed) {
    container.addActionRowComponents(
      buildProceedButton(tradeId, buyerId, sellerId),
    );
  }

  container
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`_${footerText}_`),
    );

  return container;
}

/**
 * Builds a placeholder container once both confirmations succeed.
 *
 * @param {string} tradeId - Trade identifier.
 * @param {string} buyerId - Discord ID of the buyer.
 * @param {string} sellerId - Discord ID of the seller.
 * @param {string|null} [buyerDisplay=null] - Buyer display name fallback.
 * @param {string|null} [sellerDisplay=null] - Seller display name fallback.
 * @returns {import('discord.js').ContainerBuilder} Informational container.
 */
export function buildDevelopmentInProgressContainer(
  tradeId,
  buyerId,
  sellerId,
  buyerDisplay = null,
  sellerDisplay = null,
) {
  const buyerLabel = buyerDisplay || `User ${buyerId.slice(-4)}`;
  const sellerLabel = sellerDisplay || `User ${sellerId.slice(-4)}`;

  return new ContainerBuilder()
    .setAccentColor(COLORS.BLURPLE)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('**🚧 Development in progress**'),
      new TextDisplayBuilder().setContent(
        'Both parties have connected wallets and confirmed the Proceed step. The next phase of this escrow flow is under active development — we will notify you as soon as it is ready.',
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Trade ID: \`${tradeId}\`\n• Buyer: <@${buyerId}> (${buyerLabel})\n• Seller: <@${sellerId}> (${sellerLabel})`,
      ),
    );
}
