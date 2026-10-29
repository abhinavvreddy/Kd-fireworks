import React from 'react';
import { CheckCircle2, Sparkles, Banknote, MapPin, ArrowRight } from 'lucide-react';
import { Order } from '../types/index.ts';
import { formatRupee, formatDateTime } from '../utils/pureLogic.ts';

interface OrderSuccessModalProps {
  order: Order | null;
  onClose: () => void;
  onTrackOrder: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
  onTrackOrder,
}) => {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#0F1833] border border-amber-500/40 shadow-2xl p-6 sm:p-8 text-center text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Decorative Brand Logo */}
        <div className="w-16 h-16 rounded-xl overflow-hidden border border-amber-400/50 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-950/60 bg-slate-950">
          <img
            src="/assets/aistudio/image_9c781e1e.png"
            alt="KanakaDurga FireWorks"
            className="w-full h-full object-cover"
          />
        </div>

        <h2 className="text-2xl font-serif font-bold text-white">Order Confirmed!</h2>
        <div className="text-xs font-telugu font-bold text-amber-400 mt-0.5">“ఆనందానికి No Limits!”</div>
        <p className="text-xs text-slate-300 mt-1">
          Thank you for choosing KanakaDurga FireWorks to light up your Diwali celebration.
        </p>

        {/* Order Number Box */}
        <div className="mt-5 p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 text-center space-y-1">
          <span className="text-[11px] text-amber-300/80 font-mono uppercase tracking-wider block">
            Order Reference Number
          </span>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400 tracking-wider">
            {order.orderNumber}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {formatDateTime(order.createdAt)}
          </span>
        </div>

        {/* Delivery & Cash Collection Snapshot */}
        <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left text-xs space-y-2.5">
          <div className="flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Delivery Address:</span>
              <span className="text-slate-300">
                {order.deliveryAddress.flat}, {order.deliveryAddress.block}
                {order.deliveryAddress.floor ? ` (${order.deliveryAddress.floor})` : ''},{' '}
                {order.deliveryAddress.communityName}, Attapur
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 pt-2 border-t border-slate-800">
            <Banknote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-white block">Amount to Collect on Delivery (COD):</span>
              <span className="text-amber-400 font-mono font-bold text-sm">
                {formatRupee(order.totalAmount)}
              </span>
              <span className="text-[11px] text-slate-400 block">
                Please keep exact change ready upon delivery at your door.
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => {
              onClose();
              onTrackOrder();
            }}
            className="w-full py-3 px-4 rounded-lg text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-950/60 flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <span>Track Order Status</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 px-4 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            Continue Shopping
          </button>
        </div>

      </div>
    </div>
  );
};
