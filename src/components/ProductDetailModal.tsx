import React, { useState } from 'react';
import { X, Sparkles, ShieldAlert, Plus, Minus, Check, ShoppingBag } from 'lucide-react';
import { Product } from '../types/index.ts';
import { formatRupee, calculateDiscount } from '../utils/pureLogic.ts';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, quantity: number) => void;
  cartQuantity: number;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  cartQuantity,
}) => {
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const discount = calculateDiscount(product.mrp, product.sellingPrice);
  const isOutOfStock = product.stockQuantity <= 0;

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product, qty);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-[#0F1833] border border-amber-500/30 shadow-2xl text-left overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-product-title"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-slate-900/80 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          aria-label="Close product modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 sm:p-8">
          
          {/* Left Column: Visual Motif or Image */}
          <div className="md:col-span-5 flex flex-col justify-between">
            <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-900 border border-amber-500/20 relative flex items-center justify-center">
              {product.images && product.images.length > 0 && product.images[0].startsWith('http') ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-600/20 via-slate-900 to-indigo-950/40 flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mb-3">
                    <Sparkles className="w-8 h-8 text-amber-400" />
                  </div>
                  <span className="font-serif text-lg font-bold text-amber-200">
                    {product.name}
                  </span>
                  <span className="text-xs text-slate-400 font-mono mt-1">
                    {product.category}
                  </span>
                </div>
              )}

              {discount > 0 && (
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500 text-slate-950 shadow-md">
                  {discount}% OFF
                </span>
              )}
            </div>

            {/* Packaging quick details */}
            <div className="mt-4 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Pack Details:</span>
                <span className="font-semibold text-slate-200">{product.packQuantity} {product.packUnit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">SKU Code:</span>
                <span className="font-mono text-amber-300">{product.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Inventory Status:</span>
                <span className={isOutOfStock ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                  {isOutOfStock ? 'Sold Out' : `${product.stockQuantity} units available`}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Information, Pricing and Buy Module */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              <div className="text-xs text-amber-400 font-mono uppercase tracking-wider">
                {product.category}
              </div>
              <h2 id="modal-product-title" className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
                {product.name}
              </h2>

              {/* Price row */}
              <div className="flex items-baseline gap-3 mt-3">
                <span className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
                  {formatRupee(product.sellingPrice)}
                </span>
                {product.mrp > product.sellingPrice && (
                  <span className="text-sm text-slate-500 line-through font-mono tabular-nums">
                    {formatRupee(product.mrp)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="text-xs font-semibold text-emerald-400">
                    Save {formatRupee(product.mrp - product.sellingPrice)}
                  </span>
                )}
              </div>

              {/* Full Description */}
              <div className="mt-4 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-slate-800 pt-3">
                {product.description}
              </div>

              {/* Safety & Usage Instructions */}
              <div className="mt-4 p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs space-y-1.5">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Safety Precautions & Usage</span>
                </div>
                <p className="text-slate-300 leading-normal">
                  {product.safetyInformation || 'Always maintain distance. Light under adult supervision on open flat ground.'}
                </p>
              </div>
            </div>

            {/* Quantity Stepper & Add To Bag */}
            <div className="pt-4 border-t border-slate-800 flex items-center gap-4">
              {!isOutOfStock && (
                <div className="flex items-center border border-slate-700 rounded-lg bg-slate-900">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="p-2 text-slate-300 hover:text-white transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold font-mono tabular-nums">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => Math.min(product.stockQuantity, q + 1))}
                    className="p-2 text-slate-300 hover:text-white transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <button
                onClick={handleAdd}
                disabled={isOutOfStock}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  isOutOfStock
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-950/50 active:scale-98'
                }`}
              >
                {isOutOfStock ? (
                  <span>Currently Out of Stock</span>
                ) : (
                  <>
                    <ShoppingBag className="w-4 h-4 text-slate-950" />
                    <span>Add {qty > 1 ? `${qty} Packs` : 'to Bag'} · {formatRupee(product.sellingPrice * qty)}</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
