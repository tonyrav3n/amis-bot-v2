import dotenv from 'dotenv';

dotenv.config({ quiet: true });

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
  DATABASE_URL: process.env.DATABASE_URL?.trim() || '',
  DATABASE_SSL: process.env.DATABASE_SSL?.trim() || '',
  SUPABASE_URL: process.env.SUPABASE_URL?.trim() || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.trim() || '',
  JWT_SECRET: process.env.JWT_SECRET?.trim() || '',
  DEBUG_MODE: process.env.DEBUG_MODE?.trim().toLowerCase() === 'true',
  CLIENT_URL: process.env.CLIENT_URL?.trim() || 'http://localhost:5173',
  SERVER_URL: process.env.SERVER_URL?.trim() || '',
  WALLET_SERVER_PORT: Number(process.env.WALLET_SERVER_PORT) || 3001,
};

/**
 * Validate all required environment variables are set.
 * @throws {Error} If any required variables are missing
 */
export function validateRequiredEnvVars() {
  const missing = Object.entries(env)
    .filter(([_, value]) => typeof value !== 'boolean' && !value)
    .map(([key]) => key);

  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}
