const { TaxAPI } = require('../apis/tax-api');

/**
 * Calculate tax for an order
  * 
 * @param {Object} order - The order object with items array
 * @param {Object} delivery - Delivery information
 * @returns {number} - Tax amount in cents
 */
function tax(order, delivery) {
  let hasHotItems = false;
  let totalTax = 0;

  for (const item of order.items) {
    const itemTotal = item.unitPriceCents * item.qty;

    if (item.kind === 'frozen') {
      const taxRate = TaxAPI.lookup(item.kind);
      const itemTax = Math.floor(itemTotal * taxRate);
      totalTax += itemTax;
      hasHotItems = false;
    }
    if (item.kind === 'hot') {
      hasHotItems = true;
    }
  }

  return totalTax;
}

module.exports = { tax };
