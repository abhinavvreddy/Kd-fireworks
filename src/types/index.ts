export type Role = 'customer' | 'admin';

export type OrderStatus = 'Placed' | 'Accepted' | 'Packed' | 'On the Way' | 'Delivered' | 'Cancelled' | 'Rejected';

export interface User {
  id: string;
  displayName: string;
  email?: string;
  phone?: string;
  verifiedPhone?: string;
  role: Role;
  selectedCommunityId?: string;
  createdAt: string;
}

export interface Community {
  id: string;
  name: string;
  locality: string;
  allowedBlocks: string[]; // e.g. ["Block A", "Block B", "Tower 1", "Tower 2"]
  minimumOrderAmount: number;
  deliveryFee: number;
  isActive: boolean;
  createdAt?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: 'Sparklers' | 'Ground Chakkars' | 'Flower Pots (Anar)' | 'Rockets' | 'Sound Crackers' | 'Aerial Shots' | 'Gift Boxes';
  description: string;
  images: string[];
  mrp: number;
  sellingPrice: number;
  packQuantity: number;
  packUnit: string; // e.g. "pieces / box", "shots", "pairs"
  safetyInformation: string;
  stockQuantity: number;
  reservedQuantity?: number;
  lowStockThreshold: number;
  isFeatured: boolean;
  isActive: boolean;
  isDemo?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface DeliveryAddress {
  customerName: string;
  phone: string;
  communityId: string;
  communityName: string;
  block: string;
  floor: string;
  flat: string;
  landmark?: string;
  deliveryInstructions?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  image: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface OrderEvent {
  id?: string;
  previousStatus: OrderStatus | 'None';
  newStatus: OrderStatus;
  timestamp: string;
  changedBy: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  communityId: string;
  deliveryAddress: DeliveryAddress;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: 'COD';
  paymentStatus: 'Pending Collection' | 'Collected' | 'Cancelled';
  orderStatus: OrderStatus;
  isReadByAdmin?: boolean;
  readByAdminAt?: string | null;
  cancellationReason?: string;
  events: OrderEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalOrders: number;
  placedCount: number;
  acceptedCount: number;
  packedCount: number;
  onTheWayCount: number;
  deliveredCount: number;
  cancelledCount: number;
  totalOrderValue: number;
  deliveredRevenue: number;
  activeProducts: number;
  lowStockProducts: number;
  activeCommunities?: number;
  unreadOrders?: number;
}

export interface OrderNotification {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  communityName: string;
  totalAmount: number;
  orderStatus: OrderStatus;
  isRead: boolean;
  itemsCount: number;
  createdAt: string;
}

export interface InventoryEvent {
  id: string;
  productId: string;
  productName: string;
  changeType: 'restock' | 'order_reservation' | 'order_cancelled_restore' | 'manual_adjustment';
  quantityChange: number;
  resultingStock: number;
  relatedOrderId?: string;
  adminName?: string;
  timestamp: string;
  note?: string;
}
