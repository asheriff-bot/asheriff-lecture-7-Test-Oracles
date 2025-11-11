/**
 * Calculate discounts for an order
 * 
 * @param {Object} order - The order object
 * @param {Object} profile - Customer profile with tier property
 * @param {string|null} couponCode - Optional coupon code
 * @returns {number} - Total discount amount in cents (positive number)
 */
function discounts(order, profile, couponCode = null) {
  let totalDiscount = 0;
  
  // Volume pricing discounts
  const volumeDiscounts = {
    'guest': { 12: 0.05, 24: 0.10 },
    'regular': { 12: 0.08, 24: 0.12 },
    'vip': { 12: 0.05, 24: 0.10 }
  };
  
  const tierDiscounts = volumeDiscounts[profile.tier] || volumeDiscounts['guest'];
  
  for (const item of order.items) {
    let itemSubtotal = item.unitPriceCents * item.qty;
    
    // Apply volume discount based on quantity
    if (item.qty >= 24 && tierDiscounts[24]) {
      totalDiscount += Math.floor(itemSubtotal * tierDiscounts[24]);
    } else if (item.qty >= 12 && tierDiscounts[12]) {
      totalDiscount += Math.floor(itemSubtotal * tierDiscounts[12]);
    }
  }
  
  // Coupon discounts
  if (couponCode) {
    const couponDiscount = applyCoupon(couponCode, order);
    totalDiscount += couponDiscount;
  }
  
  return totalDiscount;
}

/**
 * Apply coupon discount
 * @param {string} code - Coupon code
 * @param {Object} order - The order object
 * @returns {number} - Discount amount in cents
 */
function applyCoupon(code, order) {
  if (code === 'PIEROGI-BOGO') {
    let discount = 0;
    let firstSixPack = null;
    
    for (const item of order.items) {
      if (item.qty === 6) {
        if (!firstSixPack) {
          firstSixPack = item;
        } else {
          discount += Math.floor(item.unitPriceCents * item.qty * 0.5);
          break;
        }
      }
    }
    
    return discount;
  }
  
  if (code === 'FIRST10') {
    let discount = -0.10;
    let subtotal = 0;
    for (const item of order.items) {
      subtotal += item.unitPriceCents * item.qty;
    }
    return Math.floor(subtotal * discount);
  }
  
  return 0;
}

module.exports = { discounts };
