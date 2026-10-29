import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  MapPin,
  Banknote,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle,
  Lock,
  Phone,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { api } from '../api/client.ts';
import { GoogleSignInButton } from '../components/GoogleSignInButton.tsx';
import { calculateCartTotals, formatRupee, validateCommunityAndBlock } from '../utils/pureLogic.ts';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cartItems, clearCart, communities, currentUser, setCurrentUser, setLastPlacedOrder } = useStore();

  const preselectedCommId = searchParams.get('communityId') || communities[0]?.id || '';

  const [selectedCommId, setSelectedCommId] = useState<string>(preselectedCommId);
  const [selectedBlock, setSelectedBlock] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>(currentUser?.displayName || '');
  const [phone, setPhone] = useState<string>(currentUser?.verifiedPhone || currentUser?.phone || '');
  const [floor, setFloor] = useState<string>('');
  const [flat, setFlat] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const isOrderPlacedRef = useRef<boolean>(false);

  // In-checkout resident authentication state (Google or Mobile + Password)
  const [authMethod, setAuthMethod] = useState<'google' | 'phone'>('google');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authPhone, setAuthPhone] = useState<string>('');
  const [authName, setAuthName] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [showAuthPassword, setShowAuthPassword] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [authFeedback, setAuthFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Auto-sync customer name & phone if user signs in while on checkout
  useEffect(() => {
    if (currentUser) {
      if (!customerName && currentUser.displayName) {
        setCustomerName(currentUser.displayName);
      }
      const userPhone = currentUser.verifiedPhone || currentUser.phone;
      if (!phone && userPhone) {
        setPhone(userPhone);
      }
    }
  }, [currentUser]);

  // If cart is empty, redirect to cart page unless order was just submitted
  useEffect(() => {
    if (cartItems.length === 0 && !isOrderPlacedRef.current && !isSubmitting) {
      navigate('/cart');
    }
  }, [cartItems, navigate, isSubmitting]);

  const selectedCommunity = communities.find((c) => c.id === selectedCommId) || communities[0];

  useEffect(() => {
    if (selectedCommunity && selectedCommunity.allowedBlocks.length > 0) {
      if (!selectedCommunity.allowedBlocks.includes(selectedBlock)) {
        setSelectedBlock(selectedCommunity.allowedBlocks[0]);
      }
    }
  }, [selectedCommunity]);

  const { subtotal, deliveryFee, total, meetsMinimum } = calculateCartTotals(
    cartItems,
    selectedCommunity?.deliveryFee || 50,
    selectedCommunity?.minimumOrderAmount || 1000
  );

  // In-checkout Google sign-in
  const handleGoogleSuccess = async (idToken: string) => {
    setAuthFeedback(null);
    setAuthLoading(true);
    try {
      const res = await api.loginGoogle(idToken);
      setCurrentUser(res.user);
      if (res.user.displayName) setCustomerName(res.user.displayName);
      setAuthFeedback({ type: 'success', message: 'Signed in with Google! You can now place your order.' });
    } catch (err: any) {
      setAuthFeedback({ type: 'error', message: err.message || 'Google Sign-In failed' });
    } finally {
      setAuthLoading(false);
    }
  };

  // In-checkout mobile + password authentication
  const handlePhonePasswordAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    const cleanDigits = authPhone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      setAuthFeedback({ type: 'error', message: 'Please enter a valid 10-digit Indian mobile number.' });
      return;
    }
    if (!authPassword || authPassword.length < 8) {
      setAuthFeedback({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === 'register') {
        if (!authName.trim()) {
          setAuthFeedback({ type: 'error', message: 'Please enter your full name.' });
          setAuthLoading(false);
          return;
        }
        const res = await api.registerCustomer({
          displayName: authName.trim(),
          phone: authPhone,
          password: authPassword,
          confirmPassword: authPassword,
        });
        setCurrentUser(res.user);
        if (res.user.displayName) setCustomerName(res.user.displayName);
        const userPhone = res.user.verifiedPhone || res.user.phone;
        if (userPhone) setPhone(userPhone);
        setAuthFeedback({ type: 'success', message: 'Account created and signed in! You can now place your order.' });
      } else {
        const res = await api.loginCustomer({
          phone: authPhone,
          password: authPassword,
        });
        setCurrentUser(res.user);
        if (res.user.displayName) setCustomerName(res.user.displayName);
        const userPhone = res.user.verifiedPhone || res.user.phone;
        if (userPhone) setPhone(userPhone);
        setAuthFeedback({ type: 'success', message: 'Logged in successfully! You can now place your order.' });
      }
    } catch (err: any) {
      setAuthFeedback({ type: 'error', message: err.message || 'Authentication failed. Please check your credentials.' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Mandatory Login check
    if (!currentUser) {
      setErrorMsg('Resident sign-in is mandatory to place an order. Please sign in or verify your mobile number below.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg('Please provide full recipient name for delivery.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number for doorstep coordination.');
      return;
    }

    if (!selectedCommunity) {
      setErrorMsg('Please select an authorized residential community in Attapur.');
      return;
    }

    const blockCheck = validateCommunityAndBlock(selectedCommunity, selectedBlock);
    if (!blockCheck.isValid) {
      setErrorMsg(blockCheck.error || 'Invalid block selected.');
      return;
    }

    if (!flat.trim()) {
      setErrorMsg('Flat / Unit number is required for door delivery.');
      return;
    }

    if (!meetsMinimum) {
      setErrorMsg(`Subtotal of ${formatRupee(subtotal)} is below required minimum of ${formatRupee(selectedCommunity.minimumOrderAmount)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        communityId: selectedCommunity.id,
        communityName: selectedCommunity.name,
        deliveryAddress: {
          customerName: customerName.trim(),
          phone: phone.trim(),
          communityId: selectedCommunity.id,
          communityName: selectedCommunity.name,
          block: selectedBlock,
          floor: floor.trim(),
          flat: flat.trim(),
          landmark: landmark.trim(),
          deliveryInstructions: instructions.trim(),
        },
        items: cartItems.map((i) => ({
          productId: i.product.id,
          sku: i.product.sku,
          name: i.product.name,
          quantity: i.quantity,
        })),
      };

      const createdOrder = await api.createOrder(payload);
      isOrderPlacedRef.current = true;
      setLastPlacedOrder(createdOrder);
      clearCart();
      // Redirect to dedicated order confirmation page
      navigate(`/order-success/${createdOrder.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place order. Please review your address details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-left">
      {/* Breadcrumb & Header */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Link to="/" className="hover:text-amber-400 transition-colors">Home</Link>
          <span>/</span>
          <Link to="/cart" className="hover:text-amber-400 transition-colors">Shopping Bag</Link>
          <span>/</span>
          <span className="text-amber-300 font-medium">Checkout</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
          Community Doorstep Delivery Details
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Deliveries are restricted exclusively to authorized residential societies in Attapur. Payment is 100% Cash on Delivery (COD).
        </p>
      </div>

      {/* MANDATORY RESIDENT LOGIN STATUS CARD */}
      {currentUser ? (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                <span>Verified Resident: {currentUser.displayName}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-900/80 text-emerald-200 border border-emerald-500/30">
                  Ready to Order
                </span>
              </div>
              <div className="text-slate-400 text-[11px] font-mono mt-0.5">
                {currentUser.email ? `Email: ${currentUser.email}` : ''}
                {currentUser.verifiedPhone ? ` · Mobile: ${currentUser.verifiedPhone}` : ''}
              </div>
            </div>
          </div>
          <Link
            to="/account"
            className="text-amber-400 hover:underline text-[11px] self-start sm:self-center font-medium"
          >
            Switch Account
          </Link>
        </div>
      ) : (
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-950/40 via-[#111A35] to-[#111A35] border-2 border-amber-400/60 shadow-xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/40">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm sm:text-base font-serif font-bold text-white flex items-center gap-2">
                <span>Resident Login Required to Place Order</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400 text-slate-950 uppercase tracking-wide">
                  Mandatory
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                To guarantee safe gated-society delivery and prevent unauthorized orders, please verify your resident identity before confirming.
              </p>
            </div>
          </div>

          {authFeedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                authFeedback.type === 'error'
                  ? 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
                  : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
              }`}
            >
              {authFeedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{authFeedback.message}</span>
            </div>
          )}

          {/* Quick In-Place Sign In */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Fast 1-Click Verification:</span>
              <div className="flex gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setAuthMethod('google')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    authMethod === 'google'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMethod('phone')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    authMethod === 'phone'
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Mobile & Password
                </button>
              </div>
            </div>

            {authMethod === 'google' ? (
              <div className="py-1">
                <GoogleSignInButton
                  onSuccess={handleGoogleSuccess}
                  onError={(err) => setAuthFeedback({ type: 'error', message: err.message })}
                  text="signin_with"
                />
              </div>
            ) : (
              <div className="space-y-3 text-xs pt-1">
                <div className="flex gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-1 rounded font-semibold transition-colors ${
                      authMode === 'login' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    className={`flex-1 py-1 rounded font-semibold transition-colors ${
                      authMode === 'register' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    New Resident? Register
                  </button>
                </div>

                <form onSubmit={handlePhonePasswordAuth} className="space-y-2">
                  {authMode === 'register' && (
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Full Name (e.g. Ramesh Varma)"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400 text-xs"
                    />
                  )}

                  <div className="flex gap-1.5">
                    <span className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-400 font-mono flex items-center">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-amber-400 text-xs"
                    />
                  </div>

                  <div className="relative">
                    <input
                      type={showAuthPassword ? 'text' : 'password'}
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder={authMode === 'register' ? 'Min 8 chars, letter + number' : 'Enter password'}
                      className="w-full px-3 py-1.5 pr-8 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAuthPassword((p) => !p)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showAuthPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2 rounded-lg bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition-colors flex items-center justify-center gap-1.5 text-xs shadow"
                  >
                    {authLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>{authMode === 'register' ? 'Register & Continue Checkout' : 'Sign In & Continue Checkout'}</span>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Delivery Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Delivery Details Form */}
        <div className="lg:col-span-7 rounded-2xl bg-[#111A35] border border-slate-800 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-400" />
              <span>Resident Delivery Location</span>
            </h2>
            <Link to="/cart" className="text-xs text-amber-400 hover:underline">
              ← Edit Items
            </Link>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">
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
              <label className="block text-slate-300 font-medium mb-1">
                Mobile Number (Delivery Call) <span className="text-amber-400">*</span>
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

          {/* Community & Permitted Block Dropdowns */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-amber-500/20 space-y-4 text-xs">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Society Gate Clearance</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Residential Society <span className="text-amber-400">*</span>
                </label>
                <select
                  value={selectedCommId}
                  onChange={(e) => setSelectedCommId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                >
                  {communities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
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
              </div>
            </div>

            {/* Flat, Floor, Landmark */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Floor No.</label>
                <input
                  type="text"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="e.g. 3rd Floor"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Flat / Unit <span className="text-amber-400">*</span></label>
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
                <label className="block text-slate-300 font-medium mb-1">Landmark</label>
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
              <label className="block text-slate-300 font-medium mb-1">Delivery Notes (Optional)</label>
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Call upon reaching security gate, keep exact COD change"
                className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Place Order */}
        <div className="lg:col-span-5 rounded-2xl bg-[#111A35] border border-amber-500/25 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center gap-3 pb-3 border-b border-amber-500/20">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-amber-400/50 bg-slate-950 shrink-0">
              <img
                src="/assets/aistudio/image_9c781e1e.png"
                alt="KanakaDurga FireWorks"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="text-sm font-serif font-bold text-white uppercase tracking-wider gold-gradient-text">
                KanakaDurga FireWorks
              </div>
              <div className="text-[10px] text-amber-400 font-medium font-telugu">
                “ఆనందానికి No Limits!”
              </div>
            </div>
          </div>

          <h2 className="text-base font-serif font-bold text-white">
            Order Bill Summary ({cartItems.length} items)
          </h2>

          <div className="divide-y divide-slate-800 bg-slate-900/60 rounded-xl overflow-hidden border border-slate-800 text-xs">
            {cartItems.map((item) => (
              <div key={item.product.id} className="p-3 flex justify-between items-center">
                <div className="truncate pr-2">
                  <span className="font-semibold text-white block truncate">{item.product.name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Qty: {item.quantity} × {formatRupee(item.product.sellingPrice)}
                  </span>
                </div>
                <span className="font-mono font-bold text-amber-400 tabular-nums">
                  {formatRupee(item.product.sellingPrice * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800 pt-4">
            <div className="flex justify-between">
              <span>Items Subtotal</span>
              <span className="font-mono text-white tabular-nums">{formatRupee(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Society Delivery Charge ({selectedCommunity?.name})</span>
              <span className="font-mono text-white tabular-nums">{formatRupee(deliveryFee)}</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-bold text-white">
              <span>Total Payable Amount</span>
              <span className="font-mono text-amber-400 tabular-nums">{formatRupee(total)}</span>
            </div>
          </div>

          {/* Payment Method Badge (100% Cash on Delivery) */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-bold text-white block">Cash on Delivery</span>
                <span className="text-[11px] text-slate-400">Pay when agent reaches door</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
              COD Only
            </span>
          </div>

          {/* Mandatory Login Placement Button */}
          {currentUser ? (
            <button
              type="submit"
              disabled={isSubmitting || !meetsMinimum}
              className="w-full py-3.5 rounded-lg text-xs sm:text-sm font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-lg shadow-amber-950/60 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Confirming Order...</span>
                </>
              ) : (
                <span>Confirm & Place Order (COD)</span>
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <button
                type="submit"
                className="w-full py-3.5 rounded-lg text-xs sm:text-sm font-bold text-slate-400 bg-slate-800/90 border border-amber-500/30 hover:border-amber-400 transition-colors flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>Sign In Required to Place Order</span>
              </button>
              <p className="text-[11px] text-center text-amber-300/80 font-mono">
                ↑ Verify your resident identity above to unlock order confirmation
              </p>
            </div>
          )}
        </div>

      </form>
    </div>
  );
};
