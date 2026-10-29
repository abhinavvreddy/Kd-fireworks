import { Community, OrderStatus, Product } from '../types/index.ts';

/**
 * Calculates discount percentage between MRP and selling price
 */
export function calculateDiscount(mrp: number, sellingPrice: number): number {
  if (mrp <= 0 || sellingPrice < 0 || sellingPrice >= mrp) {
    return 0;
  }
  return Math.round(((mrp - sellingPrice) / mrp) * 100);
}

/**
 * Calculates cart subtotal, delivery fee application, and final total
 */
export function calculateCartTotals(
  items: Array<{ product: Product; quantity: number }>,
  deliveryFee: number = 0,
  minimumOrderAmount: number = 0
): {
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
  meetsMinimum: boolean;
  shortfall: number;
} {
  const subtotal = items.reduce((acc, item) => {
    return acc + Math.max(0, item.product.sellingPrice) * Math.max(0, item.quantity);
  }, 0);

  const itemCount = items.reduce((acc, item) => acc + Math.max(0, item.quantity), 0);
  const meetsMinimum = subtotal >= minimumOrderAmount;
  const shortfall = Math.max(0, minimumOrderAmount - subtotal);
  const finalFee = items.length > 0 ? Math.max(0, deliveryFee) : 0;
  const total = items.length > 0 ? subtotal + finalFee : 0;

  return {
    subtotal,
    deliveryFee: finalFee,
    total,
    itemCount,
    meetsMinimum,
    shortfall,
  };
}

/**
 * Validates whether a community is active and the selected block is permitted
 */
export function validateCommunityAndBlock(
  community: Community | undefined,
  block: string
): { isValid: boolean; error?: string } {
  if (!community) {
    return { isValid: false, error: 'Please select an authorized residential community in Attapur.' };
  }
  if (!community.isActive) {
    return { isValid: false, error: `Delivery to ${community.name} is currently inactive.` };
  }
  if (!block || !block.trim()) {
    return { isValid: false, error: 'Block / Tower designation is required for delivery.' };
  }
  const cleanBlock = block.trim().toLowerCase();
  const allowed = community.allowedBlocks.some(
    (b) => b.trim().toLowerCase() === cleanBlock
  );
  if (!allowed) {
    return {
      isValid: false,
      error: `Selected block "${block}" is not on the approved delivery list for ${community.name}.`,
    };
  }
  return { isValid: true };
}

/**
 * Enforces valid order status transitions
 * Placed -> Accepted -> Packed -> On the Way -> Delivered
 * Any non-terminal state may be Cancelled
 */
export function canTransitionStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
): boolean {
  if (currentStatus === nextStatus) return false;
  if (currentStatus === 'Delivered' || currentStatus === 'Cancelled' || currentStatus === 'Rejected') {
    return false; // Terminal states
  }

  // Cancellation or Rejection is permitted from active stages
  if (nextStatus === 'Cancelled' || nextStatus === 'Rejected') {
    return true;
  }

  const forwardMap: Record<OrderStatus, OrderStatus[]> = {
    Placed: ['Accepted'],
    Accepted: ['Packed'],
    Packed: ['On the Way'],
    'On the Way': ['Delivered'],
    Delivered: [],
    Cancelled: [],
    Rejected: [],
  };

  return (forwardMap[currentStatus] || []).includes(nextStatus);
}

/**
 * Formats a number to Indian Rupee representation (₹) with en-IN locale
 */
export function formatRupee(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  const rounded = Math.round(amount);
  return `₹${rounded.toLocaleString('en-IN')}`;
}

/**
 * Formats date to Indian Standard Time readable string
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

/**
 * Validates whether an order can be placed based on mandatory user authentication and minimum order value
 */
export function validateOrderPlacementEligibility(
  user: { id: string } | null | undefined,
  subtotal: number,
  minimumOrderAmount: number
): { canPlaceOrder: boolean; reason?: string } {
  if (!user) {
    return {
      canPlaceOrder: false,
      reason: 'Resident sign-in is mandatory to place an order.',
    };
  }
  if (subtotal < minimumOrderAmount) {
    return {
      canPlaceOrder: false,
      reason: 'Order subtotal is below the minimum community requirement.',
    };
  }
  return { canPlaceOrder: true };
}
