import { logger } from '../utils/logger.js';

export const name = 'clientReady';
export const once = true;

/**
 * Logs bot login info and readiness.
 *
 * @param {import('discord.js').Client} client - The Discord client instance.
 * @returns {Promise<void>}
 */
export async function execute(client) {
  logger.success(`Logged in as ${client.user.tag}`);
  logger.info(`Serving ${client.guilds.cache.size} guild(s)`);
  logger.success('Bot is ready and operational!');
}
