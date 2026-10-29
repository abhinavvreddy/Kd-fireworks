import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, User, Community, Order } from '../types/index.ts';
import { api } from '../api/client.ts';

interface StoreContextType {
  cartItems: CartItem[];
  cartCount: number;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  logout: () => void;
  isLiveBackend: boolean;
  checkBackendHealth: () => Promise<void>;
  communities: Community[];
  refreshCommunities: () => Promise<void>;
  lastPlacedOrder: Order | null;
  setLastPlacedOrder: (order: Order | null) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'kanakadurga_cart_items';
const LEGACY_CART_STORAGE_KEY = 'taara_cart_items';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => api.getCurrentUser());
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);

  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY) || localStorage.getItem(LEGACY_CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  const checkBackendHealth = async () => {
    try {
      const health = await api.checkBackendHealth();
      setIsLiveBackend(health.isLive);
    } catch {
      setIsLiveBackend(false);
    }
  };

  const refreshCommunities = async () => {
    try {
      const comms = await api.getCommunities();
      setCommunities(comms);
    } catch (e) {
      console.warn('Failed to load communities:', e);
    }
  };

  useEffect(() => {
    const init = async () => {
      await checkBackendHealth();
      await refreshCommunities();
    };
    init();

    const handleSync = (e: any) => {
      if (!e.detail || e.detail.type === 'communities' || e.detail.type === 'all') {
        refreshCommunities();
      }
    };

    window.addEventListener('kanakadurga:data_updated', handleSync);
    window.addEventListener('storage', () => refreshCommunities());

    return () => {
      window.removeEventListener('kanakadurga:data_updated', handleSync);
      window.removeEventListener('storage', () => refreshCommunities());
    };
  }, []);

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newQty = Math.min(product.stockQuantity, existing.quantity + quantity);
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [...prev, { product, quantity: Math.min(product.stockQuantity, quantity) }];
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const logout = () => {
    api.logout();
    setCurrentUser(null);
  };

  return (
    <StoreContext.Provider
      value={{
        cartItems,
        cartCount,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        currentUser,
        setCurrentUser,
        logout,
        isLiveBackend,
        checkBackendHealth,
        communities,
        refreshCommunities,
        lastPlacedOrder,
        setLastPlacedOrder,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
