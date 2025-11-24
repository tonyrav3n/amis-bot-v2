/**
 * Calculate trade fees and totals for buyers and sellers.
 * Current Policy: 2.5% fee added to buyer, 2.5% fee deducted from seller.
 * * @param {string|number} priceInput - The base price of the item
 * @returns {Object} Calculated totals and formatted text
 */
export function calculateTradeFees(priceInput) {
  const priceNum = parseFloat(priceInput);

  // Guard against invalid inputs if validation hasn't caught it yet
  if (isNaN(priceNum)) {
    return null;
  }

  const FEE_RATE = 0.025; // 2.5%
  const feeAmountNum = priceNum * FEE_RATE;
  const buyerTotalNum = priceNum + feeAmountNum;
  const sellerTotalNum = priceNum - feeAmountNum;

  // Format all values to 2 decimal places
  const price = priceNum.toFixed(2);
  const buyerTotal = buyerTotalNum.toFixed(2);
  const sellerTotal = sellerTotalNum.toFixed(2);

  return {
    price,
    buyerTotal,
    sellerTotal,
  };
}
