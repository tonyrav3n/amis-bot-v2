import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
} from 'discord.js';

import { logger } from '../logger.js';

import {
  buildCounterpartySelect,
  buildRoleSelectionSelect,
} from './selects.js';

/**
 * Build a trade details modal for comprehensive trade information collection
 *
 * Creates a modal form with multiple input fields and selection menus
 * for collecting complete trade information using Components V2.
 *
 * Modal Structure:
 * - Item Input (required): Short text field for trade item description
 * - Price Input (required): Short text field for USD amount
 * - Counterparty Selection (required): User select menu for trading partner
 * - Role Selection (required): String select menu for buyer/seller positioning
 * - Description Input (optional): Paragraph text for additional trade details
 *
 * Input Validation:
 * - Item: Required, up to 500 characters
 * - Price: Required, numeric USD amount with minimum $5.00
 * - Counterparty: Required, must be different user
 * - Role: Required, buyer or seller selection
 * - Description: Optional, up to 1000 characters
 *
 * Integration:
 * - Routes to handleTradeDetailsModal() in modalsHandler.js
 * - Validates all inputs before trade creation
 * - Creates trade confirmation interface
 * - Supports thread creation workflow
 *
 * @function buildTradeDetailsModal
 * @returns {ModalBuilder} Configured modal ready to display
 *
 * @example
 * // Show trade details modal
 * const modal = buildTradeDetailsModal();
 * await interaction.showModal(modal);
 *
 * @example
 * // In trade creation flow
 * await interaction.showModal(buildTradeDetailsModal());
 */
export function buildTradeDetailsModal() {
  logger.debug('Building trade details modal');

  return new ModalBuilder()
    .setCustomId(`trade_details_mdl`)
    .setTitle('Trade Details')
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Trade Item')
        .setDescription(
          'The exact name of the product, service, or asset being exchanged.',
        )
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId('item_input')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder(`e.g., "Web Development Services"`)
            .setRequired(true)
            .setMaxLength(500),
        ),
    )
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Price ($)')
        .setDescription(
          'Enter the numeric amount (Minimum 5) in $ (e.g., 50 or 50.00).',
        )
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId('price_input')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('e.g., 10, 15.5, 50.0')
            .setRequired(true)
            .setMaxLength(20),
        ),
    )
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Counterparty')
        .setDescription(
          'The Discord user you are entering this agreement with.',
        )
        .setUserSelectMenuComponent(buildCounterpartySelect()),
    )
    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Your Role')
        .setDescription(
          'Your position in this transaction relative to the counterparty.',
        )
        .setStringSelectMenuComponent(buildRoleSelectionSelect()),
    )

    .addLabelComponents(
      new LabelBuilder()
        .setLabel('Additional Details (optional)')
        .setDescription(
          'Any specific terms, conditions, or delivery details for this deal.',
        )
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId('description_input')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder(
              'Any specific terms, delivery method, or conditions...',
            )
            .setRequired(false)
            .setMaxLength(1000),
        ),
    );
}
