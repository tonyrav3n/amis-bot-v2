/**
 * Escrow contract integration utilities
 *
 * Provides functions to interact with the AmisEscrowManager smart contract,
 * including fetching trade status and determining appropriate actions.
 *
 * @module utils/escrow
 */

import { ethers } from 'ethers';

import escrowAbi from '../abi/AmisEscrow.sol/AmisEscrow.json' with { type: 'json' };
import { env } from '../config/env.js';

import { logger } from './logger.js';

// Trade status enum values from the contract
export const TradeStatus = {
  Created: 0,
  Funded: 1,
  Delivered: 2,
  Completed: 3,
  Disputed: 4,
};

/**
 * Creates a provider and contract instance for interacting with the escrow contract
 *
 * @returns {object} Provider and contract instances
 * @returns {ethers.JsonRpcProvider} provider - Ethers provider
 * @returns {ethers.Contract} contract - Escrow contract instance
 */
function createContractInstances() {
  if (!env.ESCROW_CONTRACT_ADDRESS) {
    throw new Error('ESCROW_CONTRACT_ADDRESS environment variable is not set');
  }

  if (!env.NETWORK_RPC_URL) {
    throw new Error('NETWORK_RPC_URL environment variable is not set');
  }

  const provider = new ethers.JsonRpcProvider(env.NETWORK_RPC_URL);
  const contract = new ethers.Contract(env.ESCROW_CONTRACT_ADDRESS, escrowAbi, provider);

  return { provider, contract };
}

/**
 * Fetches trade data from the escrow contract
 *
 * @param {number} tradeId - The trade ID to fetch
 * @returns {Promise<object|null>} Trade data or null if not found
 */
export async function getTradeData(tradeId) {
  try {
    const { contract } = createContractInstances();
    
    const trade = await contract.trades(tradeId);
    
    // Convert BigInt values to regular numbers for easier handling
    return {
      tradeId: Number(trade.tradeId),
      buyer: trade.buyer,
      seller: trade.seller,
      amount: Number(trade.amount),
      status: Number(trade.status),
      deliveryTimestamp: Number(trade.deliveryTimestamp),
      pendingBotFee: Number(trade.pendingBotFee),
      pendingfeeReceiverFee: Number(trade.pendingfeeReceiverFee),
    };
  } catch (error) {
    logger.error('Error fetching trade data from contract:', error);
    return null;
  }
}

/**
 * Gets a human-readable status text for a trade status
 *
 * @param {number} status - Numeric status from contract
 * @returns {string} Human-readable status text
 */
export function getStatusText(status) {
  switch (status) {
    case TradeStatus.Created:
      return 'CREATED';
    case TradeStatus.Funded:
      return 'FUNDED';
    case TradeStatus.Delivered:
      return 'DELIVERED';
    case TradeStatus.Completed:
      return 'COMPLETED';
    case TradeStatus.Disputed:
      return 'DISPUTED';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Determines which action buttons should be shown based on trade status and user role
 *
 * @param {object} tradeData - Trade data from getTradeData()
 * @param {string} userWalletAddress - User's wallet address
 * @returns {object} Object containing button visibility states
 * @returns {boolean} showFund - Show Fund button
 * @returns {boolean} showMarkDelivered - Show Mark Delivered button
 * @returns {boolean} showApproveRelease - Show Approve & Release button
 */
export function getActionButtons(tradeData, userWalletAddress) {
  if (!tradeData || !userWalletAddress) {
    return {
      showFund: false,
      showMarkDelivered: false,
      showApproveRelease: false,
    };
  }

  const normalizedUserAddress = userWalletAddress.toLowerCase();
  const isBuyer = tradeData.buyer.toLowerCase() === normalizedUserAddress;
  const isSeller = tradeData.seller.toLowerCase() === normalizedUserAddress;

  switch (tradeData.status) {
    case TradeStatus.Created:
      return {
        showFund: isBuyer,
        showMarkDelivered: false,
        showApproveRelease: false,
      };

    case TradeStatus.Funded:
      return {
        showFund: false,
        showMarkDelivered: isSeller,
        showApproveRelease: false,
      };

    case TradeStatus.Delivered:
      return {
        showFund: false,
        showMarkDelivered: false,
        showApproveRelease: isBuyer,
      };

    case TradeStatus.Completed:
    case TradeStatus.Disputed:
      return {
        showFund: false,
        showMarkDelivered: false,
        showApproveRelease: false,
      };

    default:
      return {
        showFund: false,
        showMarkDelivered: false,
        showApproveRelease: false,
      };
  }
}