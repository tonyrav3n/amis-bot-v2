/**
 * Blockchain integration utilities for AmisEscrowManager contract
 *
 * Provides functions to interact with the escrow smart contract
 * including fetching trade status and determining user actions.
 *
 * @module utils/blockchain
 */

import { ethers } from 'ethers';

import contractABI from '../abi/AmisEscrow.json' with { type: 'json' };
import { env } from '../config/env.js';

import { logger } from './logger.js';

// Trade status enum values matching the contract
export const TradeStatus = {
  Created: 0,
  Funded: 1,
  Delivered: 2,
  Completed: 3,
  Cancelled: 4,
  Disputed: 5,
};

// Trade status display names
export const TradeStatusNames = {
  [TradeStatus.Created]: 'CREATED',
  [TradeStatus.Funded]: 'FUNDED',
  [TradeStatus.Delivered]: 'DELIVERED',
  [TradeStatus.Completed]: 'COMPLETED',
  [TradeStatus.Cancelled]: 'CANCELLED',
  [TradeStatus.Disputed]: 'DISPUTED',
};

// Contract provider instance (cached)
let provider = null;
let contract = null;

/**
 * Initialize blockchain provider and contract instance
 *
 * @returns {Promise<ethers.Contract>} Contract instance
 */
function initializeContract() {
  if (contract) {
    return contract;
  }

  if (!env.ESCROW_CONTRACT_ADDRESS) {
    throw new Error('ESCROW_CONTRACT_ADDRESS environment variable is not set');
  }

  if (!env.NETWORK_RPC_URL) {
    throw new Error('NETWORK_RPC_URL environment variable is not set');
  }

  try {
    provider = new ethers.JsonRpcProvider(env.NETWORK_RPC_URL);
    contract = new ethers.Contract(env.ESCROW_CONTRACT_ADDRESS, contractABI, provider);
    
    logger.debug(`Contract initialized at ${env.ESCROW_CONTRACT_ADDRESS}`);
    return contract;
  } catch (error) {
    logger.error('Failed to initialize contract:', error);
    throw new Error(`Contract initialization failed: ${error.message}`);
  }
}

/**
 * Get trade information from the smart contract
 *
 * @param {number|string} tradeId - Trade identifier
 * @returns {Promise<object|null>} Trade data or null if not found
 */
export async function getTradeFromContract(tradeId) {
  try {
    const contractInstance = initializeContract();
    const tradeData = await contractInstance.trades(tradeId);
    
    // Convert BigInt values to strings for JSON serialization
    const trade = {
      tradeId: Number(tradeData.tradeId),
      buyer: tradeData.buyer,
      seller: tradeData.seller,
      amount: tradeData.amount.toString(),
      status: Number(tradeData.status),
      deliveryTimestamp: Number(tradeData.deliveryTimestamp),
      pendingBotFee: tradeData.pendingBotFee.toString(),
      pendingfeeReceiverFee: tradeData.pendingfeeReceiverFee.toString(),
    };

    logger.debug(`Fetched trade ${tradeId} from contract: status=${TradeStatusNames[trade.status]}`);
    return trade;
  } catch (error) {
    logger.error(`Failed to fetch trade ${tradeId} from contract:`, error);
    return null;
  }
}

/**
 * Determine what actions are available for a user based on trade status and role
 *
 * @param {object} trade - Trade data from contract
 * @param {string} userWalletAddress - User's wallet address
 * @param {string} userRole - User's role ('buyer' or 'seller')
 * @returns {object} Available actions and trade state
 */
export function getUserActions(trade, userWalletAddress, userRole) {
  if (!trade) {
    return {
      availableActions: [],
      canAct: false,
      status: 'UNKNOWN',
      statusName: 'UNKNOWN',
    };
  }

  const { status, buyer, seller } = trade;
  const isBuyer = userWalletAddress.toLowerCase() === buyer.toLowerCase();
  const isSeller = userWalletAddress.toLowerCase() === seller.toLowerCase();
  
  // Verify user role matches their wallet address
  if ((userRole === 'buyer' && !isBuyer) || (userRole === 'seller' && !isSeller)) {
    return {
      availableActions: [],
      canAct: false,
      status,
      statusName: TradeStatusNames[status] || 'UNKNOWN',
      error: 'User role does not match wallet address',
    };
  }

  let availableActions = [];
  let canAct = false;

  switch (status) {
    case TradeStatus.Created:
      if (isBuyer) {
        availableActions = ['fund'];
        canAct = true;
      }
      break;

    case TradeStatus.Funded:
      if (isSeller) {
        availableActions = ['markDelivered'];
        canAct = true;
      }
      break;

    case TradeStatus.Delivered:
      if (isBuyer) {
        availableActions = ['approveAndRelease'];
        canAct = true;
      }
      break;

    case TradeStatus.Completed:
    case TradeStatus.Cancelled:
    case TradeStatus.Disputed:
      // No actions available in terminal states
      break;

    default:
      logger.warn(`Unknown trade status: ${status}`);
      break;
  }

  return {
    availableActions,
    canAct,
    status,
    statusName: TradeStatusNames[status] || 'UNKNOWN',
  };
}

/**
 * Get status color for Discord embed based on trade status
 *
 * @param {number} status - Trade status number
 * @returns {number} Discord color code
 */
export function getStatusColor(status) {
  switch (status) {
    case TradeStatus.Created:
      return 0xf1c40f; // Yellow - pending action
    case TradeStatus.Funded:
      return 0x3498db; // Blue - waiting for seller
    case TradeStatus.Delivered:
      return 0xe67e22; // Orange - waiting for buyer approval
    case TradeStatus.Completed:
      return 0x33d17a; // Green - success
    case TradeStatus.Cancelled:
      return 0x95a5a6; // Grey - cancelled
    case TradeStatus.Disputed:
      return 0xed4245; // Red - disputed
    default:
      return 0x2b2d31; // Dark grey - unknown
  }
}

/**
 * Validate that required blockchain environment variables are set
 *
 * @returns {boolean} True if all required variables are present
 */
export function validateBlockchainConfig() {
  const required = ['ESCROW_CONTRACT_ADDRESS', 'NETWORK_RPC_URL'];
  const missing = required.filter(key => !env[key]);
  
  if (missing.length > 0) {
    logger.error(`Missing blockchain environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
}