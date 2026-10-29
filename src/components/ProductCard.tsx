import React from 'react';
import { Plus, Check, AlertCircle, Sparkles } from 'lucide-react';
import { Product } from '../types/index.ts';
import { formatRupee, calculateDiscount } from '../utils/pureLogic.ts';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onViewDetails: (product: Product) => void;
  cartQuantity: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onViewDetails,
  cartQuantity,
}) => {
  const discount = calculateDiscount(product.mrp, product.sellingPrice);
  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = !isOutOfStock && product.stockQuantity <= product.lowStockThreshold;

  // Category specific icon colors
  const getCategoryGradient = (cat: string) => {
    switch (cat) {
      case 'Sparklers':
        return 'from-amber-600/30 to-amber-900/40 text-amber-300';
      case 'Ground Chakkars':
        return 'from-emerald-600/30 to-teal-900/40 text-emerald-300';
      case 'Flower Pots (Anar)':
        return 'from-rose-600/30 to-amber-900/40 text-rose-300';
      case 'Aerial Shots':
        return 'from-indigo-600/30 to-purple-900/40 text-indigo-300';
      case 'Gift Boxes':
        return 'from-amber-500/40 to-yellow-800/40 text-amber-200';
      default:
        return 'from-slate-700/30 to-slate-900/40 text-slate-300';
    }
  };

  return (
    <div
      onClick={() => onViewDetails(product)}
      className="card-navy rounded-xl overflow-hidden flex flex-col justify-between group transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-950/30 cursor-pointer text-left relative"
    >
      {/* Product Image Slot with Styled Resilient Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-900/90 border-b border-slate-800/80">
        {product.images && product.images.length > 0 && product.images[0].startsWith('http') ? (
          <img
            src={product.images[0]}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              // Graceful fallback to styled motif
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          /* Styled Fallback Motif matching luxury festive theme */
          <div className={`w-full h-full bg-gradient-to-br ${getCategoryGradient(product.category)} flex flex-col items-center justify-center p-4 relative`}>
            <div className="w-12 h-12 rounded-full bg-slate-950/50 border border-amber-500/20 flex items-center justify-center shadow-inner mb-2">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <span className="text-xs font-serif font-semibold text-center text-slate-200 px-3 line-clamp-1">
              {product.name}
            </span>
            <span className="text-[11px] text-amber-400/80 font-mono mt-0.5">
              {product.packQuantity} {product.packUnit}
            </span>
          </div>
        )}

        {/* Clean Top Badges: Stock or Discount */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
          {discount > 0 && (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500 text-slate-950 shadow-sm">
              {discount}% OFF
            </span>
          )}
          {product.isDemo && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800/90 border border-slate-700 text-slate-300">
              Sample Item
            </span>
          )}
        </div>

        {/* Stock warning pill if applicable */}
        {isOutOfStock ? (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center z-20">
            <span className="px-3 py-1 rounded bg-rose-950/90 border border-rose-500/50 text-rose-200 text-xs font-semibold">
              Sold Out
            </span>
          </div>
        ) : isLowStock ? (
          <div className="absolute bottom-2 left-2.5 z-10 flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/90 border border-amber-500/50 text-[11px] text-amber-300 font-medium">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>Only {product.stockQuantity} left</span>
          </div>
        ) : null}
      </div>

      {/* Product Content */}
      <div className="p-4 flex flex-col flex-1 justify-between space-y-3">
        <div className="space-y-1">
          {/* Category & Pack metadata (Clean unboxed text with dot separator) */}
          <div className="flex items-center gap-1.5 text-xs text-amber-300/80 font-medium tracking-wide uppercase">
            <span>{product.category}</span>
            <span aria-hidden="true">·</span>
            <span>{product.packQuantity} {product.packUnit}</span>
          </div>

          {/* Product Name */}
          <h3 className="text-base font-semibold text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-1">
            {product.name}
          </h3>

          {/* Short description */}
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Pricing & Add To Cart Button */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-amber-400 font-mono tabular-nums">
                {formatRupee(product.sellingPrice)}
              </span>
              {product.mrp > product.sellingPrice && (
                <span className="text-xs text-slate-500 line-through font-mono tabular-nums">
                  {formatRupee(product.mrp)}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block font-mono">
              SKU: {product.sku}
            </span>
          </div>

          {/* Add to Cart button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isOutOfStock) {
                onAddToCart(product);
              }
            }}
            disabled={isOutOfStock}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isOutOfStock
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : cartQuantity > 0
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md shadow-amber-950/40'
                : 'bg-slate-800 text-amber-300 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30'
            }`}
            aria-label={`Add ${product.name} to cart`}
          >
            {cartQuantity > 0 ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{cartQuantity} in Bag</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
