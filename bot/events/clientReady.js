import { REST, Routes } from 'discord.js';

import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const name = 'clientReady';
export const once = true;

/** Execute function called when the bot is ready. */
export async function execute(client) {
  logger.success(`Logged in as ${client.user.tag}`);
  logger.info(`Serving ${client.guilds.cache.size} guild(s)`);

  // Register commands with Discord API
  await registerCommands(client);

  logger.success('Bot is ready and operational!');
}

/** Register all slash commands with Discord API. */
async function registerCommands(client) {
  const commands = [];

  for (const [name, commandModule] of client.commands) {
    if (commandModule?.data?.toJSON) {
      commands.push(commandModule.data.toJSON());
    } else {
      logger.warn(`Command ${name} missing data.toJSON() method`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(env.TOKEN);

  try {
    logger.info(`Registering ${commands.length} application (/) commands...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(client.user.id, env.GUILD_ID),
      { body: commands },
    );
    logger.success(`Successfully registered ${data.length} guild commands`);
  } catch (error) {
    logger.error('Error registering commands:', error);
  }
}
