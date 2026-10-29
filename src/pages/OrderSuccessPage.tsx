import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sparkles, MapPin, Banknote, ArrowRight, Package, CheckCircle2 } from 'lucide-react';
import { Order } from '../types/index.ts';
import { api } from '../api/client.ts';
import { useStore } from '../context/StoreContext.tsx';
import { formatRupee, formatDateTime } from '../utils/pureLogic.ts';

export const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { lastPlacedOrder } = useStore();
  const [order, setOrder] = useState<Order | null>(lastPlacedOrder);
  const [loading, setLoading] = useState<boolean>(!lastPlacedOrder);

  useEffect(() => {
    const fetchOrder = async () => {
      if (lastPlacedOrder && lastPlacedOrder.id === orderId) {
        setOrder(lastPlacedOrder);
        setLoading(false);
        return;
      }
      if (!orderId) return;
      try {
        const found = await api.getOrderById(orderId);
        setOrder(found);
      } catch (e) {
        console.warn('Could not load order by ID:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, lastPlacedOrder]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto mb-4" />
        <span className="text-xs text-slate-400 font-mono">Generating confirmed order invoice...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-2xl bg-[#0F1833] border border-slate-800 text-center space-y-4">
        <h2 className="text-xl font-serif font-bold text-white">Order Details Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested order confirmation is not available. Please verify in your order tracking dashboard.
        </p>
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors"
        >
          <span>Go to Order Tracking</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center space-y-6">
      {/* Decorative Brand Emblem with Logo */}
      <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400/50 flex items-center justify-center mx-auto shadow-xl shadow-amber-950/80 bg-slate-950">
        <img
          src="/assets/aistudio/image_9c781e1e.png"
          alt="KanakaDurga FireWorks"
          className="w-full h-full object-cover"
        />
      </div>

      <div>
        <h1 className="text-3xl font-serif font-bold text-white">Order Placed Successfully!</h1>
        <div className="text-sm font-telugu font-bold text-amber-400 mt-1">“ఆనందానికి No Limits!”</div>
        <p className="text-xs text-slate-300 mt-2 max-w-md mx-auto">
          Thank you for choosing KanakaDurga FireWorks! Your festive fireworks order has been recorded and reserved in our Attapur dispatch inventory.
        </p>
      </div>

      {/* Order Reference Box */}
      <div className="p-5 rounded-2xl bg-[#111A35] border border-amber-500/30 text-center space-y-1 shadow-2xl">
        <span className="text-[11px] text-amber-300/80 font-mono uppercase tracking-wider block">
          Unique Order Reference Number
        </span>
        <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 tracking-wider">
          {order.orderNumber}
        </div>
        <span className="text-xs text-slate-400 font-mono">
          {formatDateTime(order.createdAt)} · {order.items.length} items
        </span>
      </div>

      {/* Delivery & Cash Collection Card */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 text-left text-xs space-y-3">
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white block">Delivery Doorstep Address:</span>
            <span className="text-slate-300">
              {order.customerName} ({order.customerPhone})
            </span>
            <span className="text-slate-300 block">
              {order.deliveryAddress.flat}, {order.deliveryAddress.block}
              {order.deliveryAddress.floor ? `, ${order.deliveryAddress.floor}` : ''},{' '}
              {order.deliveryAddress.communityName}, Attapur
            </span>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-3 border-t border-slate-800">
          <Banknote className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white block">Amount to Collect on Delivery (COD):</span>
            <span className="text-lg font-bold font-mono text-amber-400 tabular-nums">
              {formatRupee(order.totalAmount)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Please keep exact cash ready upon delivery at your door. No online payment was requested.
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Redirection Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Link
          to="/orders"
          className="w-full sm:w-auto px-6 py-3 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-950/60 flex items-center justify-center gap-2 transition-all active:scale-98"
        >
          <span>Track Order Status</span>
          <ArrowRight className="w-4 h-4 text-slate-950" />
        </Link>

        <Link
          to="/catalogue"
          className="w-full sm:w-auto px-6 py-3 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
};
