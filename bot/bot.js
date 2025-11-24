import fs from 'fs';
import path from 'path';

import { Client, GatewayIntentBits, Collection } from 'discord.js';

import { env, validateRequiredEnvVars } from './config/env.js';
import { logger } from './utils/logger.js';
import { startWalletServer } from './utils/walletServer.js';

/**
 * Initializes the Discord bot and establishes connection.
 * @returns {Promise<void>}
 */
async function initializeBot() {
  logger.info('Starting amis. bot...');
  validateRequiredEnvVars();
  logger.success('Environment validation passed');

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.commands = new Collection();

  await startWalletServer(client);

  const commandsDir = path.join(process.cwd(), 'bot', 'commands');
  const commandFiles = fs
    .readdirSync(commandsDir)
    .filter((f) => f.endsWith('.js'));

  for (const file of commandFiles) {
    const mod = await import(`./commands/${file}`);
    const name = mod?.data?.name;
    if (!name) {
      logger.warn(`Skipping ${file}: missing export 'data.name'`);
      continue;
    }
    client.commands.set(name, mod);
  }

  logger.success(`Successfully loaded ${client.commands.size} commands`);

  const eventDir = path.join(process.cwd(), 'bot', 'events');
  const eventFiles = fs.readdirSync(eventDir).filter((f) => f.endsWith('.js'));

  for (const file of eventFiles) {
    const mod = await import(`./events/${file}`);
    if (!mod?.name) {
      logger.warn(`Skipping event ${file}: missing export 'name'`);
      continue;
    }
    if (mod?.once) {
      client.once(mod.name, (...args) => mod.execute(client, ...args));
    } else {
      client.on(mod.name, (...args) => mod.execute(client, ...args));
    }
  }

  logger.success(`Successfully registered ${eventFiles.length} event handlers`);

  logger.info('Connecting to Discord...');
  client.login(env.TOKEN);
}

initializeBot().catch((error) => {
  logger.error('Bot initialization failed:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});
