import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

import { logger } from '../logger.js';

/** Build a verification button for new users. */
export function buildVerifyButton() {
  logger.debug('🔘 Building verify button');
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_assign_role_btn')
      .setLabel('Verify')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
  );
}

/** Build a create trade button for initiating trade creation flows. */
export function buildTradeButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_trade_flow_btn')
      .setLabel('Start a New Trade')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Success),
  );
}

/** Build create thread confirmation buttons. */
export function buildCreateThreadButtonsRow(
  buyerId,
  sellerId,
  tradeDraftId = null,
) {
  const customIdParts = ['create_thread', buyerId, sellerId];
  if (tradeDraftId) {
    customIdParts.push(tradeDraftId);
  }

  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(customIdParts.join(':'))
      .setLabel('Confirm Trade')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`cancel_trade`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger),
  );
}

/** Build wallet connection button. */
export function buildConnectWalletButton(tradeId, buyerId, sellerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`connect_wallet:${tradeId}:${buyerId}:${sellerId}`)
      .setLabel('🔗 Connect Your Wallet')
      .setStyle(ButtonStyle.Primary),
  );
}

/** Build proceed confirmation button. */
export function buildProceedButton(tradeId, buyerId, sellerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`proceed_trade:${tradeId}:${buyerId}:${sellerId}`)
      .setLabel('Proceed')
      .setEmoji('⚡')
      .setStyle(ButtonStyle.Success),
  );
}
