import { MessageFlags } from 'discord.js';

import { buildConfirmTradeDetailsContainer } from '../utils/components/containers.js';
import { logger } from '../utils/logger.js';
import { normalizeUsdAmount } from '../utils/validation.js';

/** Routes modal submissions to appropriate handlers. */
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

/** Handle trade details modal submission. */
async function handleTradeDetailsModal(interaction) {
  const userId = interaction.user.id;

  const item = interaction.fields.getTextInputValue('item_input');
  const priceValue = interaction.fields.getTextInputValue('price_input');
  const counterpartyId = interaction.fields.getField('counterparty_select')
    .values[0];
  const role = interaction.fields.getField('role_opt').values[0];
  const description = interaction.fields.getTextInputValue('description_input');

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

  const priceValidation = normalizeUsdAmount(priceValue);

  if (!priceValidation.ok) {
    await interaction.reply({
      content: `**Invalid Price:** ${priceValidation.error}`,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const feesText = 'No fees applied';

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
      ),
    ],
  });
}

export default {
  handleModal,
};
