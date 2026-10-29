import {
  Product,
  Community,
  Order,
  User,
  DashboardMetrics,
  OrderStatus,
  OrderNotification,
} from '../types/index.ts';
import { INITIAL_COMMUNITIES, INITIAL_PRODUCTS } from './mockData.ts';
import { validateCommunityAndBlock } from '../utils/pureLogic.ts';

const STORAGE_KEYS = {
  TOKEN: 'kanakadurga_auth_token',
  USER: 'kanakadurga_auth_user',
  PRODUCTS: 'kanakadurga_db_products',
  COMMUNITIES: 'kanakadurga_db_communities',
  ORDERS: 'kanakadurga_db_orders',
  API_URL: 'kanakadurga_api_base_url',
};

const LEGACY_STORAGE_KEYS = {
  TOKEN: 'taara_auth_token',
  USER: 'taara_auth_user',
  PRODUCTS: 'taara_db_products',
  COMMUNITIES: 'taara_db_communities',
  ORDERS: 'taara_db_orders',
  API_URL: 'taara_api_base_url',
};

function getStoredItem(key: string, legacyKey?: string): string | null {
  return localStorage.getItem(key) || (legacyKey ? localStorage.getItem(legacyKey) : null);
}

export class ApiClient {
  private baseUrl: string;
  private isLiveBackend: boolean = false;
  private token: string | null = null;
  private currentUser: User | null = null;

  constructor() {
    this.baseUrl = getStoredItem(STORAGE_KEYS.API_URL, LEGACY_STORAGE_KEYS.API_URL) || (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5001/api/v1';
    this.token = getStoredItem(STORAGE_KEYS.TOKEN, LEGACY_STORAGE_KEYS.TOKEN);
    const savedUser = getStoredItem(STORAGE_KEYS.USER, LEGACY_STORAGE_KEYS.USER);
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch {
        this.currentUser = null;
      }
    }
    this.initMockStorage();
  }

  private initMockStorage() {
    if (!getStoredItem(STORAGE_KEYS.COMMUNITIES, LEGACY_STORAGE_KEYS.COMMUNITIES)) {
      localStorage.setItem(STORAGE_KEYS.COMMUNITIES, JSON.stringify(INITIAL_COMMUNITIES));
    }
    if (!getStoredItem(STORAGE_KEYS.PRODUCTS, LEGACY_STORAGE_KEYS.PRODUCTS)) {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    }
    if (!getStoredItem(STORAGE_KEYS.ORDERS, LEGACY_STORAGE_KEYS.ORDERS)) {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/+$/, '');
    localStorage.setItem(STORAGE_KEYS.API_URL, this.baseUrl);
  }

  public getIsLive(): boolean {
    return this.isLiveBackend;
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public setAuth(token: string, user: User) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  public logout() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
  }

  public notifyDataUpdated(type: 'products' | 'communities' | 'orders' | 'all' = 'all') {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kanakadurga:data_updated', { detail: { type, timestamp: Date.now() } }));
      try {
        localStorage.setItem('kanakadurga_last_sync', JSON.stringify({ type, timestamp: Date.now() }));
      } catch {
        // ignore
      }
    }
  }

  private getHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  public async checkBackendHealth(): Promise<{ isLive: boolean; message: string }> {
    const candidates = [
      this.baseUrl,
      'http://localhost:5001/api/v1',
      'http://127.0.0.1:5001/api/v1',
      'http://localhost:5000/api/v1',
      'http://127.0.0.1:5000/api/v1',
      '/api/v1',
    ];
    const uniqueCandidates = Array.from(new Set(candidates));

    for (const url of uniqueCandidates) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 1500);
        const res = await fetch(`${url}/health`, {
          signal: controller.signal,
        });
        clearTimeout(id);
        if (res.ok) {
          this.baseUrl = url;
          localStorage.setItem(STORAGE_KEYS.API_URL, url);
          this.isLiveBackend = true;
          return { isLive: true, message: `Connected to Live Python Flask API & MongoDB (${url})` };
        }
      } catch {
        // Continue to next candidate
      }
    }

    this.isLiveBackend = false;
    return {
      isLive: false,
      message: 'Running in Browser Simulation mode (Flask backend not detected on ' + this.baseUrl + ')',
    };
  }

  // =================== Products =================== //

  public async getProducts(params?: { category?: string; search?: string; sort?: string }): Promise<Product[]> {
    try {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.search) query.set('search', params.search);
      if (params?.sort) query.set('sort', params.sort);
      const res = await fetch(`${this.baseUrl}/products?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        this.isLiveBackend = true;
        // Keep local cache synchronized with live database
        if (!params || (!params.category && !params.search && !params.sort)) {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
        }
        return data.products;
      }
    } catch (e) {
      console.warn('Flask fetch failed, falling back to local simulation', e);
    }

    // Local simulation fallback
    const raw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    let prods: Product[] = raw ? JSON.parse(raw) : INITIAL_PRODUCTS;
    prods = prods.filter((p) => p.isActive);

    if (params?.category && params.category.toLowerCase() !== 'all') {
      prods = prods.filter((p) => p.category.toLowerCase() === params.category?.toLowerCase());
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      prods = prods.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }

    if (params?.sort === 'price_asc') {
      prods.sort((a, b) => a.sellingPrice - b.sellingPrice);
    } else if (params?.sort === 'price_desc') {
      prods.sort((a, b) => b.sellingPrice - a.sellingPrice);
    } else if (params?.sort === 'discount_desc') {
      prods.sort((a, b) => {
        const discA = a.mrp > a.sellingPrice ? (a.mrp - a.sellingPrice) / a.mrp : 0;
        const discB = b.mrp > b.sellingPrice ? (b.mrp - b.sellingPrice) / b.mrp : 0;
        return discB - discA;
      });
    }

    return prods;
  }

  public async getProductById(id: string): Promise<Product | null> {
    try {
      const res = await fetch(`${this.baseUrl}/products/${id}`);
      if (res.ok) {
        this.isLiveBackend = true;
        return await res.json();
      }
    } catch (e) {
      console.warn('Flask fetch failed', e);
    }
    const prods = await this.getProducts();
    const cleanId = id.toLowerCase();
    return prods.find((p) => 
      p.id.toLowerCase() === cleanId || 
      (p.slug && p.slug.toLowerCase() === cleanId) || 
      (p.sku && p.sku.toLowerCase() === cleanId)
    ) || null;
  }

  // =================== Communities =================== //

  public async getCommunities(): Promise<Community[]> {
    try {
      const res = await fetch(`${this.baseUrl}/communities`);
      if (res.ok) {
        const data = await res.json();
        this.isLiveBackend = true;
        if (data.communities && data.communities.length > 0) {
          localStorage.setItem(STORAGE_KEYS.COMMUNITIES, JSON.stringify(data.communities));
        }
        return data.communities;
      }
    } catch (e) {
      console.warn('Flask fetch failed', e);
    }
    const raw = localStorage.getItem(STORAGE_KEYS.COMMUNITIES);
    const comms: Community[] = raw ? JSON.parse(raw) : INITIAL_COMMUNITIES;
    return comms.filter((c) => c.isActive);
  }

  public async validateCommunity(communityId: string, block: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const res = await fetch(`${this.baseUrl}/communities/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ communityId, block }),
      });
      if (res.ok) {
        this.isLiveBackend = true;
        const data = await res.json();
        return { valid: data.valid, error: data.error };
      }
    } catch (e) {
      console.warn('Flask validate failed', e);
    }

    const comms = await this.getCommunities();
    const comm = comms.find((c) => c.id === communityId);
    const result = validateCommunityAndBlock(comm, block);
    return { valid: result.isValid, error: result.error };
  }

  // =================== Authentication =================== //

  public async loginGoogle(idToken: string): Promise<{ token: string; user: User }> {
    if (this.isLiveBackend) {
      const res = await fetch(`${this.baseUrl}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Google login failed');
      }
      const data = await res.json();
      this.setAuth(data.token, data.user);
      return data;
    }

    // Local simulation
    const mockUser: User = {
      id: 'cust-google-' + Math.floor(Math.random() * 10000),
      displayName: 'Attapur Resident (Google)',
      email: 'customer@attapur.in',
      role: 'customer',
      createdAt: new Date().toISOString(),
    };
    const mockToken = 'mock-jwt-token-' + Date.now();
    this.setAuth(mockToken, mockUser);
    return { token: mockToken, user: mockUser };
  }

  public async registerCustomer(payload: {
    displayName: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }): Promise<{ token: string; user: User }> {
    if (this.isLiveBackend) {
      const res = await fetch(`${this.baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Registration failed');
      }
      const data = await res.json();
      this.setAuth(data.token, data.user);
      return data;
    }

    // Local simulation
    const cleanDigits = payload.phone.replace(/\D/g, '');
    const cleanPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : payload.phone.startsWith('+') ? payload.phone : `+${cleanDigits}`;
    const mockUser: User = {
      id: 'cust-pwd-' + Math.floor(Math.random() * 10000),
      displayName: payload.displayName,
      phone: cleanPhone,
      verifiedPhone: cleanPhone,
      role: 'customer',
      createdAt: new Date().toISOString(),
    };
    const mockToken = 'mock-jwt-token-' + Date.now();
    this.setAuth(mockToken, mockUser);
    return { token: mockToken, user: mockUser };
  }

  public async loginCustomer(payload: {
    phone: string;
    password: string;
  }): Promise<{ token: string; user: User }> {
    if (this.isLiveBackend) {
      const res = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
      }
      const data = await res.json();
      this.setAuth(data.token, data.user);
      return data;
    }

    // Local simulation
    const cleanDigits = payload.phone.replace(/\D/g, '');
    const cleanPhone = cleanDigits.length === 10 ? `+91${cleanDigits}` : payload.phone.startsWith('+') ? payload.phone : `+${cleanDigits}`;
    const mockUser: User = {
      id: 'cust-pwd-' + Math.floor(Math.random() * 10000),
      displayName: 'Attapur Resident',
      phone: cleanPhone,
      verifiedPhone: cleanPhone,
      role: 'customer',
      createdAt: new Date().toISOString(),
    };
    const mockToken = 'mock-jwt-token-' + Date.now();
    this.setAuth(mockToken, mockUser);
    return { token: mockToken, user: mockUser };
  }

  public async bootstrapAdmin(secret: string, email?: string): Promise<{ token: string; user: User }> {
    if (this.isLiveBackend) {
      const res = await fetch(`${this.baseUrl}/auth/admin/bootstrap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bootstrapSecret: secret, email }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Admin bootstrap failed');
      }
      const data = await res.json();
      this.setAuth(data.token, data.user);
      return data;
    }

    // Local simulation fallback
    const validSecrets = ['KanakaDurgaFireWorks2026'];
    if (!validSecrets.includes(secret)) {
      throw new Error('Invalid Administrator Secret Key. Please check your credentials.');
    }
    const adminUser: User = {
      id: 'admin-01',
      displayName: 'KanakaDurga Store Admin',
      email: email || 'abh1navreddy9095@gmail.com',
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
    const token = 'mock-admin-token-' + Date.now();
    this.setAuth(token, adminUser);
    return { token, user: adminUser };
  }

  // =================== Orders =================== //

  public async createOrder(payload: {
    communityId: string;
    deliveryAddress: {
      customerName: string;
      phone: string;
      block: string;
      floor: string;
      flat: string;
      landmark?: string;
      deliveryInstructions?: string;
    };
    items: Array<{ productId: string; quantity: number }>;
  }): Promise<Order> {
    if (this.isLiveBackend) {
      const res = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to place order');
      }
      const data = await res.json();
      return data.order;
    }

    // Local simulation with full atomic stock validation
    const comms = await this.getCommunities();
    const comm = comms.find((c) => c.id === payload.communityId);
    if (!comm) throw new Error('Selected community is invalid or inactive.');

    const blockCheck = validateCommunityAndBlock(comm, payload.deliveryAddress.block);
    if (!blockCheck.isValid) throw new Error(blockCheck.error);

    const prodsRaw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const allProds: Product[] = prodsRaw ? JSON.parse(prodsRaw) : INITIAL_PRODUCTS;

    let subtotal = 0;
    const verifiedItems = [];

    for (const item of payload.items) {
      const p = allProds.find((prod) => prod.id === item.productId);
      if (!p || !p.isActive) {
        throw new Error(`Product is no longer available.`);
      }
      if (p.stockQuantity < item.quantity) {
        throw new Error(`Insufficient stock for "${p.name}". Available: ${p.stockQuantity}, Ordered: ${item.quantity}.`);
      }
      // Deduct stock atomically
      p.stockQuantity -= item.quantity;
      subtotal += p.sellingPrice * item.quantity;
      verifiedItems.push({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        image: p.images[0] || '',
        unitPrice: p.sellingPrice,
        quantity: item.quantity,
        totalPrice: p.sellingPrice * item.quantity,
      });
    }

    if (subtotal < comm.minimumOrderAmount) {
      throw new Error(`Subtotal of ₹${subtotal} is below minimum order requirement of ₹${comm.minimumOrderAmount} for ${comm.name}.`);
    }

    // Save updated products stock
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(allProds));

    const orderNumber = 'KDF-2026-' + Math.floor(1000 + Math.random() * 9000);
    const nowIso = new Date().toISOString();
    const newOrder: Order = {
      id: 'ord-' + Date.now(),
      orderNumber,
      userId: this.currentUser?.id || 'guest-' + Date.now(),
      customerName: payload.deliveryAddress.customerName,
      customerPhone: payload.deliveryAddress.phone,
      communityId: comm.id,
      deliveryAddress: {
        ...payload.deliveryAddress,
        communityId: comm.id,
        communityName: comm.name,
      },
      items: verifiedItems,
      subtotal,
      deliveryFee: comm.deliveryFee,
      totalAmount: subtotal + comm.deliveryFee,
      paymentMethod: 'COD',
      paymentStatus: 'Pending Collection',
      orderStatus: 'Placed',
      events: [
        {
          previousStatus: 'None',
          newStatus: 'Placed',
          timestamp: nowIso,
          changedBy: payload.deliveryAddress.customerName,
          note: 'Order placed with Cash on Delivery (COD).',
        },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const orders: Order[] = ordersRaw ? JSON.parse(ordersRaw) : [];
    orders.unshift(newOrder);
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));

    return newOrder;
  }

  public async getMyOrders(): Promise<Order[]> {
    if (this.isLiveBackend) {
      try {
        const res = await fetch(`${this.baseUrl}/orders/me`, {
          headers: this.getHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          return data.orders;
        }
      } catch (e) {
        console.warn('Flask fetch failed', e);
      }
    }

    const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const orders: Order[] = ordersRaw ? JSON.parse(ordersRaw) : [];
    if (!this.currentUser) return orders;
    return orders.filter((o) => o.userId === this.currentUser?.id || this.currentUser?.role === 'admin');
  }

  public async getOrderById(orderId: string): Promise<Order | null> {
    if (this.isLiveBackend) {
      try {
        const res = await fetch(`${this.baseUrl}/orders/${orderId}`, {
          headers: this.getHeaders(),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.warn('Flask fetch failed', e);
      }
    }

    const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const orders: Order[] = ordersRaw ? JSON.parse(ordersRaw) : [];
    return orders.find((o) => o.id === orderId || o.orderNumber === orderId) || null;
  }

  // =================== Admin APIs =================== //

  public async getAdminDashboard(): Promise<DashboardMetrics> {
    try {
      const res = await fetch(`${this.baseUrl}/admin/dashboard`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        this.isLiveBackend = true;
        const data = await res.json();
        return data.metrics;
      }
    } catch (e) {
      console.warn('Flask fetch failed for dashboard metrics', e);
    }

    const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const orders: Order[] = ordersRaw ? JSON.parse(ordersRaw) : [];

    const prodsRaw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const prods: Product[] = prodsRaw ? JSON.parse(prodsRaw) : INITIAL_PRODUCTS;

    const commsRaw = localStorage.getItem(STORAGE_KEYS.COMMUNITIES);
    const comms: Community[] = commsRaw ? JSON.parse(commsRaw) : INITIAL_COMMUNITIES;

    const totalOrders = orders.length;
    const placedCount = orders.filter((o) => o.orderStatus === 'Placed').length;
    const acceptedCount = orders.filter((o) => o.orderStatus === 'Accepted').length;
    const packedCount = orders.filter((o) => o.orderStatus === 'Packed').length;
    const onTheWayCount = orders.filter((o) => o.orderStatus === 'On the Way').length;
    const deliveredCount = orders.filter((o) => o.orderStatus === 'Delivered').length;
    const cancelledCount = orders.filter((o) => o.orderStatus === 'Cancelled' || o.orderStatus === 'Rejected').length;

    const totalOrderValue = orders
      .filter((o) => o.orderStatus !== 'Cancelled' && o.orderStatus !== 'Rejected')
      .reduce((acc, o) => acc + o.totalAmount, 0);

    const deliveredRevenue = orders
      .filter((o) => o.orderStatus === 'Delivered')
      .reduce((acc, o) => acc + o.totalAmount, 0);

    const activeProducts = prods.filter((p) => p.isActive).length;
    const lowStockProducts = prods.filter((p) => p.isActive && p.stockQuantity <= p.lowStockThreshold).length;
    const activeCommunities = comms.filter((c) => c.isActive).length;

    return {
      totalOrders,
      placedCount,
      acceptedCount,
      packedCount,
      onTheWayCount,
      deliveredCount,
      cancelledCount,
      totalOrderValue,
      deliveredRevenue,
      activeProducts,
      lowStockProducts,
      activeCommunities,
    };
  }

  public async getAdminProducts(): Promise<Product[]> {
    try {
      const res = await fetch(`${this.baseUrl}/admin/products`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        this.isLiveBackend = true;
        const data = await res.json();
        if (data.products) {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
        }
        return data.products;
      }
    } catch (e) {
      console.warn('Flask fetch failed for admin products', e);
    }
    const prodsRaw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return prodsRaw ? JSON.parse(prodsRaw) : INITIAL_PRODUCTS;
  }

  public async createAdminProduct(productData: Partial<Product>): Promise<Product> {
    if (this.isLiveBackend) {
      const res = await fetch(`${this.baseUrl}/admin/products`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(productData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create product');
      }
      const data = await res.json();
      this.notifyDataUpdated('products');
      return data.product;
    }

    const prods = await this.getAdminProducts();
    const newProd: Product = {
      id: 'prod-' + Date.now(),
      sku: productData.sku || 'KDF-' + Math.floor(Math.random() * 1000),
      name: productData.name || 'New Cracker Item',
      slug: (productData.name || 'new-item').toLowerCase().replace(/\s+/g, '-'),
      category: productData.category || 'Sparklers',
      description: productData.description || '',
      images: productData.images || [],
      mrp: Number(productData.mrp) || 100,
      sellingPrice: Number(productData.sellingPrice) || 80,
      packQuantity: Number(productData.packQuantity) || 1,
      packUnit: productData.packUnit || 'box',
      safetyInformation: productData.safetyInformation || 'Maintain safety distance.',
      stockQuantity: Number(productData.stockQuantity) || 10,
      lowStockThreshold: Number(productData.lowStockThreshold) || 5,
      isFeatured: !!productData.isFeatured,
      isActive: productData.isActive !== false,
      isDemo: false,
    };
    prods.unshift(newProd);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
    this.notifyDataUpdated('products');
    return newProd;
  }

  public async updateAdminProduct(id: string, updates: Partial<Product>): Promise<void> {
    if (this.isLiveBackend) {
      const res = await fetch(`${this.baseUrl}/admin/products/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update product');
      }
      this.notifyDataUpdated('products');
      return;
    }

    const prods = await this.getAdminProducts();
    const idx = prods.findIndex((p) => p.id === id);
    if (idx !== -1) {
      prods[idx] = { ...prods[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
      this.notifyDataUpdated('products');
    }
  }

  public async deleteAdminProduct(id: string): Promise<{ archived?: boolean; message?: string }> {
    if (this.isLiveBackend) {
      const res = await fetch(`${this.baseUrl}/admin/products/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      const data = await res.json();
      this.notifyDataUpdated('products');
      return data;
    }

    // Check if referenced in orders
    const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const orders: Order[] = ordersRaw ? JSON.parse(ordersRaw) : [];
    const isReferenced = orders.some((o) => o.items.some((i) => i.productId === id));

    const prods = await this.getAdminProducts();
    const idx = prods.findIndex((p) => p.id === id);
    if (idx !== -1) {
      if (isReferenced) {
        // Safe archival
        prods[idx].isActive = false;
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
        this.notifyDataUpdated('products');
        return {
          archived: true,
          message: 'Product has past order references. Safely deactivated to preserve order history.',
        };
      } else {
        prods.splice(idx, 1);
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
        this.notifyDataUpdated('products');
        return { message: 'Product removed.' };
      }
    }
    return {};
  }

  public async adjustStock(productId: string, quantityChange: number, note: string): Promise<number> {
    if (this.isLiveBackend) {
      const res = await fetch(`${this.baseUrl}/admin/stock`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ productId, quantityChange, note }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to adjust stock');
      }
      const data = await res.json();
      this.notifyDataUpdated('products');
      return data.newStockQuantity;
    }

    const prods = await this.getAdminProducts();
    const p = prods.find((prod) => prod.id === productId);
    if (!p) throw new Error('Product not found');
    const newQty = p.stockQuantity + quantityChange;
    if (newQty < 0) throw new Error('Stock cannot be negative');
    p.stockQuantity = newQty;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
    this.notifyDataUpdated('products');
    return newQty;
  }

  public async uploadAdminImage(file: File): Promise<string> {
    if (this.isLiveBackend) {
      const formData = new FormData();
      formData.append('file', file);
      const headers: Record<string, string> = {};
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      const res = await fetch(`${this.baseUrl}/admin/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }
      return data.url;
    }

    throw new Error('Image uploading requires the live Python Flask backend and Cloudinary credentials to be configured.');
  }

  public async getAdminCommunities(): Promise<Community[]> {
    try {
      const res = await fetch(`${this.baseUrl}/admin/communities`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        this.isLiveBackend = true;
        const data = await res.json();
        if (data.communities) {
          localStorage.setItem(STORAGE_KEYS.COMMUNITIES, JSON.stringify(data.communities));
        }
        return data.communities;
      }
    } catch (e) {
      console.warn('Flask fetch failed for admin communities', e);
    }
    const raw = localStorage.getItem(STORAGE_KEYS.COMMUNITIES);
    return raw ? JSON.parse(raw) : INITIAL_COMMUNITIES;
  }

  public async createAdminCommunity(commData: Partial<Community>): Promise<Community> {
    if (this.isLiveBackend) {
      const res = await fetch(`${this.baseUrl}/admin/communities`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(commData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add community');
      }
      const data = await res.json();
      this.notifyDataUpdated('communities');
      return data.community;
    }

    const comms = await this.getAdminCommunities();
    const newComm: Community = {
      id: 'comm-' + Date.now(),
      name: commData.name || 'New Community',
      locality: commData.locality || 'Attapur, Hyderabad',
      allowedBlocks: commData.allowedBlocks || ['Block A'],
      minimumOrderAmount: Number(commData.minimumOrderAmount) || 1000,
      deliveryFee: Number(commData.deliveryFee) || 50,
      isActive: commData.isActive !== false,
    };
    comms.unshift(newComm);
    localStorage.setItem(STORAGE_KEYS.COMMUNITIES, JSON.stringify(comms));
    this.notifyDataUpdated('communities');
    return newComm;
  }

  public async updateAdminCommunity(id: string, updates: Partial<Community>): Promise<void> {
    if (this.isLiveBackend) {
      const res = await fetch(`${this.baseUrl}/admin/communities/${id}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update community');
      }
      this.notifyDataUpdated('communities');
      return;
    }

    const comms = await this.getAdminCommunities();
    const idx = comms.findIndex((c) => c.id === id);
    if (idx !== -1) {
      comms[idx] = { ...comms[idx], ...updates };
      localStorage.setItem(STORAGE_KEYS.COMMUNITIES, JSON.stringify(comms));
      this.notifyDataUpdated('communities');
    }
  }

  public async deleteAdminCommunity(id: string): Promise<{ archived?: boolean; deleted?: boolean; message?: string }> {
    if (this.isLiveBackend) {
      const res = await fetch(`${this.baseUrl}/admin/communities/${id}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete community');
      }
      this.notifyDataUpdated('communities');
      return data;
    }

    const comms = await this.getAdminCommunities();
    const idx = comms.findIndex((c) => c.id === id);
    if (idx !== -1) {
      const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const orders: Order[] = ordersRaw ? JSON.parse(ordersRaw) : [];
      const isReferenced = orders.some((o) => o.communityId === id);
      if (isReferenced) {
        comms[idx].isActive = false;
        localStorage.setItem(STORAGE_KEYS.COMMUNITIES, JSON.stringify(comms));
        this.notifyDataUpdated('communities');
        return { archived: true, deleted: false, message: 'Community has past order references. Safely deactivated.' };
      } else {
        comms.splice(idx, 1);
        localStorage.setItem(STORAGE_KEYS.COMMUNITIES, JSON.stringify(comms));
        this.notifyDataUpdated('communities');
        return { deleted: true, message: 'Community removed.' };
      }
    }
    return {};
  }

  public async getAdminOrders(statusFilter?: string, search?: string): Promise<Order[]> {
    try {
      const query = new URLSearchParams();
      if (statusFilter) query.set('status', statusFilter);
      if (search) query.set('search', search);
      const res = await fetch(`${this.baseUrl}/admin/orders?${query.toString()}`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        this.isLiveBackend = true;
        const data = await res.json();
        return data.orders;
      }
    } catch (e) {
      console.warn('Flask fetch failed for admin orders', e);
    }

    const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    let orders: Order[] = ordersRaw ? JSON.parse(ordersRaw) : [];
    if (statusFilter && statusFilter.toLowerCase() !== 'all') {
      orders = orders.filter((o) => o.orderStatus === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q) ||
          o.deliveryAddress.communityName.toLowerCase().includes(q)
      );
    }
    return orders;
  }

  public async updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    note?: string,
    cancellationReason?: string
  ): Promise<void> {
    if (this.isLiveBackend) {
      const res = await fetch(`${this.baseUrl}/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ status: newStatus, note, cancellationReason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update status');
      }
      this.notifyDataUpdated('orders');
      return;
    }

    // Local simulation with inventory restore on cancellation
    const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const orders: Order[] = ordersRaw ? JSON.parse(ordersRaw) : [];
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Order not found');

    const previousStatus = order.orderStatus;
    order.orderStatus = newStatus;
    order.updatedAt = new Date().toISOString();

    if (newStatus === 'Delivered') {
      order.paymentStatus = 'Collected';
    } else if (newStatus === 'Cancelled' || newStatus === 'Rejected') {
      order.paymentStatus = 'Cancelled';
      order.cancellationReason = cancellationReason || note;

      // Restore inventory exactly once
      const prodsRaw = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const prods: Product[] = prodsRaw ? JSON.parse(prodsRaw) : INITIAL_PRODUCTS;
      for (const item of order.items) {
        const p = prods.find((prod) => prod.id === item.productId);
        if (p) {
          p.stockQuantity += item.quantity;
        }
      }
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(prods));
    }

    order.events.push({
      previousStatus,
      newStatus,
      timestamp: new Date().toISOString(),
      changedBy: this.currentUser?.displayName || 'Store Admin',
      note: note || `Order updated to ${newStatus}`,
    });

    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    this.notifyDataUpdated('orders');
  }

  // =================== Admin Notifications =================== //

  public async getAdminNotifications(): Promise<{ unreadCount: number; notifications: OrderNotification[] }> {
    try {
      const res = await fetch(`${this.baseUrl}/admin/notifications`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        this.isLiveBackend = true;
        return await res.json();
      }
    } catch (e) {
      console.warn('Failed to fetch admin notifications from server', e);
    }

    const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const orders: Order[] = ordersRaw ? JSON.parse(ordersRaw) : [];
    const unreadCount = orders.filter((o) => !o.isReadByAdmin).length;
    const notifications: OrderNotification[] = orders.slice(0, 25).map((o) => ({
      orderId: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      communityName: o.deliveryAddress?.communityName || 'Attapur Society',
      totalAmount: o.totalAmount,
      orderStatus: o.orderStatus,
      isRead: !!o.isReadByAdmin,
      itemsCount: o.items?.length || 0,
      createdAt: o.createdAt,
    }));
    return { unreadCount, notifications };
  }

  public async markAdminNotificationRead(orderId: string): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/admin/notifications/${orderId}/read`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      if (res.ok) {
        this.notifyDataUpdated('orders');
        return;
      }
    } catch (e) {
      console.warn('Failed to mark notification read on backend', e);
    }

    const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const orders: Order[] = ordersRaw ? JSON.parse(ordersRaw) : [];
    const o = orders.find((ord) => ord.id === orderId || ord.orderNumber === orderId);
    if (o) {
      o.isReadByAdmin = true;
      o.readByAdminAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      this.notifyDataUpdated('orders');
    }
  }

  public async markAllAdminNotificationsRead(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/admin/notifications/mark-all-read`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      if (res.ok) {
        this.notifyDataUpdated('orders');
        return;
      }
    } catch (e) {
      console.warn('Failed to mark all notifications read on backend', e);
    }

    const ordersRaw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    const orders: Order[] = ordersRaw ? JSON.parse(ordersRaw) : [];
    orders.forEach((o) => {
      o.isReadByAdmin = true;
      o.readByAdminAt = new Date().toISOString();
    });
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    this.notifyDataUpdated('orders');
  }
}

export const api = new ApiClient();
