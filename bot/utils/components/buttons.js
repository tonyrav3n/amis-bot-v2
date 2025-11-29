import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

import { logger } from '../logger.js';

/**
 * Builds the verify button row used in onboarding containers.
 *
 * @returns {import('discord.js').ActionRowBuilder} Action row containing the verify button.
 */
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

/**
 * Builds the button row that starts the trade creation flow.
 *
 * @returns {import('discord.js').ActionRowBuilder} Action row containing the trade button.
 */
export function buildTradeButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_trade_flow_btn')
      .setLabel('Start a New Trade')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Success),
  );
}

/**
 * Builds the confirmation/cancel buttons shown before creating a thread.
 *
 * @param {string} buyerId - Discord ID of the buyer.
 * @param {string} sellerId - Discord ID of the seller.
 * @param {string|null} [tradeDraftId=null] - Optional draft reference.
 * @returns {import('discord.js').ActionRowBuilder} Action row with confirm and cancel buttons.
 */
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
      .setCustomId('cancel_trade')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger),
  );
}

/**
 * Builds the wallet connection button for a specific trade thread.
 *
 * @param {string} tradeId - Trade identifier encoded in the custom ID.
 * @param {string} buyerId - Discord ID of the buyer.
 * @param {string} sellerId - Discord ID of the seller.
 * @returns {import('discord.js').ActionRowBuilder} Action row containing the wallet button.
 */
export function buildConnectWalletButton(tradeId, buyerId, sellerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`connect_wallet:${tradeId}:${buyerId}:${sellerId}`)
      .setLabel('Connect Wallet')
      .setEmoji('🔗')
      .setStyle(ButtonStyle.Primary),
  );
}

/**
 * Builds the proceed confirmation button used after wallet connections.
 *
 * @param {string} tradeId - Trade identifier encoded in the custom ID.
 * @param {string} buyerId - Discord ID of the buyer.
 * @param {string} sellerId - Discord ID of the seller.
 * @returns {import('discord.js').ActionRowBuilder} Action row containing the proceed button.
 */
export function buildConfirmWalletButton(tradeId, buyerId, sellerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`proceed_trade:${tradeId}:${buyerId}:${sellerId}`)
      .setLabel('Confirm')
      .setEmoji('⚡')
      .setStyle(ButtonStyle.Success),
  );
}

/**
 * Builds the Fund button for buyers to fund the escrow contract.
 *
 * @param {string} tradeId - Trade identifier encoded in the custom ID.
 * @param {string} buyerId - Discord ID of the buyer.
 * @param {string} sellerId - Discord ID of the seller.
 * @returns {import('discord.js').ActionRowBuilder} Action row containing the fund button.
 */
export function buildFundButton(tradeId, buyerId, sellerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`fund_trade:${tradeId}:${buyerId}:${sellerId}`)
      .setLabel('Fund')
      .setEmoji('💰')
      .setStyle(ButtonStyle.Success),
  );
}

/**
 * Builds the Mark Delivered button for sellers.
 *
 * @param {string} tradeId - Trade identifier encoded in the custom ID.
 * @param {string} buyerId - Discord ID of the buyer.
 * @param {string} sellerId - Discord ID of the seller.
 * @returns {import('discord.js').ActionRowBuilder} Action row containing the mark delivered button.
 */
export function buildMarkDeliveredButton(tradeId, buyerId, sellerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`mark_delivered:${tradeId}:${buyerId}:${sellerId}`)
      .setLabel('Mark Delivered')
      .setEmoji('📦')
      .setStyle(ButtonStyle.Success),
  );
}

/**
 * Builds the Approve & Release button for buyers.
 *
 * @param {string} tradeId - Trade identifier encoded in the custom ID.
 * @param {string} buyerId - Discord ID of the buyer.
 * @param {string} sellerId - Discord ID of the seller.
 * @returns {import('discord.js').ActionRowBuilder} Action row containing the approve button.
 */
export function buildApproveReleaseButton(tradeId, buyerId, sellerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`approve_release:${tradeId}:${buyerId}:${sellerId}`)
      .setLabel('Approve & Release')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
  );
}
