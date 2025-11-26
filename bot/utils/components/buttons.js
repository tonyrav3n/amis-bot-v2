import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildVerifyButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_assign_role_btn')
      .setLabel('Verify')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
  );
}

export function buildTradeButton() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('create_trade_flow_btn')
      .setLabel('Start a New Trade')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Success),
  );
}

export function buildCreateThreadButtonsRow(buyerId, sellerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`create_thread:${buyerId}:${sellerId}`)
      .setLabel('Confirm Trade')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`cancel_trade`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger),
  );
}

export function buildConnectWalletButton(tradeId, buyerId, sellerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`connect_wallet:${tradeId}:${buyerId}:${sellerId}`)
      .setLabel('🔗 Connect Your Wallet')
      .setStyle(ButtonStyle.Primary),
  );
}
