import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  LayoutDashboard,
  Package,
  Layers,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Truck,
  Box,
  Clock,
  Phone,
  RotateCw,
  Search,
  Upload,
  ArrowLeft,
  X,
  FileText,
  Bell,
  BellRing,
  Check,
  CheckCheck,
} from 'lucide-react';
import {
  Product,
  Community,
  Order,
  DashboardMetrics,
  OrderStatus,
  User,
  OrderNotification,
} from '../types/index.ts';
import { formatRupee, formatDateTime, canTransitionStatus, calculateDiscount } from '../utils/pureLogic.ts';

interface AdminPortalProps {
  onBackToShop: () => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  apiClient: any;
  onAdminLogin?: (user: User) => void;
}

const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, { value: OrderStatus; label: string }[]> = {
  Placed: [
    { value: 'Accepted', label: 'Accepted (Move to packing)' },
    { value: 'Cancelled', label: 'Cancelled (Restores inventory)' },
    { value: 'Rejected', label: 'Rejected' },
  ],
  Accepted: [
    { value: 'Packed', label: 'Packed & Checked (Ready for dispatch)' },
    { value: 'Cancelled', label: 'Cancelled (Restores inventory)' },
    { value: 'Rejected', label: 'Rejected' },
  ],
  Packed: [
    { value: 'On the Way', label: 'On the Way (Out for delivery)' },
    { value: 'Cancelled', label: 'Cancelled (Restores inventory)' },
  ],
  'On the Way': [
    { value: 'Delivered', label: 'Delivered & Cash Collected' },
    { value: 'Cancelled', label: 'Cancelled (Restores inventory)' },
  ],
  Delivered: [],
  Cancelled: [],
  Rejected: [],
};

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onBackToShop,
  currentUser,
  onOpenAuth,
  apiClient,
  onAdminLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'communities' | 'notifications'>('overview');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Notification states
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [activeAlert, setActiveAlert] = useState<OrderNotification | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState<boolean>(false);
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('all');
  const alertedIdsRef = useRef<Set<string>>(new Set());

  // Product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({
    sku: '',
    name: '',
    category: 'Sparklers' as Product['category'],
    description: '',
    mrp: 200,
    sellingPrice: 150,
    packQuantity: 10,
    packUnit: 'pieces / box',
    safetyInformation: 'Adult supervision required. Maintain safety distance.',
    stockQuantity: 50,
    lowStockThreshold: 10,
    isFeatured: false,
    isActive: true,
    imageInput: '',
  });
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Community modal state
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState<boolean>(false);
  const [editingCommunity, setEditingCommunity] = useState<Community | null>(null);
  const [commForm, setCommForm] = useState({
    name: '',
    locality: 'Attapur, Hyderabad',
    allowedBlocksStr: 'Block A, Block B, Block C',
    minimumOrderAmount: 1000,
    deliveryFee: 50,
    isActive: true,
  });

  // Order filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderSearch, setOrderSearch] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Status update modal
  const [statusModalOrder, setStatusModalOrder] = useState<Order | null>(null);
  const [targetStatus, setTargetStatus] = useState<OrderStatus>('Accepted');
  const [statusNote, setStatusNote] = useState<string>('');
  const [cancellationReason, setCancellationReason] = useState<string>('');

  // Quick Stock modal
  const [stockModalProd, setStockModalProd] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState<number>(10);
  const [stockNote, setStockNote] = useState<string>('Restock shipment received');

  const isAdmin = currentUser?.role === 'admin';

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [m, p, o, c] = await Promise.all([
        apiClient.getAdminDashboard(),
        apiClient.getAdminProducts(),
        apiClient.getAdminOrders(orderStatusFilter, orderSearch),
        apiClient.getAdminCommunities(),
      ]);
      setMetrics(m);
      setProducts(p);
      setOrders(o);
      setCommunities(c);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async (triggerAlert = true) => {
    try {
      const data = await apiClient.getAdminNotifications();
      const notifs: OrderNotification[] = data.notifications || [];
      const count: number = data.unreadCount || 0;
      setNotifications(notifs);
      setUnreadCount(count);

      // Trigger alert banner if an unread order hasn't been alerted in this session
      if (triggerAlert && notifs.length > 0) {
        const unreadList = notifs.filter((n) => !n.isRead);
        if (unreadList.length > 0) {
          const newest = unreadList[0];
          if (!alertedIdsRef.current.has(newest.orderId)) {
            setActiveAlert(newest);
            alertedIdsRef.current.add(newest.orderId);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
      fetchNotifications(true);

      // Real-time polling every 5 seconds for new orders received while admin is active
      const interval = setInterval(() => {
        fetchNotifications(true);
      }, 5000);

      // Instant synchronization on local custom and storage events
      const handleSync = () => {
        fetchNotifications(true);
        loadData();
      };

      window.addEventListener('kanakadurga:data_updated', handleSync);
      window.addEventListener('storage', handleSync);

      return () => {
        clearInterval(interval);
        window.removeEventListener('kanakadurga:data_updated', handleSync);
        window.removeEventListener('storage', handleSync);
      };
    }
  }, [isAdmin, orderStatusFilter]);

  // Deep-linking from email URL: ?orderId=...
  useEffect(() => {
    if (isAdmin) {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('orderId');
      if (targetId) {
        handleViewNotificationOrder(targetId);
      }
    }
  }, [isAdmin, orders.length]);

  const handleViewNotificationOrder = async (orderId: string) => {
    try {
      await apiClient.markAdminNotificationRead(orderId);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.orderId === orderId ? { ...n, isRead: true } : n))
      );
      if (activeAlert?.orderId === orderId) {
        setActiveAlert(null);
      }
      setIsNotificationDrawerOpen(false);

      let target = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
      if (!target) {
        target = await apiClient.getOrderById(orderId);
      }
      if (target) {
        setSelectedOrder(target);
        setActiveTab('orders');
      }
    } catch (err) {
      console.warn('Failed to open notification order:', err);
    }
  };

  const handleDismissAlert = async (orderId: string) => {
    try {
      await apiClient.markAdminNotificationRead(orderId);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((n) => (n.orderId === orderId ? { ...n, isRead: true } : n))
      );
      setActiveAlert(null);
    } catch {
      setActiveAlert(null);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await apiClient.markAllAdminNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setActiveAlert(null);
      setSuccessMsg('All order notifications marked as read.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to mark all as read');
    }
  };

  const handleToggleNotificationRead = async (orderId: string, currentReadStatus: boolean) => {
    try {
      if (!currentReadStatus) {
        await apiClient.markAdminNotificationRead(orderId);
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.orderId === orderId ? { ...n, isRead: true } : n))
        );
        if (activeAlert?.orderId === orderId) {
          setActiveAlert(null);
        }
      }
    } catch (err) {
      console.warn('Failed to toggle notification status:', err);
    }
  };

  // Dedicated Admin Login State
  const [adminSecretInput, setAdminSecretInput] = useState<string>('');
  const [adminEmailInput, setAdminEmailInput] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleAdminAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthenticating(true);
    const emailToUse = adminEmailInput.trim();
    const secretToUse = adminSecretInput.trim();
    if (!emailToUse) {
      setAuthError('Please enter the administrator email.');
      setIsAuthenticating(false);
      return;
    }
    if (!secretToUse) {
      setAuthError('Please enter the administrator secret key.');
      setIsAuthenticating(false);
      return;
    }
    try {
      const res = await apiClient.bootstrapAdmin(secretToUse, emailToUse);
      if (onAdminLogin) {
        onAdminLogin(res.user);
      }
      setSuccessMsg(`Welcome, ${res.user.displayName || 'Store Administrator'}! Console unlocked.`);
    } catch (err: any) {
      setAuthError(err.message || 'Invalid administrator email or secret key. Please check your credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle unauthenticated view on /admin with dedicated admin login card
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 sm:my-20 p-6 sm:p-8 rounded-2xl bg-[#0F1833] border border-amber-500/30 text-left space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden border border-amber-400/50 shadow-lg bg-slate-950 flex items-center justify-center">
            <img
              src="/assets/aistudio/image_9c781e1e.png"
              alt="KanakaDurga FireWorks"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-xl font-serif font-bold text-white">KanakaDurga FireWorks · Management Console</h2>
          <div className="text-xs font-telugu font-bold text-amber-400">“ఆనందానికి No Limits!”</div>
          <p className="text-xs text-slate-300">
            Restricted portal for inventory managers, price adjustments, and delivery coordination.
          </p>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleAdminAuthenticate} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Store Admin Email <span className="text-amber-400">*</span>
            </label>
            <input
              type="email"
              required
              value={adminEmailInput}
              onChange={(e) => setAdminEmailInput(e.target.value)}
              placeholder="abh1navreddy9095@gmail.com"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Administrator Secret Key <span className="text-amber-400">*</span>
            </label>
            <input
              type="password"
              required
              value={adminSecretInput}
              onChange={(e) => setAdminSecretInput(e.target.value)}
              placeholder="Enter administrator secret key"
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={isAuthenticating}
            className="w-full py-3 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-md shadow-amber-950/50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAuthenticating ? (
              <span>Verifying Credentials...</span>
            ) : (
              <span>Unlock Administrator Console</span>
            )}
          </button>

          <button
            type="button"
            onClick={onBackToShop}
            className="w-full py-2.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            ← Return to Public Storefront
          </button>
        </form>
      </div>
    );
  }

  // Handle product image file upload to Cloudinary via backend
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setIsUploadingImage(true);
    try {
      const url = await apiClient.uploadAdminImage(file);
      setProdForm((prev) => ({ ...prev, imageInput: url }));
      setSuccessMsg('Product image uploaded successfully');
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Save product (create or update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const payload: Partial<Product> = {
        sku: prodForm.sku.trim().toUpperCase(),
        name: prodForm.name.trim(),
        category: prodForm.category,
        description: prodForm.description.trim(),
        mrp: Number(prodForm.mrp),
        sellingPrice: Number(prodForm.sellingPrice),
        packQuantity: Number(prodForm.packQuantity),
        packUnit: prodForm.packUnit.trim(),
        safetyInformation: prodForm.safetyInformation.trim(),
        stockQuantity: Number(prodForm.stockQuantity),
        lowStockThreshold: Number(prodForm.lowStockThreshold),
        isFeatured: prodForm.isFeatured,
        isActive: prodForm.isActive,
        images: prodForm.imageInput ? [prodForm.imageInput] : [],
      };

      if (editingProduct) {
        await apiClient.updateAdminProduct(editingProduct.id, payload);
        setSuccessMsg(`Product "${payload.name}" updated successfully`);
      } else {
        await apiClient.createAdminProduct(payload);
        setSuccessMsg(`New product "${payload.name}" created`);
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving product');
    }
  };

  // Safe delete product
  const handleDeleteProduct = async (prod: Product) => {
    if (!confirm(`Are you sure you want to delete or deactivate "${prod.name}"?`)) return;
    try {
      const res = await apiClient.deleteAdminProduct(prod.id);
      setSuccessMsg(res.message || 'Product removed');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove product');
    }
  };

  // Save community
  const handleSaveCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const blocks = commForm.allowedBlocksStr
        .split(',')
        .map((b) => b.trim())
        .filter((b) => b.length > 0);

      const payload = {
        name: commForm.name.trim(),
        locality: commForm.locality.trim(),
        allowedBlocks: blocks,
        minimumOrderAmount: Number(commForm.minimumOrderAmount),
        deliveryFee: Number(commForm.deliveryFee),
        isActive: commForm.isActive,
      };

      if (editingCommunity) {
        await apiClient.updateAdminCommunity(editingCommunity.id, payload);
        setSuccessMsg(`Community ${payload.name} updated`);
      } else {
        await apiClient.createAdminCommunity(payload);
        setSuccessMsg(`New community ${payload.name} created`);
      }
      setIsCommunityModalOpen(false);
      setEditingCommunity(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving community');
    }
  };

  // Delete or safely deactivate community
  const handleDeleteCommunity = async (comm: Community) => {
    if (!confirm(`Are you sure you want to delete or deactivate "${comm.name}"?`)) return;
    try {
      const res = await apiClient.deleteAdminCommunity(comm.id);
      setSuccessMsg(res.message || `Community "${comm.name}" removed`);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove community');
    }
  };

  // Update order status
  const handleConfirmStatusUpdate = async () => {
    if (!statusModalOrder) return;
    try {
      await apiClient.updateOrderStatus(
        statusModalOrder.id,
        targetStatus,
        statusNote,
        cancellationReason
      );
      setSuccessMsg(`Order ${statusModalOrder.orderNumber} updated to ${targetStatus}`);
      setStatusModalOrder(null);
      setStatusNote('');
      setCancellationReason('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Status transition rejected');
    }
  };

  // Adjust stock
  const handleConfirmStockAdjust = async () => {
    if (!stockModalProd) return;
    try {
      await apiClient.adjustStock(stockModalProd.id, stockAdjustment, stockNote);
      setSuccessMsg(`Stock for "${stockModalProd.name}" adjusted by ${stockAdjustment > 0 ? '+' : ''}${stockAdjustment}`);
      setStockModalProd(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Stock adjustment failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-100">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <button
            onClick={onBackToShop}
            className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Storefront</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-400/50 bg-slate-950 shrink-0">
              <img
                src="/assets/aistudio/image_9c781e1e.png"
                alt="KanakaDurga FireWorks"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              KanakaDurga Store Management
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
              Admin
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Attapur, Hyderabad Dispatch Office · Logged in as {currentUser.displayName}
          </span>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto relative">
          {/* Notification Bell Button with Unread Badge */}
          <div className="relative">
            <button
              onClick={() => setIsNotificationDrawerOpen(!isNotificationDrawerOpen)}
              className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
                unreadCount > 0
                  ? 'bg-amber-400/15 border-amber-400/60 text-amber-300 hover:bg-amber-400/25 shadow-lg shadow-amber-950/40'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
              }`}
            >
              {unreadCount > 0 ? (
                <BellRing className="w-4 h-4 text-amber-400 animate-bounce" />
              ) : (
                <Bell className="w-4 h-4 text-slate-400" />
              )}
              <span>Alerts</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-600 text-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover Dropdown */}
            {isNotificationDrawerOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0F1833] border border-amber-500/30 shadow-2xl p-4 z-50 text-xs text-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="font-serif font-bold text-white text-sm">Recent Order Alerts</span>
                    {unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono font-bold">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllNotificationsRead}
                      className="text-[11px] text-amber-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <CheckCheck className="w-3 h-3" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-slate-500">
                      No order notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((n) => (
                      <div
                        key={n.orderId}
                        onClick={() => handleViewNotificationOrder(n.orderId)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                          n.isRead
                            ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                            : 'bg-amber-400/10 border-amber-400/40 hover:border-amber-400 text-white shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-amber-400">{n.orderNumber}</span>
                          <span className="font-mono font-bold text-emerald-400">{formatRupee(n.totalAmount)}</span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-0.5">
                          {n.customerName} · <span className="text-amber-200">{n.communityName}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1 flex justify-between">
                          <span>{formatDateTime(n.createdAt)}</span>
                          <span className="text-amber-400/90 font-medium hover:underline">View details →</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px]">
                  <button
                    onClick={() => {
                      setActiveTab('notifications');
                      setIsNotificationDrawerOpen(false);
                    }}
                    className="text-amber-400 hover:underline font-semibold"
                  >
                    View All Notifications ({notifications.length}) →
                  </button>
                  <button
                    onClick={() => setIsNotificationDrawerOpen(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              loadData();
              fetchNotifications(false);
            }}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400/40 text-xs font-medium text-slate-200 flex items-center gap-2 transition-colors active:scale-95"
          >
            <RotateCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Real-time New-Order Alert Banner */}
      {activeAlert && (
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/25 via-slate-900 to-amber-500/25 border-2 border-amber-400 text-xs shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg">
              <BellRing className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2 flex-wrap">
                <span className="text-amber-400 tracking-wide font-serif">NEW ORDER RECEIVED!</span>
                <span className="font-mono text-white bg-slate-800 px-2 py-0.5 rounded border border-amber-500/30">
                  #{activeAlert.orderNumber}
                </span>
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/40">
                  {formatRupee(activeAlert.totalAmount)} (COD)
                </span>
              </div>
              <div className="text-slate-300 text-xs mt-1">
                Placed by <strong className="text-white">{activeAlert.customerName}</strong> for <span className="text-amber-200 font-semibold">{activeAlert.communityName}</span> ({activeAlert.itemsCount} items) • {formatDateTime(activeAlert.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={() => handleViewNotificationOrder(activeAlert.orderId)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition-colors shadow-md text-xs flex items-center gap-1.5 active:scale-95"
            >
              <span>View Order</span>
              <span>→</span>
            </button>
            <button
              onClick={() => handleDismissAlert(activeAlert.orderId)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
              title="Acknowledge and dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Notifications */}
      {errorMsg && (
        <div className="mt-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}
      {successMsg && (
        <div className="mt-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mt-6 flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shrink-0 ${
            activeTab === 'overview'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shrink-0 ${
            activeTab === 'orders'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Orders Pipeline ({orders.length})</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-600 text-white">
              {unreadCount} new
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shrink-0 ${
            activeTab === 'products'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Product Inventory ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('communities')}
          className={`py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shrink-0 ${
            activeTab === 'communities'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Communities ({communities.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('notifications')}
          className={`py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shrink-0 ${
            activeTab === 'notifications'
              ? 'bg-amber-400 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white bg-slate-900/60'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Order Alerts</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-rose-600 text-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ===================== TAB 1: OVERVIEW ===================== */}
      {activeTab === 'overview' && metrics && (
        <div className="mt-6 space-y-6">
          {/* Revenue & Pipeline Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-[#111A35] border border-amber-500/20">
              <span className="text-xs text-slate-400 block">Delivered Revenue</span>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
                {formatRupee(metrics.deliveredRevenue)}
              </div>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                {metrics.deliveredCount} delivered & paid
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#111A35] border border-amber-500/20">
              <span className="text-xs text-slate-400 block">Total Pipeline Value</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1 tabular-nums">
                {formatRupee(metrics.totalOrderValue)}
              </div>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                {metrics.totalOrders - metrics.cancelledCount} active orders
              </span>
            </div>

            <div
              onClick={() => setActiveTab('notifications')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                unreadCount > 0
                  ? 'bg-amber-400/10 border-amber-400 hover:border-amber-300 shadow-lg'
                  : 'bg-[#111A35] border-amber-500/20 hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 block">New Order Alerts</span>
                {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
              </div>
              <div className={`text-2xl font-bold font-mono mt-1 tabular-nums ${unreadCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                {unreadCount}
              </div>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                {unreadCount > 0 ? 'Action required · Click to view' : 'All orders acknowledged'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#111A35] border border-amber-500/20">
              <span className="text-xs text-slate-400 block">Active SKUs</span>
              <div className="text-2xl font-bold font-mono text-white mt-1 tabular-nums">
                {metrics.activeProducts}
              </div>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                {products.length} total stored items
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#111A35] border border-amber-500/20">
              <span className="text-xs text-slate-400 block">Low Stock Warnings</span>
              <div className="text-2xl font-bold font-mono text-rose-400 mt-1 tabular-nums">
                {metrics.lowStockProducts}
              </div>
              <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                Needs restock attention
              </span>
            </div>
          </div>

          {/* Order Stages Pipeline Breakdown */}
          <div className="p-6 rounded-2xl bg-[#111A35] border border-slate-800 space-y-4">
            <h2 className="text-sm font-serif font-bold text-white">Order Pipeline Status</h2>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <Clock className="w-4 h-4 mx-auto text-amber-400 mb-1" />
                <span className="text-xs text-slate-400 block">Placed</span>
                <span className="text-lg font-bold font-mono text-white">{metrics.placedCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <CheckCircle className="w-4 h-4 mx-auto text-sky-400 mb-1" />
                <span className="text-xs text-slate-400 block">Accepted</span>
                <span className="text-lg font-bold font-mono text-white">{metrics.acceptedCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <Box className="w-4 h-4 mx-auto text-indigo-400 mb-1" />
                <span className="text-xs text-slate-400 block">Packed</span>
                <span className="text-lg font-bold font-mono text-white">{metrics.packedCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <Truck className="w-4 h-4 mx-auto text-purple-400 mb-1" />
                <span className="text-xs text-slate-400 block">On the Way</span>
                <span className="text-lg font-bold font-mono text-white">{metrics.onTheWayCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <CheckCircle className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                <span className="text-xs text-slate-400 block">Delivered</span>
                <span className="text-lg font-bold font-mono text-emerald-400">{metrics.deliveredCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <AlertTriangle className="w-4 h-4 mx-auto text-rose-400 mb-1" />
                <span className="text-xs text-slate-400 block">Cancelled</span>
                <span className="text-lg font-bold font-mono text-rose-400">{metrics.cancelledCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 2: ORDERS PIPELINE ===================== */}
      {activeTab === 'orders' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Filter buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {['all', 'Placed', 'Accepted', 'Packed', 'On the Way', 'Delivered', 'Cancelled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setOrderStatusFilter(st)}
                  className={`py-1.5 px-3 rounded-md font-medium capitalize shrink-0 ${
                    orderStatusFilter === st
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search order #, customer, phone..."
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="rounded-xl border border-slate-800 overflow-x-auto bg-[#111A35]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-mono uppercase text-[11px]">
                <tr>
                  <th className="p-3.5">Order #</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Customer & Phone</th>
                  <th className="p-3.5">Community & Flat</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No orders match the current filter.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-amber-400">
                        {ord.orderNumber}
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono">
                        {formatDateTime(ord.createdAt)}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{ord.customerName}</div>
                        <a
                          href={`tel:${ord.customerPhone}`}
                          className="text-amber-400/90 font-mono hover:underline inline-flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          <span>{ord.customerPhone}</span>
                        </a>
                      </td>
                      <td className="p-3.5">
                        <div className="text-white font-medium">{ord.deliveryAddress.communityName}</div>
                        <div className="text-slate-400 font-mono text-[11px]">
                          {ord.deliveryAddress.block}, {ord.deliveryAddress.flat}
                        </div>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-white tabular-nums">
                        {formatRupee(ord.totalAmount)}
                        <span className="block text-[10px] text-slate-500">{ord.paymentMethod}</span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            ord.orderStatus === 'Delivered'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : ord.orderStatus === 'Cancelled'
                              ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {ord.orderStatus}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => setSelectedOrder(ord)}
                          className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700"
                        >
                          View
                        </button>
                        {ord.orderStatus !== 'Delivered' && ord.orderStatus !== 'Cancelled' && (
                          <button
                            onClick={() => {
                              setStatusModalOrder(ord);
                              const allowed = ALLOWED_ORDER_TRANSITIONS[ord.orderStatus] || [];
                              setTargetStatus(allowed[0]?.value || 'Accepted');
                            }}
                            className="px-2.5 py-1 rounded bg-amber-400 text-slate-950 font-semibold hover:bg-amber-300"
                          >
                            Update
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 3: PRODUCT INVENTORY ===================== */}
      {activeTab === 'products' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Manage product listings, MRP, selling price, discounts, and inventory counts.
            </span>
            <button
              onClick={() => {
                setEditingProduct(null);
                setProdForm({
                  sku: 'KDF-' + Math.floor(100 + Math.random() * 900),
                  name: '',
                  category: 'Sparklers',
                  description: '',
                  mrp: 300,
                  sellingPrice: 220,
                  packQuantity: 10,
                  packUnit: 'pieces / box',
                  safetyInformation: 'Adult supervision required. Store in dry area.',
                  stockQuantity: 40,
                  lowStockThreshold: 10,
                  isFeatured: false,
                  isActive: true,
                  imageInput: '',
                });
                setIsProductModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-300"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 overflow-x-auto bg-[#111A35]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 font-mono uppercase text-[11px]">
                <tr>
                  <th className="p-3.5">SKU</th>
                  <th className="p-3.5">Product Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">MRP / Selling</th>
                  <th className="p-3.5">Stock</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {products.map((p) => {
                  const isLow = p.stockQuantity <= p.lowStockThreshold;
                  const discount = calculateDiscount(p.mrp, p.sellingPrice);
                  return (
                    <tr key={p.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-amber-400">{p.sku}</td>
                      <td className="p-3.5">
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {p.packQuantity} {p.packUnit}
                        </div>
                      </td>
                      <td className="p-3.5">{p.category}</td>
                      <td className="p-3.5 font-mono">
                        <span className="font-bold text-white tabular-nums">{formatRupee(p.sellingPrice)}</span>
                        {p.mrp > p.sellingPrice && (
                          <span className="text-[11px] text-slate-500 line-through ml-1.5 tabular-nums">
                            {formatRupee(p.mrp)}
                          </span>
                        )}
                        {discount > 0 && (
                          <span className="text-emerald-400 text-[10px] block font-semibold">
                            {discount}% OFF
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold ${isLow ? 'text-rose-400' : 'text-slate-200'}`}>
                            {p.stockQuantity}
                          </span>
                          {isLow && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-950 text-rose-300 border border-rose-500/40">
                              Low
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setStockModalProd(p);
                              setStockAdjustment(10);
                            }}
                            className="ml-1 text-[10px] text-amber-400 hover:underline"
                          >
                            Adjust
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.isActive
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {p.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setProdForm({
                              sku: p.sku,
                              name: p.name,
                              category: p.category,
                              description: p.description,
                              mrp: p.mrp,
                              sellingPrice: p.sellingPrice,
                              packQuantity: p.packQuantity,
                              packUnit: p.packUnit,
                              safetyInformation: p.safetyInformation,
                              stockQuantity: p.stockQuantity,
                              lowStockThreshold: p.lowStockThreshold,
                              isFeatured: p.isFeatured,
                              isActive: p.isActive,
                              imageInput: p.images[0] || '',
                            });
                            setIsProductModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-300 hover:text-amber-400 hover:bg-slate-800"
                          title="Edit product"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                          title="Deactivate or safe delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: COMMUNITIES ===================== */}
      {activeTab === 'communities' && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Only authorized communities can place Cash on Delivery orders. Configure allowed residential blocks.
            </span>
            <button
              onClick={() => {
                setEditingCommunity(null);
                setCommForm({
                  name: '',
                  locality: 'Attapur, Hyderabad',
                  allowedBlocksStr: 'Block A, Block B, Block C',
                  minimumOrderAmount: 1000,
                  deliveryFee: 50,
                  isActive: true,
                });
                setIsCommunityModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-300"
            >
              <Plus className="w-4 h-4" />
              <span>Add Community</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-[#111A35] border border-slate-800 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white text-sm">{c.name}</div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      c.isActive
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {c.isActive ? 'Active Delivery' : 'Disabled'}
                  </span>
                </div>

                <div className="text-slate-400 font-mono text-[11px]">{c.locality}</div>

                <div className="space-y-1 pt-1 border-t border-slate-800/80">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Min Order:</span>
                    <span className="font-mono text-white font-bold">{formatRupee(c.minimumOrderAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Delivery Charge:</span>
                    <span className="font-mono text-white font-bold">{formatRupee(c.deliveryFee)}</span>
                  </div>
                </div>

                {/* Permitted Blocks list */}
                <div>
                  <span className="text-[11px] text-amber-300 block font-semibold mb-1">
                    Permitted Blocks ({c.allowedBlocks.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {c.allowedBlocks.map((b, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleDeleteCommunity(c)}
                    className="px-2.5 py-1 rounded bg-rose-950/60 text-rose-300 hover:bg-rose-900 border border-rose-800/40 text-xs font-medium transition-colors"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => {
                      setEditingCommunity(c);
                      setCommForm({
                        name: c.name,
                        locality: c.locality,
                        allowedBlocksStr: c.allowedBlocks.join(', '),
                        minimumOrderAmount: c.minimumOrderAmount,
                        deliveryFee: c.deliveryFee,
                        isActive: c.isActive,
                      });
                      setIsCommunityModalOpen(true);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-800 text-amber-300 hover:bg-slate-700 text-xs font-medium"
                  >
                    Edit Society Settings
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================== TAB 5: NOTIFICATIONS ===================== */}
      {activeTab === 'notifications' && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#111A35] border border-amber-500/20">
            <div>
              <h2 className="text-sm font-serif font-bold text-white flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>Customer Order Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-600 text-white">
                    {unreadCount} Unread
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time & persistent order alerts from MongoDB Atlas. Resend email dispatch logs are tracked per order.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
                <button
                  onClick={() => setNotificationFilter('all')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    notificationFilter === 'all' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  onClick={() => setNotificationFilter('unread')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    notificationFilter === 'unread' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllNotificationsRead}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-amber-500/30 active:scale-95"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>

          {/* List of Notification Cards */}
          {notifications.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#111A35] border border-slate-800 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-900 flex items-center justify-center text-slate-600">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-base text-white">No Order Notifications Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                When residents in Attapur gated communities place Cash on Delivery orders, notifications and alerts will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifications
                .filter((n) => notificationFilter === 'all' || !n.isRead)
                .map((notif) => (
                  <div
                    key={notif.orderId}
                    className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      notif.isRead
                        ? 'bg-[#111A35]/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                        : 'bg-gradient-to-r from-[#172145] to-[#121B3B] border-amber-500/40 text-white shadow-lg'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 shrink-0">
                        {notif.isRead ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400 animate-pulse" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-amber-400 text-sm">
                            {notif.orderNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 border border-slate-700 text-slate-300">
                            {notif.orderStatus}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                            {formatRupee(notif.totalAmount)} COD
                          </span>
                          {!notif.isRead && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950">
                              New Order
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-300">
                          Resident: <strong className="text-white">{notif.customerName}</strong> ({notif.customerPhone || 'Phone on file'}) ·{' '}
                          <span className="text-amber-200">{notif.communityName}</span> ({notif.itemsCount} items)
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono">
                          Received {formatDateTime(notif.createdAt)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleViewNotificationOrder(notif.orderId)}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow"
                      >
                        <span>View Order</span>
                        <span>→</span>
                      </button>

                      {!notif.isRead && (
                        <button
                          onClick={() => handleToggleNotificationRead(notif.orderId, false)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs transition-colors border border-slate-700 flex items-center gap-1"
                          title="Mark as Read"
                        >
                          <Check className="w-3.5 h-3.5 text-amber-400" />
                          <span>Acknowledge</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== MODAL: ORDER DETAILS DRAWER ===================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0F1833] border border-amber-500/30 rounded-2xl p-6 text-xs text-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] text-slate-400 font-mono">Order Details</span>
                <h3 className="text-lg font-serif font-bold text-amber-400 font-mono">
                  {selectedOrder.orderNumber}
                </h3>
              </div>
              <button onClick={() => setSelectedOrder(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-900">
                <span className="text-slate-400 block text-[11px]">Customer & Contact:</span>
                <span className="font-bold text-white block mt-0.5">{selectedOrder.customerName}</span>
                <a href={`tel:${selectedOrder.customerPhone}`} className="text-amber-400 font-mono hover:underline">
                  {selectedOrder.customerPhone}
                </a>
              </div>
              <div className="p-3 rounded-lg bg-slate-900">
                <span className="text-slate-400 block text-[11px]">Society Delivery Address:</span>
                <span className="font-bold text-white block mt-0.5">
                  {selectedOrder.deliveryAddress.communityName}
                </span>
                <span className="text-slate-300">
                  {selectedOrder.deliveryAddress.block}, Flat {selectedOrder.deliveryAddress.flat}
                </span>
                {selectedOrder.deliveryAddress.landmark && (
                  <span className="text-[11px] text-slate-400 block">
                    Landmark: {selectedOrder.deliveryAddress.landmark}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="font-semibold text-white block mb-1.5">Purchased Crackers:</span>
              <div className="divide-y divide-slate-800 bg-slate-900 rounded-lg overflow-hidden">
                {selectedOrder.items.map((it, idx) => (
                  <div key={idx} className="p-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-medium text-white">{it.name}</span>
                      <span className="text-[11px] text-slate-400 block font-mono">
                        SKU: {it.sku} · Qty: {it.quantity} × {formatRupee(it.unitPrice)}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-amber-400">{formatRupee(it.totalPrice)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center text-sm">
              <span className="font-bold text-white">Total COD Collection:</span>
              <span className="font-mono font-bold text-amber-400 text-base">
                {formatRupee(selectedOrder.totalAmount)}
              </span>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: ORDER STATUS UPDATE ===================== */}
      {statusModalOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1833] border border-amber-500/30 rounded-2xl p-6 text-xs text-slate-200 space-y-4">
            <h3 className="text-base font-serif font-bold text-white">
              Update Order Status: {statusModalOrder.orderNumber}
            </h3>

            <div>
              <span className="text-slate-400 block text-[11px] mb-1">Current Status:</span>
              <span className="font-bold text-amber-300 text-sm">{statusModalOrder.orderStatus}</span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Transition to Status:</label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as OrderStatus)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400 font-medium"
              >
                {(ALLOWED_ORDER_TRANSITIONS[statusModalOrder.orderStatus] || []).map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <span>Pipeline:</span>
                <span className={statusModalOrder.orderStatus === 'Placed' ? 'text-amber-400 font-bold' : ''}>Placed</span>
                <span>→</span>
                <span className={statusModalOrder.orderStatus === 'Accepted' ? 'text-amber-400 font-bold' : ''}>Accepted</span>
                <span>→</span>
                <span className={statusModalOrder.orderStatus === 'Packed' ? 'text-amber-400 font-bold' : ''}>Packed</span>
                <span>→</span>
                <span className={statusModalOrder.orderStatus === 'On the Way' ? 'text-amber-400 font-bold' : ''}>On the Way</span>
                <span>→</span>
                <span className={statusModalOrder.orderStatus === 'Delivered' ? 'text-amber-400 font-bold' : ''}>Delivered</span>
              </div>
            </div>

            {targetStatus === 'Cancelled' && (
              <div>
                <label className="block text-rose-300 font-medium mb-1">Cancellation Reason *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Customer cancelled before dispatch"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-rose-500/50 text-white focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Note: Cancelling will automatically restore {statusModalOrder.items.reduce((a, b) => a + b.quantity, 0)} reserved units back to available stock.
                </span>
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">Audit Note (Optional):</label>
              <input
                type="text"
                placeholder="e.g. Verified resident community and packaged for dispatch"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setStatusModalOrder(null)}
                className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatusUpdate}
                className="px-4 py-2 rounded-lg bg-amber-400 text-slate-950 font-bold hover:bg-amber-300"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: QUICK STOCK ADJUSTMENT ===================== */}
      {stockModalProd && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1833] border border-amber-500/30 rounded-2xl p-6 text-xs text-slate-200 space-y-4">
            <h3 className="text-base font-serif font-bold text-white">
              Adjust Inventory: {stockModalProd.name}
            </h3>

            <div className="flex justify-between items-center p-3 rounded-lg bg-slate-900">
              <span className="text-slate-400">Current Stock:</span>
              <span className="font-mono font-bold text-white text-base">{stockModalProd.stockQuantity} units</span>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Quantity Change (+ to restock, - to write off):
              </label>
              <input
                type="number"
                value={stockAdjustment}
                onChange={(e) => setStockAdjustment(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Reason / Note:</label>
              <input
                type="text"
                value={stockNote}
                onChange={(e) => setStockNote(e.target.value)}
                placeholder="e.g. New Sivakasi shipment batch arrived"
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setStockModalProd(null)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300">
                Cancel
              </button>
              <button onClick={handleConfirmStockAdjust} className="px-4 py-2 rounded-lg bg-amber-400 text-slate-950 font-bold">
                Apply Stock Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: PRODUCT FORM ===================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-[#0F1833] border border-amber-500/30 rounded-2xl p-6 text-xs text-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-serif font-bold text-white">
                {editingProduct ? 'Edit Product' : 'Add New Cracker SKU'}
              </h3>
              <button onClick={() => setIsProductModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={prodForm.name}
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                    placeholder="e.g. Deluxe Ground Chakkars"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={prodForm.sku}
                    onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                    placeholder="e.g. KDF-CHK-05"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category *</label>
                  <select
                    value={prodForm.category}
                    onChange={(e) => setProdForm({ ...prodForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  >
                    <option value="Sparklers">Sparklers</option>
                    <option value="Ground Chakkars">Ground Chakkars</option>
                    <option value="Flower Pots (Anar)">Flower Pots (Anar)</option>
                    <option value="Aerial Shots">Aerial Shots</option>
                    <option value="Rockets">Rockets</option>
                    <option value="Sound Crackers">Sound Crackers</option>
                    <option value="Gift Boxes">Gift Boxes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Pack Quantity & Unit</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={prodForm.packQuantity}
                      onChange={(e) => setProdForm({ ...prodForm, packQuantity: Number(e.target.value) })}
                      className="w-16 px-2 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    />
                    <input
                      type="text"
                      value={prodForm.packUnit}
                      onChange={(e) => setProdForm({ ...prodForm, packUnit: e.target.value })}
                      placeholder="e.g. pieces / box"
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Original MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    value={prodForm.mrp}
                    onChange={(e) => setProdForm({ ...prodForm, mrp: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    required
                    value={prodForm.sellingPrice}
                    onChange={(e) => setProdForm({ ...prodForm, sellingPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Available Stock Qty *</label>
                  <input
                    type="number"
                    required
                    value={prodForm.stockQuantity}
                    onChange={(e) => setProdForm({ ...prodForm, stockQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Low-Stock Alert Threshold</label>
                  <input
                    type="number"
                    value={prodForm.lowStockThreshold}
                    onChange={(e) => setProdForm({ ...prodForm, lowStockThreshold: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Product Description</label>
                <textarea
                  rows={2}
                  value={prodForm.description}
                  onChange={(e) => setProdForm({ ...prodForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Product Image (Cloudinary Upload or Hosted URL)
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={prodForm.imageInput}
                      onChange={(e) => setProdForm({ ...prodForm, imageInput: e.target.value })}
                      placeholder="https://res.cloudinary.com/... or paste image URL"
                      className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs"
                    />
                    {prodForm.imageInput && (
                      <div className="w-9 h-9 rounded border border-amber-400/40 overflow-hidden bg-slate-950 shrink-0">
                        <img src={prodForm.imageInput} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingImage ? 'Uploading to Cloudinary...' : 'Upload Image File'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        disabled={isUploadingImage}
                        onChange={handleImageUpload}
                      />
                    </label>
                    <span className="text-[10px] text-slate-400">PNG, JPG, WEBP (Max 5MB)</span>
                  </div>
                  {uploadError && (
                    <div className="text-[11px] text-rose-400 font-mono">
                      {uploadError}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Safety & PESO Instructions</label>
                <input
                  type="text"
                  value={prodForm.safetyInformation}
                  onChange={(e) => setProdForm({ ...prodForm, safetyInformation: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodForm.isFeatured}
                    onChange={(e) => setProdForm({ ...prodForm, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                  />
                  <span>Feature on Homepage</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prodForm.isActive}
                    onChange={(e) => setProdForm({ ...prodForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                  />
                  <span>Active in Store</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-400 text-slate-950 font-bold hover:bg-amber-300"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: COMMUNITY FORM ===================== */}
      {isCommunityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0F1833] border border-amber-500/30 rounded-2xl p-6 text-xs text-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-serif font-bold text-white">
                {editingCommunity ? 'Edit Community' : 'Add Residential Community'}
              </h3>
              <button onClick={() => setIsCommunityModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleSaveCommunity} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Community Name *</label>
                <input
                  type="text"
                  required
                  value={commForm.name}
                  onChange={(e) => setCommForm({ ...commForm, name: e.target.value })}
                  placeholder="e.g. Janapriya Utopia"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Locality</label>
                <input
                  type="text"
                  value={commForm.locality}
                  onChange={(e) => setCommForm({ ...commForm, locality: e.target.value })}
                  placeholder="e.g. Attapur, Hyderabad"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Permitted Blocks / Towers (Comma-separated) *
                </label>
                <input
                  type="text"
                  required
                  value={commForm.allowedBlocksStr}
                  onChange={(e) => setCommForm({ ...commForm, allowedBlocksStr: e.target.value })}
                  placeholder="Block A, Block B, Tower 1, Tower 2"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  Only customers living in these blocks will be authorized to place orders.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Min Order Amount (₹)</label>
                  <input
                    type="number"
                    value={commForm.minimumOrderAmount}
                    onChange={(e) => setCommForm({ ...commForm, minimumOrderAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Doorstep Delivery Fee (₹)</label>
                  <input
                    type="number"
                    value={commForm.deliveryFee}
                    onChange={(e) => setCommForm({ ...commForm, deliveryFee: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={commForm.isActive}
                    onChange={(e) => setCommForm({ ...commForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0"
                  />
                  <span>Active for Doorstep Delivery</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCommunityModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-400 text-slate-950 font-bold hover:bg-amber-300"
                >
                  Save Society
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
