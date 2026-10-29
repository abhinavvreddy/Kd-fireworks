import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDiscount,
  calculateCartTotals,
  validateCommunityAndBlock,
  canTransitionStatus,
  formatRupee,
  validateOrderPlacementEligibility,
} from './pureLogic.ts';
import { Community, Product } from '../types/index.ts';

const mockProductA: Product = {
  id: 'prod-1',
  sku: 'TRC-SPK-01',
  name: 'Standard Gold Sparklers',
  slug: 'standard-gold-sparklers',
  category: 'Sparklers',
  description: '10 pieces per pack, 15cm sparklers',
  images: [],
  mrp: 200,
  sellingPrice: 150,
  packQuantity: 10,
  packUnit: 'pieces',
  safetyInformation: 'Adult supervision required',
  stockQuantity: 50,
  lowStockThreshold: 10,
  isFeatured: true,
  isActive: true,
};

const mockProductB: Product = {
  id: 'prod-2',
  sku: 'TRC-CHK-02',
  name: 'Deluxe Ground Chakkars',
  slug: 'deluxe-ground-chakkars',
  category: 'Ground Chakkars',
  description: '10 pieces per box spinning wheels',
  images: [],
  mrp: 350,
  sellingPrice: 280,
  packQuantity: 10,
  packUnit: 'pieces',
  safetyInformation: 'Place flat on hard smooth ground',
  stockQuantity: 20,
  lowStockThreshold: 5,
  isFeatured: false,
  isActive: true,
};

const mockCommunity: Community = {
  id: 'comm-1',
  name: 'Janapriya Utopia',
  locality: 'Attapur, Hyderabad',
  allowedBlocks: ['Block A', 'Block B', 'Block C', 'Tower 1'],
  minimumOrderAmount: 1000,
  deliveryFee: 50,
  isActive: true,
};

test('calculateDiscount returns correct rounded percentage', () => {
  assert.equal(calculateDiscount(200, 150), 25);
  assert.equal(calculateDiscount(1000, 800), 20);
  assert.equal(calculateDiscount(100, 100), 0);
  assert.equal(calculateDiscount(100, 150), 0);
  assert.equal(calculateDiscount(0, 50), 0);
});

test('calculateCartTotals calculates subtotal, delivery fee, and shortfall accurately', () => {
  const items = [
    { product: mockProductA, quantity: 2 }, // 2 * 150 = 300
    { product: mockProductB, quantity: 1 }, // 1 * 280 = 280. Total subtotal = 580
  ];

  const result = calculateCartTotals(items, 50, 1000);
  assert.equal(result.subtotal, 580);
  assert.equal(result.deliveryFee, 50);
  assert.equal(result.total, 630);
  assert.equal(result.itemCount, 3);
  assert.equal(result.meetsMinimum, false);
  assert.equal(result.shortfall, 420);

  // If subtotal exceeds minimum
  const itemsExceeding = [
    { product: mockProductA, quantity: 8 }, // 8 * 150 = 1200
  ];
  const result2 = calculateCartTotals(itemsExceeding, 50, 1000);
  assert.equal(result2.subtotal, 1200);
  assert.equal(result2.meetsMinimum, true);
  assert.equal(result2.shortfall, 0);
  assert.equal(result2.total, 1250);
});

test('validateCommunityAndBlock checks active status and allowed blocks case-insensitively', () => {
  // Valid block
  const valid = validateCommunityAndBlock(mockCommunity, 'Block A');
  assert.equal(valid.isValid, true);

  // Valid block with lowercase / trim
  const validCase = validateCommunityAndBlock(mockCommunity, '  tower 1 ');
  assert.equal(validCase.isValid, true);

  // Invalid block
  const invalidBlock = validateCommunityAndBlock(mockCommunity, 'Block Z');
  assert.equal(invalidBlock.isValid, false);
  assert.match(invalidBlock.error || '', /not on the approved delivery list/i);

  // Inactive community
  const inactiveCommunity = { ...mockCommunity, isActive: false };
  const inactiveResult = validateCommunityAndBlock(inactiveCommunity, 'Block A');
  assert.equal(inactiveResult.isValid, false);
  assert.match(inactiveResult.error || '', /currently inactive/i);

  // Missing community
  const missingResult = validateCommunityAndBlock(undefined, 'Block A');
  assert.equal(missingResult.isValid, false);
});

test('canTransitionStatus strictly regulates order lifecycle', () => {
  // Step-by-step valid transitions
  assert.equal(canTransitionStatus('Placed', 'Accepted'), true);
  assert.equal(canTransitionStatus('Accepted', 'Packed'), true);
  assert.equal(canTransitionStatus('Packed', 'On the Way'), true);
  assert.equal(canTransitionStatus('On the Way', 'Delivered'), true);

  // Skipping forward is invalid
  assert.equal(canTransitionStatus('Placed', 'Delivered'), false);
  assert.equal(canTransitionStatus('Placed', 'Packed'), false);

  // Moving backward is invalid
  assert.equal(canTransitionStatus('Packed', 'Accepted'), false);
  assert.equal(canTransitionStatus('Delivered', 'On the Way'), false);

  // Cancellation from in-progress is allowed
  assert.equal(canTransitionStatus('Placed', 'Cancelled'), true);
  assert.equal(canTransitionStatus('Accepted', 'Cancelled'), true);
  assert.equal(canTransitionStatus('Packed', 'Cancelled'), true);
  assert.equal(canTransitionStatus('On the Way', 'Cancelled'), true);

  // Terminal states cannot transition further
  assert.equal(canTransitionStatus('Delivered', 'Cancelled'), false);
  assert.equal(canTransitionStatus('Cancelled', 'Placed'), false);
  assert.equal(canTransitionStatus('Rejected', 'Accepted'), false);
});

test('formatRupee displays INR symbol and proper commas', () => {
  const formatted = formatRupee(1450);
  assert.ok(formatted.includes('1,450') || formatted.includes('1450'));
  assert.ok(formatted.includes('₹'));
});

test('validateOrderPlacementEligibility strictly blocks unauthenticated orders', () => {
  // Guest user cannot place order
  const guestResult = validateOrderPlacementEligibility(null, 1500, 1000);
  assert.equal(guestResult.canPlaceOrder, false);
  assert.ok(guestResult.reason?.includes('Resident sign-in is mandatory'));

  // Logged-in user below minimum cannot place order
  const lowAmountResult = validateOrderPlacementEligibility({ id: 'user-1' }, 800, 1000);
  assert.equal(lowAmountResult.canPlaceOrder, false);

  // Authenticated user with minimum order can place order
  const validResult = validateOrderPlacementEligibility({ id: 'user-1' }, 1500, 1000);
  assert.equal(validResult.canPlaceOrder, true);
});
