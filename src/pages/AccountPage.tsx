import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User as UserIcon,
  Phone,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  CheckCircle,
  AlertCircle,
  Loader2,
  Package,
  ArrowRight,
  Shield,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { api } from '../api/client.ts';
import { GoogleSignInButton } from '../components/GoogleSignInButton.tsx';

export const AccountPage: React.FC = () => {
  const { currentUser, setCurrentUser, logout } = useStore();

  // 'login' vs 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Form states
  const [displayName, setDisplayName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [showForgotNotice, setShowForgotNotice] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const validatePhoneInput = (val: string): boolean => {
    const clean = val.replace(/\D/g, '');
    if (val.startsWith('+')) {
      return clean.length >= 7 && clean.length <= 15;
    }
    // Indian standard 10 digits
    return clean.length === 10;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits) {
      setErrorMsg('Please enter your mobile number.');
      return;
    }
    if (!validatePhoneInput(phone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.loginCustomer({ phone, password });
      setCurrentUser(res.user);
      setSuccessMsg(`Welcome back, ${res.user.displayName || 'Resident'}! Logged in successfully.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid mobile number or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!displayName.trim()) {
      setErrorMsg('Please enter your full resident name.');
      return;
    }
    if (displayName.trim().length < 2) {
      setErrorMsg('Full name must be at least 2 characters long.');
      return;
    }

    const cleanDigits = phone.replace(/\D/g, '');
    if (!cleanDigits) {
      setErrorMsg('Please enter your mobile number.');
      return;
    }
    if (!validatePhoneInput(phone)) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setErrorMsg('Password must contain both letters and at least one number.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Password and confirmation password do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerCustomer({
        displayName: displayName.trim(),
        phone,
        password,
        confirmPassword,
      });
      setCurrentUser(res.user);
      setSuccessMsg(`Welcome to KanakaDurga FireWorks, ${res.user.displayName}! Account created.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (idToken: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.loginGoogle(idToken);
      setCurrentUser(res.user);
      setSuccessMsg(`Welcome, ${res.user.displayName || 'Resident'}! Signed in with Google.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-16 space-y-8 text-left">
      {/* Header & Breadcrumb */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Link to="/" className="hover:text-amber-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-amber-300 font-medium">Customer Account</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
          {currentUser ? 'Your Customer Account' : 'Resident Sign In & Registration'}
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          {currentUser
            ? 'Manage your resident identity and review past festive orders.'
            : 'Sign in with your mobile number & password, or use Google to track doorstep deliveries.'}
        </p>
      </div>

      {/* Feedback Messages */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* If Logged In: Profile View */}
      {currentUser ? (
        <div className="rounded-2xl bg-[#111A35] border border-amber-500/25 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-lg shadow">
                {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-white">{currentUser.displayName}</h3>
                <span className="text-xs text-amber-300 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Verified Resident</span>
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-500/30 hover:bg-rose-950/80 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {currentUser.email && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Registered Email:</span>
                <span className="font-mono text-white font-semibold mt-0.5 block truncate">{currentUser.email}</span>
              </div>
            )}
            {(currentUser.phone || currentUser.verifiedPhone) && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Mobile Number:</span>
                <span className="font-mono text-emerald-400 font-semibold mt-0.5 block">
                  {currentUser.phone || currentUser.verifiedPhone}
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Link
              to="/orders"
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/50 text-slate-200 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="font-bold block">Track My Orders</span>
                  <span className="text-[11px] text-slate-400">View progress & receipts</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              to="/catalogue"
              className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-400/50 text-slate-200 transition-colors flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <UserIcon className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="font-bold block">Browse Crackers</span>
                  <span className="text-[11px] text-slate-400">Explore Diwali deals</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>

          {/* Admin shortcut if current user is admin */}
          {currentUser.role === 'admin' && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Store Manager Privileges Active</span>
              <Link to="/admin" className="text-amber-400 hover:underline flex items-center gap-1 font-semibold">
                <Shield className="w-3.5 h-3.5" />
                <span>Go to Admin Portal →</span>
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* Sign In / Registration Options */
        <div className="rounded-2xl bg-[#111A35] border border-amber-500/25 p-6 sm:p-8 space-y-6 shadow-2xl">
          {/* Logo & Store Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-amber-400/50 bg-slate-950 shrink-0">
              <img
                src="/assets/aistudio/image_9c781e1e.png"
                alt="KanakaDurga FireWorks"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-left">
              <div className="text-sm font-serif font-bold text-white uppercase tracking-wider gold-gradient-text">
                KanakaDurga FireWorks
              </div>
              <div className="text-[10px] text-amber-400 font-telugu">
                “ఆనందానికి No Limits!” · Resident Portal
              </div>
            </div>
          </div>

          {/* Primary Option: Google Sign-In */}
          <div className="space-y-3 text-center">
            <p className="text-xs text-slate-300 text-left leading-relaxed">
              Fast, one-click sign in with your Google account:
            </p>
            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={(err) => setErrorMsg(err.message)}
              text="continue_with"
            />
          </div>

          {/* Visual Divider */}
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-800 w-full"></div>
            <span className="bg-[#111A35] px-3 text-[11px] font-mono uppercase tracking-wider text-slate-400 shrink-0">
              Or with Mobile Number & Password
            </span>
          </div>

          {/* Mode Switcher: Sign In vs Create Account */}
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                authMode === 'login'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Resident Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                authMode === 'register'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create New Account
            </button>
          </div>

          {/* Form Content */}
          {authMode === 'login' ? (
            /* Login Form */
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Mobile Number <span className="text-amber-400">*</span>
                </label>
                <div className="flex gap-2">
                  <span className="px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono flex items-center">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-300 font-medium">
                    Password <span className="text-amber-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotNotice((prev) => !prev)}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Forgot password?</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Secure Password Recovery Notice */}
              {showForgotNotice && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200 space-y-1 leading-relaxed">
                  <strong className="text-amber-300 block">Password Recovery Security Policy:</strong>
                  <span>
                    To protect customer addresses and order confidentiality, unauthenticated or SMS-based resets are disabled.
                    If you forgot your password, please contact store management at <strong className="text-white">+91 8121317368</strong> with your registered society & flat number for secure account assistance.
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <span>Sign In to Account</span>}
              </button>

              <div className="text-center pt-2">
                <span className="text-slate-400">Don't have an account yet? </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMsg(null);
                  }}
                  className="text-amber-400 hover:underline font-semibold"
                >
                  Create one now →
                </button>
              </div>
            </form>
          ) : (
            /* Registration Form */
            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Full Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Ramesh Varma"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Mobile Number <span className="text-amber-400">*</span>
                </label>
                <div className="flex gap-2">
                  <span className="px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono flex items-center">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                    className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Create Password <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters, letters & numbers"
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Must be at least 8 characters with both letters and numbers.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Confirm Password <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <span>Create Resident Account</span>}
              </button>

              <div className="text-center pt-2">
                <span className="text-slate-400">Already registered? </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMsg(null);
                  }}
                  className="text-amber-400 hover:underline font-semibold"
                >
                  Sign in here →
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
