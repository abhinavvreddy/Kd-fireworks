import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Clock,
  CheckCircle,
  Box,
  Truck,
  RotateCw,
  PhoneCall,
  AlertTriangle,
  ArrowLeft,
  MapPin,
  Banknote,
} from 'lucide-react';
import { Order, OrderStatus } from '../types/index.ts';
import { api } from '../api/client.ts';
import { useStore } from '../context/StoreContext.tsx';
import { formatRupee, formatDateTime } from '../utils/pureLogic.ts';

export const OrderTrackingPage: React.FC = () => {
  const { currentUser } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadOrders = async () => {
    try {
      const ords = await api.getMyOrders();
      setOrders(ords);
      if (!selectedOrderId && ords.length > 0) {
        setSelectedOrderId(ords[0].id);
      }
    } catch (e) {
      console.warn('Failed to load orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadOrders();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const stages: Array<{ status: OrderStatus; label: string; icon: any }> = [
    { status: 'Placed', label: 'Order Placed', icon: Clock },
    { status: 'Accepted', label: 'Accepted', icon: CheckCircle },
    { status: 'Packed', label: 'Packed & Verified', icon: Box },
    { status: 'On the Way', label: 'Out for Delivery', icon: Truck },
    { status: 'Delivered', label: 'Delivered & Paid', icon: Package },
  ];

  const getStageIndex = (status: OrderStatus) => {
    switch (status) {
      case 'Placed':
        return 0;
      case 'Accepted':
        return 1;
      case 'Packed':
        return 2;
      case 'On the Way':
        return 3;
      case 'Delivered':
        return 4;
      case 'Cancelled':
      case 'Rejected':
        return -1;
      default:
        return 0;
    }
  };

  const currentStageIndex = selectedOrder ? getStageIndex(selectedOrder.orderStatus) : 0;
  const isCancelled = selectedOrder?.orderStatus === 'Cancelled' || selectedOrder?.orderStatus === 'Rejected';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-left">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Link to="/" className="hover:text-amber-400 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-amber-300 font-medium">Order Tracking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Customer Orders & Live Tracking
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative status updates directly from KanakaDurga FireWorks Attapur dispatch hub.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="self-start sm:self-auto px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400/40 text-xs font-medium text-slate-200 flex items-center gap-2 transition-colors active:scale-95"
        >
          <RotateCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Status</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs text-slate-400 font-mono">Fetching your orders...</span>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-semibold text-slate-200">No active orders placed yet</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            When you place a Cash on Delivery order for your Attapur community, you can track every step from warehouse packing to doorstep delivery right here.
          </p>
          <Link
            to="/catalogue"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all shadow-md"
          >
            <span>Explore Catalogue</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Order Selector Cards */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-xs font-semibold text-amber-300 font-mono uppercase tracking-wider">
              Your Orders ({orders.length})
            </h2>

            {orders.map((ord) => {
              const active = ord.id === selectedOrder?.id;
              const ordCancelled = ord.orderStatus === 'Cancelled' || ord.orderStatus === 'Rejected';
              return (
                <div
                  key={ord.id}
                  onClick={() => setSelectedOrderId(ord.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                    active
                      ? 'bg-[#131F42] border-amber-400/60 shadow-lg shadow-amber-950/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-amber-400">
                      {ord.orderNumber}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        ordCancelled
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                          : ord.orderStatus === 'Delivered'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {ord.orderStatus}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-slate-300 flex items-center justify-between">
                    <span>{ord.deliveryAddress.communityName}</span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {formatRupee(ord.totalAmount)}
                    </span>
                  </div>

                  <div className="mt-1 text-[11px] text-slate-400 font-mono">
                    {formatDateTime(ord.createdAt)} · {ord.items.length} items
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Detailed Order Tracking Card */}
          {selectedOrder && (
            <div className="lg:col-span-7 rounded-2xl bg-[#111A35] border border-amber-500/30 p-6 sm:p-8 space-y-6 text-left shadow-2xl">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-800">
                <div>
                  <div className="text-xs text-slate-400 font-mono">
                    Order Reference ID
                  </div>
                  <div className="text-2xl font-serif font-bold text-amber-400 font-mono tracking-wide mt-0.5">
                    {selectedOrder.orderNumber}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Placed on {formatDateTime(selectedOrder.createdAt)}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Total Due on Delivery (COD)</span>
                  <span className="text-xl font-bold font-mono text-white tabular-nums">
                    {formatRupee(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Visual 5-Stage Timeline */}
              {isCancelled ? (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-sm">Order {selectedOrder.orderStatus}</span>
                    <p className="mt-1">
                      Reason: {selectedOrder.cancellationReason || 'Order was cancelled before delivery dispatch.'}
                    </p>
                    <span className="text-slate-400 text-[11px] block mt-1">
                      Inventory has been safely returned to store stock.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-200">
                    Delivery Progress Timeline
                  </div>

                  <div className="relative">
                    <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-800 -z-0 hidden sm:block" />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative z-10">
                      {stages.map((stage, idx) => {
                        const Icon = stage.icon;
                        const isCompleted = idx <= currentStageIndex;
                        const isCurrent = idx === currentStageIndex;

                        return (
                          <div
                            key={stage.status}
                            className={`flex sm:flex-col items-center gap-3 sm:gap-2 p-2 sm:p-0 rounded-lg ${
                              isCurrent ? 'bg-amber-500/10 sm:bg-transparent' : ''
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                                isCompleted
                                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md shadow-amber-950/50'
                                  : 'bg-slate-900 text-slate-500 border-slate-700'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <span
                              className={`text-xs text-left sm:text-center font-medium ${
                                isCurrent
                                  ? 'text-amber-300 font-bold'
                                  : isCompleted
                                  ? 'text-slate-200'
                                  : 'text-slate-500'
                              }`}
                            >
                              {stage.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Status Change Event Logs */}
              {selectedOrder.events && selectedOrder.events.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-300 mb-2">
                    Order Event Log
                  </div>
                  <div className="space-y-2 text-xs">
                    {selectedOrder.events.map((evt, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 text-slate-300 pb-1.5 border-b border-slate-800/60 last:border-none">
                        <div>
                          <span className="font-semibold text-amber-300">{evt.newStatus}: </span>
                          <span>{evt.note || 'Status updated'}</span>
                          <span className="text-[11px] text-slate-400 block">by {evt.changedBy}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono shrink-0">
                          {formatDateTime(evt.timestamp)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Items in Order */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-300">
                  Ordered Items ({selectedOrder.items.length})
                </div>
                <div className="divide-y divide-slate-800 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-white">{it.name}</div>
                        <div className="text-slate-400 font-mono text-[11px]">
                          SKU: {it.sku} · Qty: {it.quantity} × {formatRupee(it.unitPrice)}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-amber-400 tabular-nums">
                        {formatRupee(it.totalPrice)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address & Customer Support */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>Doorstep Address</span>
                  </div>
                  <p className="text-slate-300">
                    {selectedOrder.deliveryAddress.customerName} ({selectedOrder.deliveryAddress.phone})
                  </p>
                  <p className="text-slate-300">
                    {selectedOrder.deliveryAddress.flat}, {selectedOrder.deliveryAddress.block}
                    {selectedOrder.deliveryAddress.floor ? `, Floor ${selectedOrder.deliveryAddress.floor}` : ''}
                  </p>
                  <p className="text-amber-300 font-medium">
                    {selectedOrder.deliveryAddress.communityName}, Attapur
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-amber-400" />
                      <span>Payment Status</span>
                    </div>
                    <span className="text-xs text-amber-400 font-semibold block mt-1">
                      {selectedOrder.paymentStatus}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Cash to be collected upon doorstep verification.
                    </span>
                  </div>

                  <a
                    href="tel:+918121317368"
                    className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold pt-1"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Store Support (+91 81213 17368)</span>
                  </a>
                </div>
              </div>

            </div>
          )}

        </div>
      )}
    </div>
  );
};
