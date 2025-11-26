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
  buildTradeButton,
  buildVerifyButton,
} from './buttons.js';

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
 * Build styled message container with optional header, banner, thumbnail.
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
 * Display trade confirmation details with fees for buyer and seller review.
 */
export function buildConfirmTradeDetailsContainer(
  buyerId,
  sellerId,
  item,
  price,
  details,
  feesText,
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

  if (buyerId && sellerId) {
    container.addActionRowComponents(
      buildCreateThreadButtonsRow(buyerId, sellerId),
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
 * Display wallet connection status and buttons for each party to connect.
 */
export async function buildConnectWalletContainer(
  tradeId,
  buyerId,
  sellerId,
  walletStatus = {},
  buyerDisplay = null,
  sellerDisplay = null,
) {
  const buyerConnected = !!walletStatus.buyerWallet;
  const sellerConnected = !!walletStatus.sellerWallet;

  const buyerLabel = buyerDisplay || `User ${buyerId.slice(-4)}`;
  const sellerLabel = sellerDisplay || `User ${sellerId.slice(-4)}`;

  const statusLines = [];
  if (buyerConnected) {
    statusLines.push(
      `\n✅ **Buyer** (${buyerLabel}): ${truncateWalletAddress(walletStatus.buyerWallet)}`,
    );
  } else {
    statusLines.push(
      `\n⏳ **Buyer** (${buyerLabel}): Awaiting wallet connection`,
    );
  }

  if (sellerConnected) {
    statusLines.push(
      `\n✅ **Seller** (${sellerLabel}): ${truncateWalletAddress(walletStatus.sellerWallet)}`,
    );
  } else {
    statusLines.push(
      `\n⏳ **Seller** (${sellerLabel}): Awaiting wallet connection`,
    );
  }

  const container = new ContainerBuilder()
    .setAccentColor(COLORS.VERIFIED_GREEN)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        '**Final Agreement & Consent Required**\n' +
          'Please review the terms one last time and click your respective button below to finalize the agreement. This action cannot be undone.',
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `Trade ID: \`${tradeId}\`\n\n**Buyer:** <@${buyerId}>\n\n**Seller:** <@${sellerId}>`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Wallet Connection Status:**${statusLines.join('\n')}`,
      ),
    )
    .addSeparatorComponents(
      new SeparatorBuilder({ spacing: SeparatorSpacingSize.Large }),
    )
    .addActionRowComponents(
      buildConnectWalletButton(tradeId, buyerId, sellerId),
    );

  return container;
}
