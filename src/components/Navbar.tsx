import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  Sparkles,
  User as UserIcon,
  Menu,
  X,
  Home,
  Flame,
  Building2,
  Package,
  ShieldAlert,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';

interface NavbarProps {
  onOpenBackendInfo?: () => void;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const location = useLocation();
  const { cartCount, currentUser, logout } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0B132B]/95 backdrop-blur-md border-b border-amber-500/20 transition-all">
        {/* Promotion & Delivery Policy Bar */}
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-b border-amber-500/15 py-1.5 px-3 sm:px-4 text-[11px] sm:text-xs text-amber-200/90 text-center flex flex-wrap items-center justify-center gap-2 sm:gap-3 leading-tight">
          <span className="flex items-center gap-1.5 font-medium tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            Delivering strictly to verified gated communities in Attapur, Hyderabad
          </span>
          <span className="hidden sm:inline text-amber-400/40">·</span>
          <span className="text-amber-300 font-semibold">Cash on Delivery (COD) Only</span>
        </div>

        {/* Main Navbar Bar */}
        <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-1.5 sm:gap-6">
          
          {/* LEFT ZONE: Mobile Browse Pages button & Brand Wordmark */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* MOBILE LEFT CORNER: Option to Browse Other Pages */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-900/90 border border-amber-500/40 text-amber-300 hover:text-white hover:bg-slate-800 active:scale-95 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 shrink-0"
              aria-label="Open menu to browse other pages"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-bold text-slate-100 tracking-tight">Browse</span>
            </button>

            {/* BRAND WORDMARK (Desktop & Mobile) */}
            <Link
              to="/"
              className="flex items-center gap-2 sm:gap-3 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded-md shrink-0"
              aria-label="KanakaDurga FireWorks Home"
            >
              <div className="h-8 w-8 sm:h-11 sm:w-11 rounded-lg overflow-hidden border border-amber-400/50 shadow-md shadow-amber-950/60 bg-slate-950 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0">
                <img
                  src="/assets/aistudio/image_9c781e1e.png"
                  alt="KanakaDurga FireWorks Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="leading-tight">
                <div className="text-xs sm:text-xl font-serif font-bold tracking-wide sm:tracking-wider gold-gradient-text uppercase">
                  KanakaDurga FireWorks
                </div>
                <div className="hidden sm:flex items-center gap-1.5 text-[9px] sm:text-[10px] text-amber-300/80 tracking-wider font-mono mt-0.5">
                  <span className="text-amber-400 font-semibold font-telugu">ఆనందానికి No Limits!</span>
                  <span>·</span>
                  <span>Attapur, Hyderabad</span>
                </div>
              </div>
            </Link>
          </div>

          {/* DESKTOP NAVIGATION LINKS */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <NavLink
              to="/catalogue"
              className={({ isActive }) =>
                `hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-8 ${
                  isActive ? 'text-amber-400 font-semibold underline' : ''
                }`
              }
            >
              Catalogue
            </NavLink>
            <NavLink
              to="/communities"
              className={({ isActive }) =>
                `hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-8 ${
                  isActive ? 'text-amber-400 font-semibold underline' : ''
                }`
              }
            >
              Eligible Communities
            </NavLink>
            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-8 ${
                  isActive ? 'text-amber-400 font-semibold underline' : ''
                }`
              }
            >
              Track Orders
            </NavLink>
            <a
              href="#safety-section"
              className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 hover:underline underline-offset-8"
            >
              Safety Guidelines
            </a>
          </nav>

          {/* TOP RIGHT CORNER: User Login + Primary Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

            {/* TOP RIGHT: USER LOGIN / ACCOUNT */}
            <Link
              to="/account"
              className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-400/15 border border-amber-400/40 hover:bg-amber-400/25 text-amber-300 transition-all shadow-sm active:scale-95 shrink-0"
              aria-label="User Account and Login"
            >
              {currentUser ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold text-[9px] sm:text-[10px]">
                    {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="max-w-[60px] sm:max-w-[100px] truncate text-white text-[11px] sm:text-xs">
                    {currentUser.displayName ? currentUser.displayName.split(' ')[0] : 'Account'}
                  </span>
                </>
              ) : (
                <>
                  <UserIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-amber-300 font-bold text-[11px] sm:text-xs">Login</span>
                </>
              )}
            </Link>

            {/* SHOPPING BAG */}
            <Link
              to="/cart"
              className="relative px-2 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 rounded-lg hover:from-amber-300 hover:to-amber-400 transition-all shadow-md shadow-amber-950/40 flex items-center gap-1 sm:gap-2 whitespace-nowrap shrink-0 active:scale-95"
              aria-label={`View Shopping Bag with ${cartCount} items`}
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950" />
              <span className="hidden sm:inline">Bag</span>
              <span className="inline-flex items-center justify-center min-w-[16px] sm:min-w-[20px] h-3.5 sm:h-5 px-1 text-[9px] sm:text-[11px] font-black text-amber-950 bg-white rounded-full tabular-nums shadow-sm">
                {cartCount}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* MOBILE BROWSE PAGES DRAWER (Slide-over from Left Corner) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <div className="relative w-full max-w-xs bg-[#0B132B] border-r border-amber-500/30 shadow-2xl flex flex-col h-full z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 border-b border-amber-500/20 flex items-center justify-between bg-gradient-to-r from-amber-950/40 to-slate-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg overflow-hidden border border-amber-400/50 shadow bg-slate-950 shrink-0">
                  <img
                    src="/assets/aistudio/image_9c781e1e.png"
                    alt="KanakaDurga FireWorks Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="text-xs font-serif font-bold gold-gradient-text uppercase">
                    KanakaDurga FireWorks
                  </div>
                  <div className="text-[10px] text-amber-400 font-medium font-telugu">
                    ఆనందానికి No Limits!
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-amber-300" />
              </button>
            </div>

            {/* Quick Community Delivery Note */}
            <div className="mx-3 my-3 p-2.5 rounded-lg bg-amber-400/10 border border-amber-400/25 text-[11px] text-amber-200 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Delivering only to Attapur gated societies · COD</span>
            </div>

            {/* User Account / Login Bar inside Drawer */}
            <div className="px-3 pb-2">
              <Link
                to="/account"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full p-3 rounded-xl bg-slate-900/90 border border-amber-500/30 hover:border-amber-400 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-xs">
                    {currentUser ? (currentUser.displayName?.charAt(0).toUpperCase() || 'U') : <UserIcon className="w-4 h-4" />}
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                      {currentUser ? currentUser.displayName : 'Resident Sign In / Login'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {currentUser ? `Role: ${currentUser.role}` : 'Save address & track orders'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
              </Link>
            </div>

            {/* Page Navigation Links */}
            <div className="flex-1 px-3 py-2 space-y-1 text-left">
              <div className="px-2 pb-1 text-[10px] font-mono uppercase tracking-wider text-amber-300/70">
                Explore Pages
              </div>

              <NavLink
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-semibold'
                      : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Home className="w-4 h-4 text-amber-400" />
                  <span>Home Storefront</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </NavLink>

              <NavLink
                to="/catalogue"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-semibold'
                      : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Festive Catalogue</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300">
                  Shop
                </span>
              </NavLink>

              <NavLink
                to="/communities"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-semibold'
                      : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Eligible Communities</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  5 Areas
                </span>
              </NavLink>

              <NavLink
                to="/orders"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-semibold'
                      : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-amber-400" />
                  <span>Track Orders</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </NavLink>

              <NavLink
                to="/cart"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-semibold'
                      : 'text-slate-200 hover:bg-slate-800/80 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>Shopping Bag</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  {cartCount}
                </span>
              </NavLink>

              <a
                href="#safety-section"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-2.5 rounded-lg text-xs font-medium text-slate-200 hover:bg-slate-800/80 hover:text-white transition-all"
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Safety & Regulations</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </a>

            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/60 text-xs">
              {currentUser && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 hover:bg-rose-950/80 transition-colors flex items-center justify-center gap-2 mb-3"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              )}
              <div className="text-[10px] text-slate-500 text-center">
                KanakaDurga FireWorks · Attapur, Hyderabad
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
