import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  LabelBuilder,
} from 'discord.js';

import {
  buildCounterpartySelect,
  buildRoleSelectionSelect,
} from './selects.js';

/**
 * Build trade details modal - collect item, price, counterparty, role, description.
 */
export function buildTradeDetailsModal() {
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
