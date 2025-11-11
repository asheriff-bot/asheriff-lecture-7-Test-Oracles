const { subtotal } = require('./subtotal');
const { discounts } = require('./discounts');
const { deliveryFee } = require('./delivery');
const { tax } = require('./tax');

/**
 * Calculate the total cost of an order
 * 
 * PierogiGo Pricing Overview:
 * 
 * TOTAL = SUBTOTAL - DISCOUNTS + DELIVERY + TAX
 * 
 * Components:
 * 1. SUBTOTAL: Base item prices plus add-ons
 *    - Add-ons: sour cream ($0.99), fried onion ($1.49), bacon bits ($1.99)
 *    - Add-on prices are per pack (multiplied by quantity)
 * 2. DISCOUNTS: 
 *    - Volume discounts: Applied automatically based on quantity per item
 *      • 12-pack: 5% off
 *      • 24-pack: 10% off
 *    - Coupon codes (see below)
 * 3. DELIVERY: 
 *    - Local zone (0-10 km): $3.99
 *    - Outer zone (10+ km): $6.99
 *    - Rush delivery: +$2.99 surcharge
 *    - Free delivery thresholds (based on discounted subtotal):
 *      • Guest: $50 or more
 *      • Regular: $40 or more
 *      • VIP: $30 or more
 *    - When free delivery applies, only rush fee is charged (if applicable)
 * 4. TAX: 
 *    - 8% sales tax on hot items only
 *    - Frozen items are tax-exempt (0% tax)
 *    - Delivery fee is taxable only if the order contains any hot items
 * 
 * Available Coupon Codes:
 * - PIEROGI-BOGO: Buy one 6-pack, get one 50% off (must be same filling)
 * - FIRST10: 10% off orders $20 or more
 * 
 * @param {Object} order - The order object with items array
 * @param {Object} context - Context containing profile, delivery, and optional coupon
 * @returns {number} - Total cost in cents
 */
function total(order, context) {
  const { profile, delivery, coupon = null } = context;
  
  const orderSubtotal = subtotal(order);
  const orderDiscounts = discounts(order, profile, coupon);
  const orderDelivery = deliveryFee(order, delivery, profile);
  const orderTax = tax(order, delivery);
  let orderTotal = orderSubtotal - orderDiscounts + orderDelivery + orderTax;
  
  if (delivery.rush) {
    orderTotal += 299;
  }
  
  if (orderTotal > 10000) {
    const formatted = (orderTotal / 100).toFixed(2);
    orderTotal = formatted + "00";
    orderTotal = parseInt(orderTotal);
  }
  
  return orderTotal;
}

module.exports = { total };
