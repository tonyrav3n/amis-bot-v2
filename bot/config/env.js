/**
 * Environment configuration module
 *
 * Loads and exports all environment variables required by the bot.
 * Variables are loaded from .env file using dotenv.
 *
 * All values are trimmed of whitespace and validated before use.
 * Use validateRequiredEnvVars() to ensure all required variables are set.
 *
 * @module config/env
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ quiet: true });

/**
 * Environment variables object
 *
 * Contains all configuration values loaded from environment.
 * All string values are trimmed, numeric values are parsed.
 *
 * @type {Object}
 * @property {string} TOKEN - Discord bot token for authentication
 * @property {string} GUILD_ID - Discord guild (server) ID for command registration
 * @property {string} ADMIN_ROLE_ID - Role ID for admin permissions
 * @property {string} NETWORK_PRIVATE_KEY - Private key for blockchain transactions
 * @property {string} NETWORK_RPC_URL - RPC URL for blockchain network connection
 * @property {number} NETWORK_CHAIN_ID - Chain ID for blockchain network
 * @property {string} VERIFIED_ROLE_ID - Role ID to assign to verified users
 * @property {string} BOT_ADDRESS - Bot's blockchain wallet address
 * @property {string} ETHERSCAN_API_KEY - API key for Etherscan/block explorer
 * @property {string} AMIS_ESCROW_ADDRESS - Smart contract address for escrow
 * @property {string} ESCROW_CONTRACT_ADDRESS - Smart contract address for escrow (alias)
 * @property {string} BOT_PRIVATE_KEY - Bot's private key for blockchain transactions
 * @property {string} DATABASE_URL - Database connection URL
 * @property {string} CONNECTION_STRING - Alternative database connection URL
 * @property {string} DATABASE_SSL - Database SSL configuration
 * @property {boolean|string} USE_LOCAL_PG - Force use of local PostgreSQL (overrides NODE_ENV)
 * @property {string} SUPABASE_URL - Supabase project URL
 * @property {string} SUPABASE_ANON_KEY - Supabase anonymous key
 * @property {string} JWT_SECRET - Secret key for JWT token signing
 * @property {boolean} DEBUG_MODE - Enable/disable debug logging (from DEBUG_MODE env var)
 */
export const env = {
  TOKEN: process.env.TOKEN?.trim() || '',
  GUILD_ID: process.env.GUILD_ID?.trim() || '',
  ADMIN_ROLE_ID: process.env.ADMIN_ROLE_ID?.trim() || '',
  NETWORK_PRIVATE_KEY: process.env.NETWORK_PRIVATE_KEY?.trim() || '',
  NETWORK_RPC_URL: process.env.NETWORK_RPC_URL?.trim() || '',
  NETWORK_CHAIN_ID: Number(process.env.NETWORK_CHAIN_ID) || 0,
  VERIFIED_ROLE_ID: process.env.VERIFIED_ROLE_ID?.trim() || '',
  BOT_ADDRESS: process.env.BOT_ADDRESS?.trim() || '',
  ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY?.trim() || '',
  AMIS_ESCROW_ADDRESS: process.env.AMIS_ESCROW_ADDRESS?.trim() || '',
  ESCROW_CONTRACT_ADDRESS: process.env.ESCROW_CONTRACT_ADDRESS?.trim() || process.env.AMIS_ESCROW_ADDRESS?.trim() || '',
  BOT_PRIVATE_KEY: process.env.BOT_PRIVATE_KEY?.trim() || '',
  DATABASE_URL: process.env.DATABASE_URL?.trim() || '',
  CONNECTION_STRING: process.env.CONNECTION_STRING?.trim() || '',
  DATABASE_SSL: process.env.DATABASE_SSL?.trim() || '',
  USE_LOCAL_PG: process.env.USE_LOCAL_PG
    ? process.env.USE_LOCAL_PG.trim().toLowerCase()
    : undefined,
  SUPABASE_URL: process.env.SUPABASE_URL?.trim() || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.trim() || '',
  JWT_SECRET: process.env.JWT_SECRET?.trim() || '',
  DEBUG_MODE: process.env.DEBUG_MODE?.trim().toLowerCase() === 'true',
  CLIENT_URL: process.env.CLIENT_URL?.trim() || 'http://localhost:5173',
  VITE_SERVER_URL: process.env.VITE_SERVER_URL?.trim() || '',
  WALLET_SERVER_PORT: Number(process.env.WALLET_SERVER_PORT) || 3001,
};

/**
 * Determine whether to use local PostgreSQL instead of Supabase
 * Priority: USE_LOCAL_PG env var > NODE_ENV
 *
 * @returns {boolean}
 */
export function shouldUseLocalPg() {
  if (env.USE_LOCAL_PG !== undefined) {
    return env.USE_LOCAL_PG === true || env.USE_LOCAL_PG === 'true';
  }

  const nodeEnv = process.env.NODE_ENV?.trim().toLowerCase();
  return nodeEnv !== 'production';
}

/**
 * Validate that all required environment variables are set
 *
 * Checks each property in the env object and throws an error if any are missing.
 * Call this at application startup to fail fast if configuration is incomplete.
 *
 * @throws {Error} If any required environment variables are missing
 *
 * @example
 * try {
 *   validateRequiredEnvVars();
 * } catch (error) {
 *   console.error('Configuration error:', error.message);
 *   process.exit(1);
 * }
 */
export function validateRequiredEnvVars() {
  // Determine which database backend is being used
  const useLocalPg =
    env.USE_LOCAL_PG !== undefined
      ? env.USE_LOCAL_PG === true || env.USE_LOCAL_PG === 'true'
      : process.env.NODE_ENV?.trim().toLowerCase() !== 'production';

  // Define which variables are optional based on database backend
  const optionalVars = new Set([
    'USE_LOCAL_PG',
    'CONNECTION_STRING',
    'DATABASE_SSL',
    'VITE_SERVER_URL',
  ]);

  // Add backend-specific optional variables
  if (useLocalPg) {
    // Using local PostgreSQL - Supabase vars are optional
    optionalVars.add('SUPABASE_URL');
    optionalVars.add('SUPABASE_ANON_KEY');
    // But either DATABASE_URL or CONNECTION_STRING is required
    if (!env.DATABASE_URL && !env.CONNECTION_STRING) {
      throw new Error(
        'When using local PostgreSQL (USE_LOCAL_PG=true), either DATABASE_URL or CONNECTION_STRING must be set',
      );
    }
  } else {
    // Using Supabase - local PostgreSQL vars are optional
    optionalVars.add('DATABASE_URL');
    // Supabase vars are required
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      throw new Error(
        'When using Supabase (USE_LOCAL_PG=false or NODE_ENV=production), SUPABASE_URL and SUPABASE_ANON_KEY must be set',
      );
    }
  }

  // Check all env properties for missing values (excluding optional ones)
  const missing = Object.entries(env)
    .filter(
      ([key, value]) =>
        !optionalVars.has(key) &&
        typeof value !== 'boolean' &&
        !value &&
        value !== 0,
    )
    .map(([key]) => key);

  // Throw error with list of missing variables
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}
