import React, { useState } from 'react';
import { X, User as UserIcon, Phone, Shield, LogOut, CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Lock } from 'lucide-react';
import { User } from '../types/index.ts';
import { GoogleSignInButton } from './GoogleSignInButton.tsx';
import { api } from '../api/client.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onLogout: () => void;
  onGoogleLogin: (idToken?: string) => Promise<void>;
  onBootstrapAdmin?: (secret: string) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onGoogleLogin,
  onBootstrapAdmin,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer');
  const [authMethod, setAuthMethod] = useState<'google' | 'phone'>('google');
  const [customerMode, setCustomerMode] = useState<'login' | 'register'>('login');

  // Customer credentials
  const [phone, setPhone] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Admin bootstrap state
  const [adminSecret, setAdminSecret] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) {
      setErrorMsg('Please enter a valid 10-digit Indian phone number.');
      return;
    }
    if (!password || password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      if (customerMode === 'register') {
        if (!displayName.trim()) {
          setErrorMsg('Please enter your full name.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Password and confirmation do not match.');
          setLoading(false);
          return;
        }
        await api.registerCustomer({
          displayName: displayName.trim(),
          phone,
          password,
          confirmPassword,
        });
        setSuccessMsg('Account registered successfully!');
      } else {
        await api.loginCustomer({
          phone,
          password,
        });
        setSuccessMsg('Logged in successfully!');
      }
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (idToken: string) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await onGoogleLogin(idToken);
      setSuccessMsg('Signed in with Google successfully!');
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      if (onBootstrapAdmin) {
        await onBootstrapAdmin(adminSecret);
      } else {
        await api.bootstrapAdmin(adminSecret);
      }
      setSuccessMsg('Admin credentials authorized successfully!');
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid admin bootstrap secret');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-md rounded-2xl bg-[#0F1833] border border-amber-500/30 shadow-2xl p-6 text-slate-100 overflow-hidden text-left"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-400/50 bg-slate-950 flex items-center justify-center shrink-0">
              <img
                src="/assets/aistudio/image_9c781e1e.png"
                alt="KanakaDurga FireWorks"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-white">
                {currentUser ? 'Your Account' : 'Account Authentication'}
              </h2>
              <span className="text-[11px] text-amber-300/80 font-mono">
                KanakaDurga FireWorks · Attapur
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback banners */}
        {errorMsg && (
          <div className="mt-4 p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* If Already Logged In: Profile View */}
        {currentUser ? (
          <div className="mt-5 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Signed In As:</span>
                <span className="font-bold text-white text-sm">{currentUser.displayName}</span>
              </div>
              {currentUser.email && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Email:</span>
                  <span className="font-mono text-slate-200">{currentUser.email}</span>
                </div>
              )}
              {(currentUser.phone || currentUser.verifiedPhone) && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Mobile:</span>
                  <span className="font-mono text-emerald-400">{currentUser.phone || currentUser.verifiedPhone}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Role Privilege:</span>
                <span
                  className={`font-semibold uppercase tracking-wider ${
                    currentUser.role === 'admin' ? 'text-amber-400' : 'text-slate-300'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-2.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-500/30 hover:bg-rose-950/80 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          /* Sign In Form Tabs */
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setActiveTab('customer')}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'customer'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Customer Sign-In
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Admin Bootstrap
              </button>
            </div>

            {activeTab === 'customer' ? (
              <div className="space-y-4">
                {/* Method selector: Google vs Phone */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    onClick={() => setAuthMethod('google')}
                    className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 font-medium transition-colors ${
                      authMethod === 'google'
                        ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400'
                    }`}
                  >
                    <span>Google Sign-In</span>
                  </button>
                  <button
                    onClick={() => setAuthMethod('phone')}
                    className={`py-2 px-3 rounded-lg border flex items-center justify-center gap-1.5 font-medium transition-colors ${
                      authMethod === 'phone'
                        ? 'border-amber-400 bg-amber-400/10 text-amber-300'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400'
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Mobile & Password</span>
                  </button>
                </div>

                {authMethod === 'google' ? (
                  <div className="space-y-3 pt-2 text-center">
                    <p className="text-xs text-slate-300 text-left">
                      Sign in with your Google account to track orders and save your delivery flat details for quick checkout.
                    </p>
                    <GoogleSignInButton
                      onSuccess={handleGoogleSuccess}
                      onError={(err) => setErrorMsg(err.message)}
                      text="continue_with"
                    />
                  </div>
                ) : (
                  /* Mobile + Password Form */
                  <form onSubmit={handleCustomerSubmit} className="space-y-3 pt-1">
                    <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setCustomerMode('login')}
                        className={`flex-1 py-1 rounded font-semibold transition-colors ${
                          customerMode === 'login' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomerMode('register')}
                        className={`flex-1 py-1 rounded font-semibold transition-colors ${
                          customerMode === 'register' ? 'bg-amber-400 text-slate-950' : 'text-slate-400'
                        }`}
                      >
                        New Resident? Register
                      </button>
                    </div>

                    {customerMode === 'register' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="e.g. Ramesh Varma"
                          className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Mobile Number
                      </label>
                      <div className="flex gap-2">
                        <span className="px-2.5 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-400 font-mono flex items-center">
                          +91
                        </span>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="9876543210"
                          className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password (min 8 characters)"
                          className="w-full px-3 py-2 pr-9 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {customerMode === 'register' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-3 w-full py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <span>{customerMode === 'register' ? 'Register Account' : 'Sign In'}</span>}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              /* Admin Bootstrap Form */
              <form onSubmit={handleAdminBootstrap} className="space-y-3 pt-1">
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span>Secure Admin Provisioning</span>
                  </div>
                  <p className="text-slate-300 leading-normal">
                    Enter the server administrator secret key configured in <code className="font-mono text-amber-300">backend/.env</code>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Bootstrap Secret Key
                  </label>
                  <input
                    type="password"
                    required
                    value={adminSecret}
                    onChange={(e) => setAdminSecret(e.target.value)}
                    placeholder="Enter administrator secret key"
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <span>Authorize as Store Admin</span>}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
