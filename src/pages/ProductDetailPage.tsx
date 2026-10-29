import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  ShieldAlert,
  Plus,
  Minus,
  Check,
  ShoppingBag,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Banknote,
  MapPin,
} from 'lucide-react';
import { Product } from '../types/index.ts';
import { api } from '../api/client.ts';
import { useStore } from '../context/StoreContext.tsx';
import { formatRupee, calculateDiscount } from '../utils/pureLogic.ts';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, cartItems } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [qty, setQty] = useState<number>(1);
  const [addedNotice, setAddedNotice] = useState<boolean>(false);

  useEffect(() => {
    const fetchProd = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const p = await api.getProductById(id);
        setProduct(p);
      } catch (e) {
        console.warn('Failed to load product details:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProd();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mx-auto mb-4" />
        <span className="text-xs text-slate-400 font-mono">Loading cracker specifications...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto my-20 p-8 rounded-2xl bg-[#0F1833] border border-slate-800 text-center space-y-4">
        <h2 className="text-xl font-serif font-bold text-white">Product Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested item may have been discontinued or is no longer in active stock.
        </p>
        <Link
          to="/catalogue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Catalogue</span>
        </Link>
      </div>
    );
  }

  const discount = calculateDiscount(product.mrp, product.sellingPrice);
  const isOutOfStock = product.stockQuantity <= 0;
  const inCartItem = cartItems.find((i) => i.product.id === product.id);

  const handleAddAndStay = () => {
    addToCart(product, qty);
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 3000);
  };

  const handleAddAndCheckout = () => {
    addToCart(product, qty);
    navigate('/cart');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-left">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/" className="hover:text-amber-400 transition-colors">Home</Link>
        <span>/</span>
        <Link to="/catalogue" className="hover:text-amber-400 transition-colors">Catalogue</Link>
        <span>/</span>
        <Link
          to={`/catalogue?category=${encodeURIComponent(product.category)}`}
          className="hover:text-amber-400 transition-colors"
        >
          {product.category}
        </Link>
        <span>/</span>
        <span className="text-amber-300 font-medium truncate max-w-[200px]">{product.name}</span>
      </div>

      {/* Main Contiguous Purchase Module (PDP Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Visual Showcase (Sticky gallery) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-[4/3] sm:aspect-square w-full rounded-2xl overflow-hidden bg-slate-900 border border-amber-500/20 relative flex items-center justify-center shadow-xl">
            {product.images && product.images.length > 0 && product.images[0].startsWith('http') ? (
              <img
                src={product.images[0]}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#0F1E4A] via-[#162248] to-[#0A112A] flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                <div className="w-20 h-20 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mb-4 shadow-lg shadow-amber-950/60">
                  <Sparkles className="w-10 h-10 text-amber-400" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-amber-200">{product.name}</h3>
                <span className="text-xs text-amber-400/80 font-mono mt-1 uppercase tracking-wider">
                  {product.category}
                </span>
              </div>
            )}

            {discount > 0 && (
              <div className="absolute top-4 left-4 px-3 py-1 rounded-md text-xs font-bold bg-amber-500 text-slate-950 shadow-md">
                {discount}% OFF
              </div>
            )}
          </div>

          {/* Quick Specifications Strip */}
          <div className="p-4 rounded-xl bg-[#111A35] border border-slate-800 grid grid-cols-3 gap-3 text-center text-xs">
            <div className="p-2 rounded bg-slate-900/60">
              <span className="text-slate-400 block text-[11px]">Packaging</span>
              <span className="font-bold text-white font-mono mt-0.5">{product.packQuantity} {product.packUnit}</span>
            </div>
            <div className="p-2 rounded bg-slate-900/60">
              <span className="text-slate-400 block text-[11px]">SKU Code</span>
              <span className="font-bold text-amber-300 font-mono mt-0.5">{product.sku}</span>
            </div>
            <div className="p-2 rounded bg-slate-900/60">
              <span className="text-slate-400 block text-[11px]">Inventory</span>
              <span className={`font-bold font-mono mt-0.5 ${isOutOfStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isOutOfStock ? 'Out of Stock' : `${product.stockQuantity} in stock`}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Contiguous Purchase Module */}
        <div className="lg:col-span-6 rounded-2xl bg-[#111A35] border border-amber-500/25 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase tracking-wider">
              <span>{product.category}</span>
              <span>·</span>
              <span>Attapur Verified Stock</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-1">
              {product.name}
            </h1>

            {/* Price Presentation with Rupee formatting */}
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-3xl font-bold font-mono text-amber-400 tabular-nums">
                {formatRupee(product.sellingPrice)}
              </span>
              {product.mrp > product.sellingPrice && (
                <span className="text-base text-slate-500 line-through font-mono tabular-nums">
                  {formatRupee(product.mrp)}
                </span>
              )}
              {discount > 0 && (
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                  Save {formatRupee(product.mrp - product.sellingPrice)} ({discount}% off)
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-slate-800 pt-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-mono">
              Product Overview
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* PESO & Safety Warnings */}
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/25 space-y-1.5 text-xs">
            <div className="font-semibold text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Safety & Usage Precautions</span>
            </div>
            <p className="text-slate-300 leading-normal">
              {product.safetyInformation || 'Maintain safety distance. Store in cool, dry location away from flame and children.'}
            </p>
          </div>

          {/* Purchase Controls & Quantity Steppers */}
          <div className="border-t border-slate-800 pt-6 space-y-4">
            {!isOutOfStock && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Select Quantity:</span>
                <div className="flex items-center border border-slate-700 rounded-lg bg-slate-900">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="p-2.5 text-slate-400 hover:text-white transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-10 text-center text-sm font-bold font-mono text-white tabular-nums">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty((q) => Math.min(product.stockQuantity, q + 1))}
                    className="p-2.5 text-slate-400 hover:text-white transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* CTAs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleAddAndStay}
                disabled={isOutOfStock}
                className="w-full py-3 px-4 rounded-lg text-xs font-bold bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/30 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{addedNotice ? 'Added to Bag!' : `Add ${qty} to Bag`}</span>
              </button>

              <button
                onClick={handleAddAndCheckout}
                disabled={isOutOfStock}
                className="w-full py-3 px-4 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-950/60 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
              >
                <span>Buy Now (COD)</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>

            {inCartItem && (
              <div className="text-center text-xs text-amber-300/80 font-mono">
                Currently {inCartItem.quantity} unit(s) of this item in your shopping bag.
              </div>
            )}
          </div>

          {/* Trust Guarantees */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-amber-400 shrink-0" />
              <span>100% Cash on Delivery</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Attapur Society Delivery</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
