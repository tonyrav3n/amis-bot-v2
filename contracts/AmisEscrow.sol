// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import '@openzeppelin/contracts/security/ReentrancyGuard.sol';

contract AmisEscrowManager is ReentrancyGuard {
  uint256 public constant FEE_BPS = 250; // 2.5%
  uint256 public constant TOTAL_FEE_BPS = 500; // 5% total (2.5% buyer + 2.5% seller)
  uint256 public constant BOT_SHARE_BPS = 100; // 1%

  address public bot;
  address public feeReceiver;
  uint256 public tradeCount;

  uint256 public immutable releaseTimeout = 1 days;

  enum TradeStatus {
    Created, // Kept for enum consistency, but trades will start at Funded
    Funded,
    Delivered,
    Completed,
    Cancelled,
    Disputed
  }

  struct Trade {
    uint256 tradeId;
    address buyer;
    address seller;
    uint256 amount;
    TradeStatus status;
    uint256 deliveryTimestamp;
    uint256 pendingBotFee;
    uint256 pendingfeeReceiverFee;
  }

  mapping(uint256 => Trade) public trades;

  // --- EVENTS ---
  event Created(
    uint256 indexed tradeId,
    address indexed buyer,
    address indexed seller,
    uint256 amount
  );
  event Funded(uint256 indexed tradeId, address indexed buyer, uint256 amount);
  event Delivered(uint256 indexed tradeId, address indexed seller);
  event Approved(uint256 indexed tradeId, address indexed buyer);
  event Released(uint256 indexed tradeId, address indexed to, uint256 amount);
  event Disputed(uint256 indexed tradeId, address indexed raisedBy);
  event Refunded(
    uint256 indexed tradeId,
    address indexed buyer,
    uint256 amount
  );
  // Cancelled event removed as feature is removed
  event BuyerFeeSplit(
    uint256 indexed tradeId,
    uint256 buyerFee,
    uint256 botFee,
    uint256 feeReceiverFee
  );
  event SellerFeeSplit(
    uint256 indexed tradeId,
    uint256 sellerFee,
    uint256 botFee,
    uint256 feeReceiverFee
  );

  modifier onlyBot() {
    require(msg.sender == bot, 'only bot can call this');
    _;
  }

  constructor(address _bot, address _feeReceiver) {
    require(_bot != address(0) && _feeReceiver != address(0), 'invalid addr');
    bot = _bot;
    feeReceiver = _feeReceiver;
  }

  // --- TRADE CREATION & FUNDING (Merged) ---
  /**
   * @notice Called by Buyer via frontend (Web3Modal).
   * @param _seller The wallet address of the seller.
   * @param _tradeAmount The amount of ETH (in wei) the trade is for (excluding fees).
   * msg.value must equal _tradeAmount + 2.5% fee.
   */
  function createAndFundTrade(
    address _seller,
    uint256 _tradeAmount
  ) external payable nonReentrant returns (uint256) {
    require(_seller != address(0), 'invalid address');
    require(msg.sender != _seller, 'buyer cannot be seller');
    require(_tradeAmount > 0, 'amount must be greater than 0');

    // Calculate required funding: Amount + 2.5%
    uint256 buyerFee = (_tradeAmount * FEE_BPS) / 10000;
    uint256 requiredTotal = _tradeAmount + buyerFee;

    require(msg.value == requiredTotal, 'incorrect funding amount');

    tradeCount++;
    uint256 id = tradeCount;

    // Calculate fee splits immediately
    uint256 botFee = (buyerFee * BOT_SHARE_BPS) / TOTAL_FEE_BPS;
    uint256 feeReceiverFee = buyerFee - botFee;

    trades[id] = Trade({
      tradeId: id,
      buyer: msg.sender,
      seller: _seller,
      amount: _tradeAmount,
      status: TradeStatus.Funded, // Directly set to Funded
      deliveryTimestamp: 0,
      pendingBotFee: botFee,
      pendingfeeReceiverFee: feeReceiverFee
    });

    // Emit events for tracking
    emit Created(id, msg.sender, _seller, _tradeAmount);
    emit BuyerFeeSplit(id, buyerFee, botFee, feeReceiverFee);
    emit Funded(id, msg.sender, _tradeAmount);

    return id;
  }

  // --- DELIVERY (Triggered by Seller via Discord -> Bot) ---
  function markDelivered(uint256 tradeId) external onlyBot {
    require(tradeId > 0 && tradeId <= tradeCount, 'invalid trade id');

    Trade storage t = trades[tradeId];

    require(
      t.status == TradeStatus.Funded,
      "can only mark delivered at 'funded' state"
    );
    t.status = TradeStatus.Delivered;
    t.deliveryTimestamp = block.timestamp;
    emit Delivered(tradeId, t.seller);
  }

  // --- RELEASE (Triggered by Buyer via Discord -> Bot) ---
  function approveDelivery(uint256 tradeId) external onlyBot nonReentrant {
    require(tradeId > 0 && tradeId <= tradeCount, 'invalid trade id');

    Trade storage t = trades[tradeId];

    // Buyer approves the delivery via Discord, triggering this
    require(
      t.status == TradeStatus.Delivered,
      "can only approve delivery at 'delivered' state"
    );
    emit Approved(tradeId, t.buyer);
    _release(tradeId);
  }

  // --- AUTO RELEASE (Optional safety net) ---
  function releaseAfterTimeout(uint256 tradeId) external onlyBot nonReentrant {
    require(tradeId > 0 && tradeId <= tradeCount, 'invalid trade id');

    Trade storage t = trades[tradeId];

    require(
      t.status == TradeStatus.Delivered,
      "can only auto release at 'delivered' state"
    );
    require(
      block.timestamp >= t.deliveryTimestamp + releaseTimeout,
      'timeout not reached'
    );
    _release(tradeId);
  }

  // Internal release logic
  function _release(uint256 tradeId) internal {
    require(tradeId > 0 && tradeId <= tradeCount, 'invalid trade id');

    Trade storage t = trades[tradeId];

    require(t.status != TradeStatus.Completed, 'already completed');
    t.status = TradeStatus.Completed;

    uint256 sellerFee = (t.amount * FEE_BPS) / 10000;
    uint256 payout = t.amount - sellerFee;

    uint256 botFee = (sellerFee * BOT_SHARE_BPS) / TOTAL_FEE_BPS;
    uint256 feeReceiverFee = sellerFee - botFee;

    emit SellerFeeSplit(tradeId, sellerFee, botFee, feeReceiverFee);

    t.pendingBotFee += botFee;
    t.pendingfeeReceiverFee += feeReceiverFee;

    uint256 botAmount = t.pendingBotFee;
    uint256 receiverAmount = t.pendingfeeReceiverFee;

    t.pendingBotFee = 0;
    t.pendingfeeReceiverFee = 0;

    (bool sentSeller, ) = t.seller.call{ value: payout }('');
    require(sentSeller, 'seller transfer failed');

    (bool sentBot, ) = bot.call{ value: botAmount }('');
    require(sentBot, 'bot transfer failed');

    (bool sentFeeReceiver, ) = feeReceiver.call{ value: receiverAmount }('');
    require(sentFeeReceiver, 'feeReceiver transfer failed');

    emit Released(tradeId, t.seller, payout);
  }

  // --- DISPUTE ---
  function openDispute(uint256 tradeId, address raisedBy) external onlyBot {
    require(tradeId > 0 && tradeId <= tradeCount, 'invalid trade id');

    Trade storage t = trades[tradeId];

    // Dispute usually happens after delivery is claimed but buyer disagrees
    require(
      t.status == TradeStatus.Delivered,
      'can dispute only after delivery'
    );
    require(
      raisedBy == t.buyer || raisedBy == t.seller,
      'invalid dispute raiser'
    );

    t.status = TradeStatus.Disputed;
    emit Disputed(tradeId, raisedBy);
  }

  function resolveDispute(
    uint256 tradeId,
    uint256 buyerShareBps,
    uint256 sellerShareBps
  ) external onlyBot nonReentrant {
    require(tradeId > 0 && tradeId <= tradeCount, 'invalid trade id');

    Trade storage t = trades[tradeId];

    require(t.status == TradeStatus.Disputed, 'not in dispute');
    require(buyerShareBps + sellerShareBps == 10000, 'invalid split');

    t.status = TradeStatus.Completed;

    uint256 totalFee = (t.amount * FEE_BPS) / 10000;
    uint256 distributable = t.amount - totalFee;

    uint256 buyerPayout = (distributable * buyerShareBps) / 10000;
    uint256 sellerPayout = (distributable * sellerShareBps) / 10000;

    uint256 botFee = (totalFee * BOT_SHARE_BPS) / TOTAL_FEE_BPS;
    uint256 feeReceiverFee = totalFee - botFee;

    t.pendingBotFee += botFee;
    t.pendingfeeReceiverFee += feeReceiverFee;

    uint256 botAmount = t.pendingBotFee;
    uint256 receiverAmount = t.pendingfeeReceiverFee;

    t.pendingBotFee = 0;
    t.pendingfeeReceiverFee = 0;

    if (buyerPayout > 0) {
      (bool sentBuyer, ) = t.buyer.call{ value: buyerPayout }('');
      require(sentBuyer, 'buyer transfer failed');
    }

    if (sellerPayout > 0) {
      (bool sentSeller, ) = t.seller.call{ value: sellerPayout }('');
      require(sentSeller, 'seller transfer failed');
    }

    (bool sentBot, ) = bot.call{ value: botAmount }('');
    require(sentBot, 'bot transfer failed');

    (bool sentFeeReceiver, ) = feeReceiver.call{ value: receiverAmount }('');
    require(sentFeeReceiver, 'feeReceiver transfer failed');

    emit Refunded(tradeId, t.buyer, buyerPayout);
    emit Released(tradeId, t.seller, sellerPayout);
  }
}

