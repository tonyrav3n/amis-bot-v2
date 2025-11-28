/**
 * Calculates trade fees and totals for buyer and seller.
 *
 * Policy: 2.5% fee added to the buyer, 2.5% fee deducted from the seller.
 *
 * @param {string|number} priceInput - Base price of the trade item.
 * @returns {{price: string, buyerTotal: string, sellerTotal: string}|null} Normalized fee breakdown or null if invalid.
 */
export function calculateTradeFees(priceInput) {
  const priceNum = parseFloat(priceInput);

  if (isNaN(priceNum)) {
    return null;
  }

  const FEE_RATE = 0.025;
  const feeAmountNum = priceNum * FEE_RATE;
  const buyerTotalNum = priceNum + feeAmountNum;
  const sellerTotalNum = priceNum - feeAmountNum;

  const price = priceNum.toFixed(2);
  const buyerTotal = buyerTotalNum.toFixed(2);
  const sellerTotal = sellerTotalNum.toFixed(2);

  return {
    price,
    buyerTotal,
    sellerTotal,
  };
}
