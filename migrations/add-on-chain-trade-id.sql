-- Add on-chain trade ID field to trades table
-- This will store the blockchain trade ID for escrow contract interactions

ALTER TABLE trades ADD COLUMN on_chain_trade_id INTEGER;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_trades_on_chain_trade_id ON trades(on_chain_trade_id);