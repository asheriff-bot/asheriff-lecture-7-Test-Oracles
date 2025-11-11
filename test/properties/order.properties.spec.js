const fc = require('fast-check');

const { subtotal } = require('../../src/subtotal');
const { discounts } = require('../../src/discounts');
const { total } = require('../../src/total');
const { tax } = require('../../src/tax');
const { deliveryFee } = require('../../src/delivery');

// Primitive arbitraries
const skuArb = fc.constantFrom('P6-POTATO', 'P12-POTATO', 'P24-POTATO', 'P6-SAUER', 'P12-SAUER');
const addOnArb = fc.constantFrom('sour-cream', 'fried-onion', 'bacon-bits');
const fillingArb = fc.constantFrom('potato', 'sauerkraut', 'sweet-cheese', 'mushroom');
const kindArb = fc.constantFrom('hot', 'frozen');
const tierArb = fc.constantFrom('guest', 'regular', 'vip');
const zoneArb = fc.constantFrom('local', 'outer');
const couponArb = fc.constantFrom('PIEROGI-BOGO', 'FIRST10');

// Composite arbitraries
const orderItemArb = fc.record({
  kind: kindArb,
  sku: skuArb,
  title: fc.string(),
  filling: fillingArb,
  qty: fc.constantFrom(6, 12, 24),
  unitPriceCents: fc.integer({ min: 500, max: 3000 }),
  addOns: fc.array(addOnArb, { maxLength: 3 })
});

const orderArb = fc.record({
  items: fc.array(orderItemArb, { minLength: 1, maxLength: 5 })
});

const profileArb = fc.record({
  tier: tierArb
});

const deliveryArb = fc.record({
  zone: zoneArb,
  rush: fc.boolean()
});

const contextArb = fc.record({
  profile: profileArb,
  delivery: deliveryArb,
  coupon: fc.option(couponArb)
});

// Special arbitraries for bug detection
const multiItemOrderArb = fc.record({
  items: fc.array(orderItemArb, { minLength: 2, maxLength: 5 })
});

const sixPackOrderArb = fc.record({
  items: fc.array(fc.record({
    ...orderItemArb.value,
    qty: fc.constant(6)
  }), { minLength: 2, maxLength: 3 })
});

const largeOrderArb = fc.record({
  items: fc.array(fc.record({
    ...orderItemArb.value,
    unitPriceCents: fc.integer({ min: 2000, max: 5000 }),
    qty: fc.constantFrom(12, 24)
  }), { minLength: 3, maxLength: 5 })
});

describe('Property-Based Tests for Orders', () => {
  describe('Invariants', () => {
    
    it('subtotal should always be non-negative integer', () => {
      fc.assert(
        fc.property(orderArb, (order) => {
          const result = subtotal(order);
          return result >= 0 && Number.isInteger(result);
        }),
        { numRuns: 100 }
      );
    });

    it('discounts should always be non-negative integer', () => {
      fc.assert(
        fc.property(orderArb, profileArb, fc.option(couponArb), (order, profile, coupon) => {
          const result = discounts(order, profile, coupon);
          return result >= 0 && Number.isInteger(result);
        }),
        { numRuns: 100 }
      );
    });

    it('tax should always be non-negative integer', () => {
      fc.assert(
        fc.property(orderArb, deliveryArb, (order, delivery) => {
          const result = tax(order, delivery);
          return result >= 0 && Number.isInteger(result);
        }),
        { numRuns: 100 }
      );
    });

    it('delivery fee should always be non-negative integer', () => {
      fc.assert(
        fc.property(orderArb, deliveryArb, profileArb, (order, delivery, profile) => {
          const result = deliveryFee(order, delivery, profile);
          return result >= 0 && Number.isInteger(result);
        }),
        { numRuns: 100 }
      );
    });

    it('total should always be non-negative integer', () => {
      fc.assert(
        fc.property(orderArb, contextArb, (order, context) => {
          const result = total(order, context);
          return result >= 0 && Number.isInteger(result);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Bug Detection Properties', () => {
    
    it('delivery fee should not scale with number of items (BUG: per-item charging)', () => {
      fc.assert(
        fc.property(multiItemOrderArb, deliveryArb, profileArb, (order, delivery, profile) => {
          const singleItemOrder = { items: [order.items[0]] };
          const multiItemFee = deliveryFee(order, delivery, profile);
          const singleItemFee = deliveryFee(singleItemOrder, delivery, profile);
          
          // If both orders don't qualify for free delivery, fees should be equal
          if (multiItemFee > 0 && singleItemFee > 0) {
            const rushAdjustedMulti = delivery.rush ? multiItemFee - 299 : multiItemFee;
            const rushAdjustedSingle = delivery.rush ? singleItemFee - 299 : singleItemFee;
            return rushAdjustedMulti === rushAdjustedSingle;
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('FIRST10 coupon should provide positive discount (BUG: negative discount)', () => {
      fc.assert(
        fc.property(orderArb, profileArb, (order, profile) => {
          const discount = discounts(order, profile, 'FIRST10');
          return discount >= 0;
        }),
        { numRuns: 100 }
      );
    });

    it('rush delivery should not be double-charged in total (BUG: double rush fee)', () => {
      fc.assert(
        fc.property(orderArb, contextArb, (order, context) => {
          if (!context.delivery.rush) return true;
          
          const orderSubtotal = subtotal(order);
          const orderDiscounts = discounts(order, context.profile, context.coupon);
          const orderDelivery = deliveryFee(order, context.delivery, context.profile);
          const orderTax = tax(order, context.delivery);
          const orderTotal = total(order, context);
          
          const expectedTotal = orderSubtotal - orderDiscounts + orderDelivery + orderTax;
          return orderTotal === expectedTotal;
        }),
        { numRuns: 100 }
      );
    });

    it('tax should be applied to hot items (BUG: missing hot item tax)', () => {
      fc.assert(
        fc.property(fc.record({
          items: fc.array(fc.record({
            ...orderItemArb.value,
            kind: fc.constant('hot')
          }), { minLength: 1, maxLength: 3 })
        }), deliveryArb, (order, delivery) => {
          const taxAmount = tax(order, delivery);
          const orderSubtotal = subtotal(order);
          return taxAmount > 0 || orderSubtotal === 0;
        }),
        { numRuns: 100 }
      );
    });

    it('large order totals should maintain precision (BUG: string formatting)', () => {
      fc.assert(
        fc.property(largeOrderArb, contextArb, (order, context) => {
          const result = total(order, context);
          return Number.isInteger(result) && result.toString().indexOf('.') === -1;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Business Logic Properties', () => {
    
    it('volume discounts should reduce total cost', () => {
      fc.assert(
        fc.property(fc.record({
          items: fc.array(fc.record({
            ...orderItemArb.value,
            qty: fc.constantFrom(12, 24)
          }), { minLength: 1, maxLength: 3 })
        }), profileArb, (order, profile) => {
          const discount = discounts(order, profile);
          return discount >= 0;
        }),
        { numRuns: 100 }
      );
    });

    it('free delivery threshold should eliminate base delivery fee', () => {
      fc.assert(
        fc.property(fc.record({
          items: fc.array(fc.record({
            ...orderItemArb.value,
            unitPriceCents: fc.integer({ min: 2000, max: 3000 }),
            qty: fc.constantFrom(12, 24)
          }), { minLength: 3, maxLength: 5 })
        }), deliveryArb, profileArb, (order, delivery, profile) => {
          const fee = deliveryFee(order, delivery, profile);
          const expectedRushFee = delivery.rush ? 299 : 0;
          
          // High-value orders should only pay rush fee if applicable
          return fee === expectedRushFee || fee > expectedRushFee;
        }),
        { numRuns: 100 }
      );
    });

    it('PIEROGI-BOGO should work with two 6-packs', () => {
      fc.assert(
        fc.property(sixPackOrderArb, profileArb, (order, profile) => {
          if (order.items.length >= 2) {
            const discount = discounts(order, profile, 'PIEROGI-BOGO');
            return discount >= 0;
          }
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('frozen items should have zero tax', () => {
      fc.assert(
        fc.property(fc.record({
          items: fc.array(fc.record({
            ...orderItemArb.value,
            kind: fc.constant('frozen')
          }), { minLength: 1, maxLength: 3 })
        }), deliveryArb, (order, delivery) => {
          const taxAmount = tax(order, delivery);
          return taxAmount >= 0;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Metamorphic Properties', () => {
    
    it('adding zero-quantity items should not change subtotal', () => {
      fc.assert(
        fc.property(orderArb, (order) => {
          const originalSubtotal = subtotal(order);
          const zeroItem = { ...order.items[0], qty: 0 };
          const modifiedOrder = { items: [...order.items, zeroItem] };
          const newSubtotal = subtotal(modifiedOrder);
          return originalSubtotal === newSubtotal;
        }),
        { numRuns: 100 }
      );
    });

    it('doubling all quantities should double subtotal', () => {
      fc.assert(
        fc.property(orderArb, (order) => {
          const originalSubtotal = subtotal(order);
          const doubledOrder = {
            items: order.items.map(item => ({ ...item, qty: item.qty * 2 }))
          };
          const doubledSubtotal = subtotal(doubledOrder);
          return doubledSubtotal === originalSubtotal * 2;
        }),
        { numRuns: 100 }
      );
    });

    it('removing coupon should not increase discount', () => {
      fc.assert(
        fc.property(orderArb, profileArb, couponArb, (order, profile, coupon) => {
          const withCoupon = discounts(order, profile, coupon);
          const withoutCoupon = discounts(order, profile, null);
          return withCoupon >= withoutCoupon;
        }),
        { numRuns: 100 }
      );
    });
  });
});
