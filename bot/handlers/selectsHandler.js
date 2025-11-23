import { MessageFlags } from 'discord.js';

import { logger } from '../utils/logger.js';

/** Routes select menu interactions to appropriate handlers. */
export async function handleSelect(interaction) {
  const [action, ...args] = interaction.customId.split(':');

  try {
    switch (action) {
      case 'counterparty_select':
        await handleCounterpartySelect(interaction, args[0]);
        break;
      case 'role_select':
        await handleRoleSelect(interaction, args[0]);
        break;
      default:
        logger.warn(`Unknown select action: ${action}`);
        await interaction.deferUpdate();
    }
  } catch (error) {
    logger.error('Error handling select interaction:', error);

    try {
      await interaction.reply({
        content: 'An error occurred while processing your selection.',
        flags: MessageFlags.Ephemeral,
      });
    } catch (replyError) {
      logger.error('Failed to send error reply for select:', replyError);
    }
  }
}

/** Handle counterparty selection with validation. */
async function handleCounterpartySelect(interaction, role) {
  const selectedUserId = interaction.values[0];
  const userId = interaction.user.id;

  if (selectedUserId === userId) {
    logger.warn('User tried to select themselves as counterparty');
    await interaction.reply({
      content: '❌ You cannot trade with yourself. Please select another user.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (selectedUserId === interaction.guild.members.me.id) {
    logger.warn('User tried to select bot as counterparty');
    await interaction.reply({
      content: '❌ You cannot trade with the bot. Please select another user.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.update({
    content: `✅ You selected <@${selectedUserId}> as your ${role}.`,
    components: [],
  });
}

/** Handle role selection with validation. */
async function handleRoleSelect(interaction, selectedRole) {
  if (!['buyer', 'seller'].includes(selectedRole)) {
    logger.warn('Invalid role selected');
    await interaction.reply({
      content: '❌ Invalid role selection. Please try again.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const roleDisplay = selectedRole === 'buyer' ? 'Buyer' : 'Seller';
  await interaction.update({
    content: `✅ You selected: **${roleDisplay}**`,
    components: [],
  });
}
