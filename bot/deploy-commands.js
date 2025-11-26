import fs from 'fs';
import path from 'path';

import { REST, Routes } from 'discord.js';

import { env, validateRequiredEnvVars } from './config/env.js';
import { logger } from './utils/logger.js';

/**
 * Load and register slash commands with Discord API.
 */
async function deployCommands() {
  try {
    logger.info('Starting command deployment...');
    validateRequiredEnvVars();
    logger.success('Environment validation passed');

    const commands = [];
    const commandsDir = path.join(process.cwd(), 'bot', 'commands');
    const commandFiles = fs
      .readdirSync(commandsDir)
      .filter((f) => f.endsWith('.js'));

    for (const file of commandFiles) {
      const mod = await import(`./commands/${file}`);
      if (mod?.data?.toJSON) {
        commands.push(mod.data.toJSON());
      } else {
        const name = mod?.data?.name || file;
        logger.warn(`Command ${name} is missing the data.toJSON() method.`);
      }
    }

    const rest = new REST({ version: '10' }).setToken(env.TOKEN);

    logger.info(`Registering ${commands.length} application (/) commands...`);

    const data = await rest.put(
      Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID),
      { body: commands },
    );

    logger.success(`Successfully registered ${data.length} guild commands.`);
  } catch (error) {
    logger.error('Error deploying commands:', error);
    process.exit(1);
  }
}

deployCommands();
