import { MessageFlags } from 'discord.js';

import { buildConfirmTradeDetailsContainer } from '../utils/components/containers.js';
import { calculateTradeFees } from '../utils/fees.js';
import { logger } from '../utils/logger.js';
import { createTradeDraft } from '../utils/tradeDrafts.js';
import { normalizeUsdAmount } from '../utils/validation.js';

/**
 * Routes modal submissions to their handler based on the custom ID prefix.
 *
 * @param {import('discord.js').ModalSubmitInteraction} interaction - The modal interaction.
 * @returns {Promise<void>}
 */
export async function handleModal(interaction) {
  const { customId } = interaction;
  const userId = interaction.user.id;

  try {
    const baseId = customId.split(':')[0];

    switch (baseId) {
      case 'trade_details_mdl':
        await handleTradeDetailsModal(interaction);
        break;

      default:
        logger.warn(`Unknown modal customId: ${customId}`, {
          userId,
          guildId: interaction.guild?.id,
        });

        await interaction.reply({
          content: `Unknown modal type: ${baseId}. Please try again.`,
          flags: MessageFlags.Ephemeral,
        });
    }
  } catch (error) {
    logger.error(`Error handling modal ${customId}:`, error);

    try {
      await interaction.reply({
        content: `❌ An error occurred processing your submission. Please try again.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      logger.error('Failed to send error reply:', replyError);
    }
  }
}

/**
 * Processes the trade details modal, validates inputs, and posts a confirmation container.
 *
 * @param {import('discord.js').ModalSubmitInteraction} interaction - The modal interaction.
 * @returns {Promise<void>}
 */
async function handleTradeDetailsModal(interaction) {
  const userId = interaction.user.id;

  const item = interaction.fields.getTextInputValue('item_input');
  const priceValue = interaction.fields.getTextInputValue('price_input');
  const counterpartyId = interaction.fields.getField('counterparty_select')
    .values[0];
  const role = interaction.fields.getField('role_opt').values[0];
  const description = interaction.fields.getTextInputValue('description_input');

  const priceValidation = normalizeUsdAmount(priceValue);

  if (!priceValidation.ok) {
    return interaction.reply({
      content: `❌ **Invalid Price:** ${priceValidation.error}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // Prevent self-trades.
  if (counterpartyId === userId) {
    logger.warn(`User ${userId} tried to trade with themselves`);
    return interaction.reply({
      content:
        '❌ **You cannot trade with yourself.** Please select another user.',
      flags: MessageFlags.Ephemeral,
    });
  }

  // Prevent trades with bots.
  try {
    const targetUser = await interaction.client.users.fetch(counterpartyId, {
      force: true,
    });
    if (targetUser.bot) {
      logger.warn(
        `User ${userId} tried to trade with a bot (${counterpartyId})`,
      );
      return interaction.reply({
        content:
          '❌ **You cannot trade with a bot.** Please select a human user.',
        flags: MessageFlags.Ephemeral,
      });
    }
  } catch (err) {
    logger.error('Failed to fetch counterparty for validation:', err);
    return interaction.reply({
      content: '❌ Invalid User ID provided.',
      flags: MessageFlags.Ephemeral,
    });
  }

  let buyerId;
  let sellerId;

  if (role === 'buyer') {
    buyerId = userId;
    sellerId = counterpartyId;
  } else if (role === 'seller') {
    sellerId = userId;
    buyerId = counterpartyId;
  } else {
    throw new Error(
      `Invalid role selection: ${role}. Must be 'buyer' or 'seller'.`,
    );
  }
  const feesData = calculateTradeFees(priceValue);

  const feesText = `
  • **Buyer pays:** $${feesData.buyerTotal} ($${feesData.price} + 2.5%)
  • **Seller receives:** $${feesData.sellerTotal} ($${feesData.price} - 2.5%)`;

  const tradeDraftId = createTradeDraft({
    item,
    price: priceValue,
    additionalDetails: description,
  });

  await interaction.reply({
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
    components: [
      buildConfirmTradeDetailsContainer(
        buyerId,
        sellerId,
        item,
        priceValue,
        description,
        feesText,
        tradeDraftId,
      ).toJSON(),
    ],
  });
}

export default {
  handleModal,
};
