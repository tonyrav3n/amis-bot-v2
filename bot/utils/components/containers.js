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
import { 
  getTradeFromContract, 
  getUserActions, 
  getStatusColor,
  validateBlockchainConfig,
} from '../blockchain.js';
import { truncateWalletAddress } from '../walletServer.js';

import {
  buildConnectWalletButton,
  buildCreateThreadButtonsRow,
  buildConfirmWalletButton,
  buildTradeButton,
  buildVerifyButton,
  buildFundButton,
  buildMarkDeliveredButton,
  buildApproveReleaseButton,
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

  const buyerWalletDisplay = buyerConnected
    ? `\`${truncateWalletAddress(walletStatus.buyerWallet)}\``
    : '`WALLET NOT CONNECTED`';

  const buyerStatusText = buyerConnected
    ? buyerConfirmed
      ? '`CONFIRMED`'
      : '`UNCONFIRMED`'
    : '`CONNECT WALLET`';

  const sellerWalletDisplay = sellerConnected
    ? `\`${truncateWalletAddress(walletStatus.sellerWallet)}\``
    : '`WALLET NOT CONNECTED`';

  const sellerStatusText = sellerConnected
    ? sellerConfirmed
      ? '`CONFIRMED`'
      : '`UNCONFIRMED`'
    : '`CONNECT WALLET`';

  const buyerSection =
    `-# 👤 BUYER **${buyerStatusText}**\n\n` +
    `<@${buyerId}>\n\n` +
    `${buyerWalletDisplay}`;

  const sellerSection =
    `-# 👤 SELLER **${sellerStatusText}**\n\n` +
    `<@${sellerId}>\n\n` +
    `${sellerWalletDisplay}`;

  const footerText = `-# TRADE ID: \`${tradeId}\``;

  const container = new ContainerBuilder()
    .setAccentColor(COLORS.PENDING_DARK_GREY)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('**STATUS: PENDING**'),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ITEM\n**${item || 'Not provided'}**`,
      ),
      new TextDisplayBuilder().setContent(`-# PRICE\n**$${price || '0'}**`),
      new TextDisplayBuilder().setContent(
        `-# ADDITIONAL DETAILS\n\`\`\`${details || 'null'}\`\`\``,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(buyerSection))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(sellerSection),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    );

  container
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText))
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    );

  const connectWalletButton = buildConnectWalletButton(
    tradeId,
    buyerId,
    sellerId,
  ).components[0];
  const confirmWalletButton = buildConfirmWalletButton(
    tradeId,
    buyerId,
    sellerId,
  ).components[0];

  const actionRow = new ActionRowBuilder().addComponents(connectWalletButton);
  if (!allConfirmed) {
    actionRow.addComponents(confirmWalletButton);
  }

  container.addActionRowComponents(actionRow);

  return container;
}

/**
 * Builds an on-chain trade status container with role-based actions.
 *
 * Displays live trade state from the AmisEscrowManager contract and shows
 * appropriate action buttons based on user role and trade lifecycle.
 *
 * @param {string} tradeId - Trade identifier.
 * @param {string} buyerId - Discord ID of the buyer.
 * @param {string} sellerId - Discord ID of the seller.
 * @param {object} walletStatus - Current wallet connection state.
 * @param {string|null} [walletStatus.buyerWallet] - Connected buyer wallet address.
 * @param {string|null} [walletStatus.sellerWallet] - Connected seller wallet address.
 * @param {object} tradeDetails - Item, price, and detail metadata.
 * @param {string} [tradeDetails.item] - Item name.
 * @param {string} [tradeDetails.price] - Price string.
 * @param {string} [tradeDetails.details] - Additional details string.
 * @param {string|null} [viewerRole=null] - Role of the viewer ('buyer', 'seller', or null).
 * @param {string|null} [viewerWallet=null] - Wallet address of the viewer.
 * @returns {Promise<import('discord.js').ContainerBuilder>} Promise resolving to the container builder.
 */
export async function buildOnchainTradeStatusContainer(
  tradeId,
  buyerId,
  sellerId,
  walletStatus = {},
  tradeDetails = {},
  viewerRole = null,
  viewerWallet = null,
) {
  const { buyerWallet, sellerWallet } = walletStatus;
  const { item, price, details } = tradeDetails;

  // Validate blockchain configuration
  if (!validateBlockchainConfig()) {
    return new ContainerBuilder()
      .setAccentColor(COLORS.ALERT_RED)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**⚠️ Blockchain Configuration Error**'),
        new TextDisplayBuilder().setContent(
          'Unable to connect to the escrow contract. Please check server configuration.',
        ),
      );
  }

  // Fetch trade data from contract
  const trade = await getTradeFromContract(tradeId);
  if (!trade) {
    return new ContainerBuilder()
      .setAccentColor(COLORS.ALERT_RED)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('**❌ Trade Not Found**'),
        new TextDisplayBuilder().setContent(
          `Unable to find trade \`${tradeId}\` on the blockchain. The trade may not exist yet or there might be a network issue.`,
        ),
      );
  }

  const { status, statusName } = trade;
  const statusColor = getStatusColor(status);

  // Build buyer and seller sections (without "CONFIRMED" text)
  const buyerWalletDisplay = buyerWallet
    ? `\`${truncateWalletAddress(buyerWallet)}\``
    : '`WALLET NOT CONNECTED`';

  const sellerWalletDisplay = sellerWallet
    ? `\`${truncateWalletAddress(sellerWallet)}\``
    : '`WALLET NOT CONNECTED`';

  const buyerSection =
    `-# 👤 BUYER\n\n` +
    `<@${buyerId}>\n\n` +
    `${buyerWalletDisplay}`;

  const sellerSection =
    `-# 👤 SELLER\n\n` +
    `<@${sellerId}>\n\n` +
    `${sellerWalletDisplay}`;

  const footerText = `-# TRADE ID: \`${tradeId}\``;

  const container = new ContainerBuilder()
    .setAccentColor(statusColor)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`**STATUS: ${statusName}**`),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ITEM\n**${item || 'Not provided'}**`,
      ),
      new TextDisplayBuilder().setContent(`-# PRICE\n**${price || '0'}**`),
      new TextDisplayBuilder().setContent(
        `-# ADDITIONAL DETAILS\n\`\`\`${details || 'null'}\`\`\``,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(buyerSection))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(sellerSection),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    );

  container
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText))
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    );

  // Add role-based action buttons if viewer is identified
  if (viewerRole && viewerWallet) {
    const userActions = getUserActions(trade, viewerWallet, viewerRole);
    
    if (userActions.canAct && userActions.availableActions.length > 0) {
      const actionRow = new ActionRowBuilder();
      
      for (const action of userActions.availableActions) {
        switch (action) {
          case 'fund':
            actionRow.addComponents(
              buildFundButton(tradeId, buyerId, sellerId).components[0]
            );
            break;
          case 'markDelivered':
            actionRow.addComponents(
              buildMarkDeliveredButton(tradeId, buyerId, sellerId).components[0]
            );
            break;
          case 'approveAndRelease':
            actionRow.addComponents(
              buildApproveReleaseButton(tradeId, buyerId, sellerId).components[0]
            );
            break;
        }
      }
      
      if (actionRow.components.length > 0) {
        container.addActionRowComponents(actionRow);
      }
    } else if (userActions.error) {
      // Show error message if there's a role mismatch
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`⚠️ ${userActions.error}`),
      );
    }
  }

  return container;
}

/**
 * Builds a placeholder container once both confirmations succeed.
 * (Kept for backward compatibility, but should use buildOnchainTradeStatusContainer)
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
