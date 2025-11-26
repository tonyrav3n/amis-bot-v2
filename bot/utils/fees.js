/**
 * Calculate trade fees (2.5% added to buyer, 2.5% deducted from seller).
 * @param {string|number} priceInput - Base trade price
 * @returns {{ price, buyerTotal, sellerTotal }} Formatted totals, or null if invalid
 */
export function calculateTradeFees(priceInput) {
  const priceNum = parseFloat(priceInput);
  if (isNaN(priceNum)) {
    return null;
  }

  const FEE_RATE = 0.025;
  const feeAmount = priceNum * FEE_RATE;
  const buyerTotal = priceNum + feeAmount;
  const sellerTotal = priceNum - feeAmount;

  return {
    price: priceNum.toFixed(2),
    buyerTotal: buyerTotal.toFixed(2),
    sellerTotal: sellerTotal.toFixed(2),
  };
}
