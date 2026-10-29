import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, Banknote, AlertCircle, ArrowRight } from 'lucide-react';
import { CartItem, Community } from '../types/index.ts';
import { calculateCartTotals, formatRupee } from '../utils/pureLogic.ts';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: () => void;
  selectedCommunity?: Community;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  selectedCommunity,
}) => {
  if (!isOpen) return null;

  const minOrder = selectedCommunity?.minimumOrderAmount || 1000;
  const deliveryFee = selectedCommunity?.deliveryFee || 50;

  const { subtotal, total, itemCount, meetsMinimum, shortfall } = calculateCartTotals(
    items,
    deliveryFee,
    minOrder
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end">
      <div
        className="w-full max-w-md bg-[#0F1833] border-l border-amber-500/20 h-full flex flex-col justify-between text-slate-100 shadow-2xl animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Bag"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-serif font-bold text-white">Your Shopping Bag</h2>
            <span className="text-xs text-amber-300 font-mono">({itemCount} items)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close bag"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Itemized List or Empty State */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-slate-200">Your bag is empty</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Explore our festive catalogue of sparklers, chakkars, and aerial fireworks to illuminate your Diwali.
              </p>
              <button
                onClick={onClose}
                className="mt-2 px-4 py-2 text-xs font-semibold text-amber-400 border border-amber-400/40 rounded-lg hover:bg-amber-400/10 transition-colors"
              >
                Browse Catalogue
              </button>
            </div>
          ) : (
            items.map(({ product, quantity }) => (
              <div
                key={product.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3.5"
              >
                {/* Product thumbnail */}
                <div className="w-14 h-14 rounded-lg bg-slate-950 border border-slate-700/60 flex items-center justify-center shrink-0 overflow-hidden text-center text-[10px] font-mono text-amber-300/80 p-1">
                  {product.category.substring(0, 8)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate">{product.name}</h4>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {formatRupee(product.sellingPrice)} × {quantity}
                  </div>
                  <div className="text-xs font-bold text-amber-400 font-mono tabular-nums mt-0.5">
                    {formatRupee(product.sellingPrice * quantity)}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center border border-slate-700 rounded bg-slate-950">
                    <button
                      onClick={() => onUpdateQuantity(product.id, quantity - 1)}
                      className="p-1 text-slate-400 hover:text-white"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-xs font-bold font-mono">{quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(product.id, quantity + 1)}
                      disabled={quantity >= product.stockQuantity}
                      className="p-1 text-slate-400 hover:text-white disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    onClick={() => onRemoveItem(product.id)}
                    className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-0.5 transition-colors"
                    aria-label={`Remove ${product.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer & Checkout CTA */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 space-y-3">
            {/* Minimum Order Warning */}
            {!meetsMinimum && (
              <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Minimum order is {formatRupee(minOrder)}</span>
                  <span>Add {formatRupee(shortfall)} more of crackers to proceed to delivery checkout.</span>
                </div>
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Subtotal ({itemCount} items)</span>
                <span className="font-mono tabular-nums text-white">{formatRupee(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Doorstep Delivery Fee ({selectedCommunity ? selectedCommunity.name : 'Attapur'})</span>
                <span className="font-mono tabular-nums text-white">{formatRupee(deliveryFee)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
                <span>Total to Collect (COD)</span>
                <span className="font-mono text-amber-400 tabular-nums">{formatRupee(total)}</span>
              </div>
            </div>

            {/* Cash on Delivery Notice */}
            <div className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-amber-300/90 font-medium">
              <Banknote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Payment: 100% Cash on Delivery at your flat</span>
            </div>

            {/* Checkout Button */}
            <button
              onClick={() => {
                if (meetsMinimum) {
                  onProceedToCheckout();
                }
              }}
              disabled={!meetsMinimum}
              className={`w-full py-3.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                meetsMinimum
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-950/60 active:scale-98'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>{meetsMinimum ? 'Proceed to Delivery Details' : `Add ${formatRupee(shortfall)} More`}</span>
              {meetsMinimum && <ArrowRight className="w-4 h-4 text-slate-950" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
