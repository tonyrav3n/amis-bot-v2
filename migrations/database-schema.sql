-- PostgreSQL schema for Amis Bot database
-- This schema mirrors the tables used by Supabase for local development

-- Trades table: stores trade information and metadata
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    trade_id VARCHAR(255) UNIQUE NOT NULL,
    guild_id VARCHAR(255),
    channel_id VARCHAR(255),
    message_id VARCHAR(255),
    buyer_id VARCHAR(255),
    seller_id VARCHAR(255),
    buyer_display VARCHAR(255),
    seller_display VARCHAR(255),
    buyer_confirmed BOOLEAN DEFAULT FALSE,
    seller_confirmed BOOLEAN DEFAULT FALSE,
    item TEXT,
    price VARCHAR(255),
    additional_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Wallet connections table: stores wallet addresses connected to trades
CREATE TABLE IF NOT EXISTS wallet_connections (
    id SERIAL PRIMARY KEY,
    trade_id VARCHAR(255) NOT NULL,
    discord_user_id VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trade_id, discord_user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trades_trade_id ON trades(trade_id);
CREATE INDEX IF NOT EXISTS idx_trades_guild_id ON trades(guild_id);
CREATE INDEX IF NOT EXISTS idx_trades_channel_id ON trades(channel_id);
CREATE INDEX IF NOT EXISTS idx_wallet_connections_trade_id ON wallet_connections(trade_id);
CREATE INDEX IF NOT EXISTS idx_wallet_connections_discord_user_id ON wallet_connections(discord_user_id);

-- Trigger to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallet_connections_updated_at BEFORE UPDATE ON wallet_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
