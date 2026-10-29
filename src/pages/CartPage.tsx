import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  MapPin,
  Banknote,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { calculateCartTotals, formatRupee } from '../utils/pureLogic.ts';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, updateCartQuantity, removeFromCart, communities, currentUser } = useStore();

  const [selectedCommId, setSelectedCommId] = useState<string>(
    communities[0]?.id || 'comm-janapriya'
  );

  const selectedCommunity =
    communities.find((c) => c.id === selectedCommId) || communities[0];

  const minOrder = selectedCommunity?.minimumOrderAmount || 1000;
  const deliveryFee = selectedCommunity?.deliveryFee || 50;

  const { subtotal, total, itemCount, meetsMinimum, shortfall } = calculateCartTotals(
    cartItems,
    deliveryFee,
    minOrder
  );

  const progressPercent = Math.min(100, Math.round((subtotal / minOrder) * 100));

  if (cartItems.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-20 p-8 sm:p-12 rounded-2xl bg-[#0F1833] border border-slate-800 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-serif font-bold text-white">Your Shopping Bag is Empty</h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
          Add authentic sparklers, spinning chakkars, or majestic aerial cakes from our Attapur festive store to illuminate your Diwali.
        </p>
        <div className="pt-2">
          <Link
            to="/catalogue"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-lg shadow-amber-950/60"
          >
            <span>Explore Festive Catalogue</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-left">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Link to="/" className="hover:text-amber-400 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-amber-300 font-medium">Shopping Bag</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Shopping Bag Review
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review items, choose delivery society, and check order threshold.
          </p>
        </div>

        <Link
          to="/catalogue"
          className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Add More Items</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Itemized Products List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-[#111A35] border border-slate-800 divide-y divide-slate-800 overflow-hidden shadow-xl">
            {cartItems.map(({ product, quantity }) => (
              <div key={product.id} className="p-4 sm:p-5 flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden p-1 text-center font-mono text-[10px] text-amber-300">
                  {product.category}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/products/${product.id}`}
                    className="text-sm font-semibold text-white hover:text-amber-300 transition-colors block truncate"
                  >
                    {product.name}
                  </Link>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {product.packQuantity} {product.packUnit} · {formatRupee(product.sellingPrice)} each
                  </div>
                  <div className="text-sm font-bold font-mono text-amber-400 tabular-nums mt-1">
                    {formatRupee(product.sellingPrice * quantity)}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center border border-slate-700 rounded-lg bg-slate-900">
                    <button
                      onClick={() => updateCartQuantity(product.id, quantity - 1)}
                      className="p-1.5 text-slate-400 hover:text-white"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold font-mono text-white tabular-nums">
                      {quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(product.id, quantity + 1)}
                      disabled={quantity >= product.stockQuantity}
                      className="p-1.5 text-slate-400 hover:text-white disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(product.id)}
                    className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Attapur Delivery Reminder */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Orders are delivered directly to verified gated apartments around Attapur, Hyderabad.
            </span>
          </div>
        </div>

        {/* Right Column: Order Summary & Community Threshold */}
        <div className="lg:col-span-5 rounded-2xl bg-[#111A35] border border-amber-500/25 p-6 sm:p-8 space-y-6 shadow-2xl">
          <h2 className="text-lg font-serif font-bold text-white">
            Delivery Society & Bill
          </h2>

          {/* Community Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Select Your Gated Community (Attapur):
            </label>
            <select
              value={selectedCommId}
              onChange={(e) => setSelectedCommId(e.target.value)}
              className="w-full px-3 py-2.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
            >
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.locality})
                </option>
              ))}
            </select>
          </div>

          {/* Minimum Order Progress Bar */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-medium">Minimum Order Goal:</span>
              <span className="font-mono text-amber-300 font-bold">{formatRupee(minOrder)}</span>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  meetsMinimum ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {meetsMinimum ? (
              <div className="text-[11px] text-emerald-300 flex items-center gap-1 font-medium pt-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Minimum requirement met for {selectedCommunity?.name}!</span>
              </div>
            ) : (
              <div className="text-[11px] text-amber-300 flex items-start gap-1.5 pt-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Add {formatRupee(shortfall)} more of crackers to unlock delivery checkout.</span>
              </div>
            )}
          </div>

          {/* Order Bill Breakdown */}
          <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-4">
            <div className="flex justify-between">
              <span>Subtotal ({itemCount} items)</span>
              <span className="font-mono text-white tabular-nums">{formatRupee(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Society Delivery Charge ({selectedCommunity?.name})</span>
              <span className="font-mono text-white tabular-nums">{formatRupee(deliveryFee)}</span>
            </div>
            <div className="pt-3 border-t border-slate-800 flex justify-between text-base font-bold text-white">
              <span>Total Payable Amount</span>
              <span className="font-mono text-amber-400 tabular-nums">{formatRupee(total)}</span>
            </div>
          </div>

          {/* Cash on Delivery Badge */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5 text-xs text-amber-300">
            <Banknote className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold block">100% Cash on Delivery (COD)</span>
              <span className="text-[11px] text-slate-400">Pay when order reaches your door.</span>
            </div>
          </div>

          {/* Checkout CTA Redirecting to /checkout */}
          <div className="space-y-2">
            <button
              onClick={() => {
                if (meetsMinimum) {
                  navigate(`/checkout?communityId=${selectedCommunity.id}`);
                }
              }}
              disabled={!meetsMinimum}
              className={`w-full py-3.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                meetsMinimum
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-lg shadow-amber-950/60 active:scale-98'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <span>{meetsMinimum ? 'Proceed to Delivery Checkout' : `Add ${formatRupee(shortfall)} More to Order`}</span>
              {meetsMinimum && <ArrowRight className="w-4 h-4 text-slate-950" />}
            </button>

            {!currentUser && meetsMinimum && (
              <p className="text-[11px] text-center text-amber-300/80 font-mono">
                🔒 Note: Resident login will be required at checkout to confirm delivery
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
