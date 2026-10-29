import React, { useState, useEffect } from 'react';
import { X, MapPin, Banknote, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { CartItem, Community, User } from '../types/index.ts';
import { calculateCartTotals, formatRupee, validateCommunityAndBlock } from '../utils/pureLogic.ts';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  communities: Community[];
  currentUser: User | null;
  onOrderPlaced: (order: any) => void;
  onSubmitOrder: (payload: any) => Promise<any>;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  communities,
  currentUser,
  onOrderPlaced,
  onSubmitOrder,
}) => {
  if (!isOpen) return null;

  const [selectedCommId, setSelectedCommId] = useState<string>(communities[0]?.id || '');
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>(currentUser?.displayName || '');
  const [phone, setPhone] = useState<string>(currentUser?.verifiedPhone || '');
  const [floor, setFloor] = useState<string>('');
  const [flat, setFlat] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedCommunity = communities.find((c) => c.id === selectedCommId);

  // Auto-select first allowed block when community changes
  useEffect(() => {
    if (selectedCommunity && selectedCommunity.allowedBlocks.length > 0) {
      if (!selectedCommunity.allowedBlocks.includes(selectedBlock)) {
        setSelectedBlock(selectedCommunity.allowedBlocks[0]);
      }
    }
  }, [selectedCommunity]);

  const { subtotal, deliveryFee, total, meetsMinimum, shortfall } = calculateCartTotals(
    items,
    selectedCommunity?.deliveryFee || 50,
    selectedCommunity?.minimumOrderAmount || 1000
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg('Please enter customer full name.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number for delivery coordination.');
      return;
    }

    if (!selectedCommunity) {
      setErrorMsg('Please select an authorized community in Attapur.');
      return;
    }

    const blockValidation = validateCommunityAndBlock(selectedCommunity, selectedBlock);
    if (!blockValidation.isValid) {
      setErrorMsg(blockValidation.error || 'Invalid block selection.');
      return;
    }

    if (!flat.trim()) {
      setErrorMsg('Flat / Villa number is required for doorstep delivery.');
      return;
    }

    if (!meetsMinimum) {
      setErrorMsg(`Minimum order amount of ${formatRupee(selectedCommunity.minimumOrderAmount)} not met. Shortfall: ${formatRupee(shortfall)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        communityId: selectedCommunity.id,
        deliveryAddress: {
          customerName: customerName.trim(),
          phone: phone.trim(),
          block: selectedBlock,
          floor: floor.trim(),
          flat: flat.trim(),
          landmark: landmark.trim(),
          deliveryInstructions: instructions.trim(),
        },
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      };

      const resultOrder = await onSubmitOrder(payload);
      onOrderPlaced(resultOrder);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place order. Please review your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-[#0F1833] border border-amber-500/30 shadow-2xl text-left overflow-hidden text-slate-100 my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 id="checkout-modal-title" className="text-lg font-serif font-bold text-white">
                Community Delivery Checkout
              </h2>
              <span className="text-xs text-amber-300/80 font-mono">
                Attapur, Hyderabad · Cash on Delivery (COD)
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ramesh Varma"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Mobile Number (for Delivery Call) <span className="text-amber-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit number e.g. 9876543210"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>

          {/* Community & Block Selectors */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/20 space-y-4">
            <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Restricted Society Delivery Location</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Residential Community <span className="text-amber-400">*</span>
                </label>
                <select
                  value={selectedCommId}
                  onChange={(e) => setSelectedCommId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                >
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.locality})
                    </option>
                  ))}
                </select>
                {selectedCommunity && (
                  <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                    Min order: {formatRupee(selectedCommunity.minimumOrderAmount)} · Delivery: {formatRupee(selectedCommunity.deliveryFee)}
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Permitted Block / Tower <span className="text-amber-400">*</span>
                </label>
                <select
                  value={selectedBlock}
                  onChange={(e) => setSelectedBlock(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400 font-mono"
                >
                  {selectedCommunity?.allowedBlocks.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Only society-approved blocks are permitted for delivery.
                </span>
              </div>
            </div>

            {/* Flat, Floor, Landmark */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Floor Number
                </label>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="e.g. 3rd Floor"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Flat / Unit Number <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={flat}
                  onChange={(e) => setFlat(e.target.value)}
                  placeholder="e.g. Flat 304"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Landmark (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near Clubhouse"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Delivery Instructions (Optional)
              </label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Call security gate on arrival, keep COD cash ready"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Payment Method Display (COD ONLY - No gateway) */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">Payment Method</span>
                <span className="text-[11px] text-slate-400">Cash on Delivery (COD) strictly</span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Pay upon Delivery
            </span>
          </div>

          {/* Order Summary & Pricing */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="font-semibold text-white mb-2 pb-1 border-b border-slate-800">
              Order Bill Summary ({items.length} items)
            </div>
            <div className="flex justify-between">
              <span>Items Subtotal</span>
              <span className="font-mono text-white tabular-nums">{formatRupee(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Community Delivery Charge ({selectedCommunity?.name})</span>
              <span className="font-mono text-white tabular-nums">{formatRupee(deliveryFee)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
              <span>Total Payable Amount</span>
              <span className="font-mono text-amber-400 tabular-nums">{formatRupee(total)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !meetsMinimum}
              className="px-6 py-2.5 rounded-lg text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-950/60 disabled:opacity-50 flex items-center gap-2 active:scale-98 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <span>Confirm & Place Order (COD)</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
