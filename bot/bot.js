/**
 * Main Discord Bot Entry Point
 *
 * Initializes and configures the Discord bot with comprehensive logging for
 * monitoring and debugging. Handles trade escrow management through interactive
 * Discord components with full audit trail.
 *
 * Features:
 * - Command loading from /commands directory with error handling
 * - Event handler registration from /events directory with detailed logging
 * - Environment variable validation before startup
 * - Discord client setup with required intents
 * - Comprehensive startup sequence logging
 * - Component loading progress tracking
 * - Connection status monitoring
 *
 * @module bot
 * @author amis Bot Team
 * @version 2.0.0
 * @since 1.0.0
 */

import fs from 'fs';
import path from 'path';

import { Client, GatewayIntentBits, Collection } from 'discord.js';

import { env, validateRequiredEnvVars } from './config/env.js';
import { logger } from './utils/logger.js';

/**
 * Bot startup sequence with comprehensive logging and error handling.
 * Initializes all components and establishes Discord connection.
 *
 * @async
 * @function initializeBot
 * @returns {Promise<void>}
 * @throws {Error} When environment validation or component loading fails
 */
async function initializeBot() {
  logger.info('Starting amis. bot...');
  logger.debug('Environment validation starting...');
  validateRequiredEnvVars();
  logger.success('Environment validation passed');

  /**
   * Discord client instance
   * Configured with Guilds intent for server interactions
   * @type {Client}
   */
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  logger.info('Discord client initialized with Guilds intent');

  /**
   * Collection of all loaded slash commands
   * Maps command names to their module exports
   * @type {Collection<string, Object>}
   */
  client.commands = new Collection();

  // Command Loading
  const commandsDir = path.join(process.cwd(), 'bot', 'commands');
  logger.debug('Loading commands from:', commandsDir);

  const commandFiles = fs
    .readdirSync(commandsDir)
    .filter((f) => f.endsWith('.js'));

  logger.info(`Found ${commandFiles.length} command files:`, commandFiles);

  // Load and validate each command module
  for (const file of commandFiles) {
    const mod = await import(`./commands/${file}`);

    const name = mod?.data?.name;
    if (!name) {
      logger.warn(`Skipping ${file}: missing export 'data.name'`);
      continue;
    }

    // Add command to collection for lookup during interactions
    client.commands.set(name, mod);
    logger.debug(`Loaded command: ${name} (${file})`);
  }

  logger.success(`Successfully loaded ${client.commands.size} commands`);

  // Event Handler Loading
  const eventDir = path.join(process.cwd(), 'bot', 'events');
  logger.debug('Loading events from:', eventDir);

  const eventFiles = fs.readdirSync(eventDir).filter((f) => f.endsWith('.js'));
  logger.info(`Found ${eventFiles.length} event files:`, eventFiles);

  // Load and register each event handler
  for (const file of eventFiles) {
    const mod = await import(`./events/${file}`);

    if (!mod?.name) {
      logger.warn(`Skipping event ${file}: missing export 'name'`);
      continue;
    }

    // Register event listener (once for single-fire events, on for repeating)
    if (mod?.once) {
      client.once(mod.name, (...args) => mod.execute(client, ...args));
      logger.debug(`Registered one-time event: ${mod.name} (${file})`);
    } else {
      client.on(mod.name, (...args) => mod.execute(client, ...args));
      logger.debug(`Registered persistent event: ${mod.name} (${file})`);
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
