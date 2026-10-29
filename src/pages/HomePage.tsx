import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  MapPin,
  Banknote,
  ShieldCheck,
  CheckCircle,
  Package,
} from 'lucide-react';
import { Product } from '../types/index.ts';
import { api } from '../api/client.ts';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { formatRupee } from '../utils/pureLogic.ts';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart, cartItems, communities, refreshCommunities } = useStore();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeatured = async () => {
    try {
      const prods = await api.getProducts({ sort: 'featured' });
      setFeaturedProducts(prods.filter((p) => p.isFeatured).slice(0, 4));
    } catch (e) {
      console.warn('Failed to load featured products', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeatured();

    // Auto-synchronize when admin mutates data or another browser tab changes products
    const handleSync = () => {
      loadFeatured();
      refreshCommunities();
    };

    window.addEventListener('kanakadurga:data_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('kanakadurga:data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  return (
    <div className="space-y-16 lg:space-y-24 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:py-20 border-b border-amber-500/15 bg-gradient-to-b from-[#0B132B] via-[#0F1A3A] to-[#0B132B]">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Headline and CTAs */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Authentic Festive Fireworks · Attapur, Hyderabad</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white tracking-tight leading-tight [text-wrap:balance]">
                Make This Diwali Shine with{' '}
                <span className="gold-gradient-text block sm:inline">KanakaDurga FireWorks</span>
              </h1>

              <div className="text-amber-400 text-lg sm:text-2xl font-medium tracking-wide flex items-center gap-2.5 flex-wrap">
                <span className="font-telugu font-bold text-amber-300">“ఆనందానికి No Limits!”</span>
                <span className="text-xs text-amber-200/80 font-mono tracking-normal bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                  Attapur Special
                </span>
              </div>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl">
                Authentic green and low-smoke fireworks crafted for joyful family celebrations. 
                Delivered safely directly to resident doorsteps in select approved gated communities across Attapur.
              </p>

              {/* CTAs with Page Redirection */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/catalogue"
                  className="px-6 py-3.5 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 transition-all shadow-lg shadow-amber-950/60 flex items-center gap-2 group active:scale-95"
                >
                  <span>Shop Crackers</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/catalogue?sort=discount_desc"
                  className="px-6 py-3.5 rounded-lg text-sm font-semibold text-slate-200 bg-slate-900/80 border border-amber-500/30 hover:border-amber-400 hover:text-amber-300 transition-all flex items-center gap-2 active:scale-95"
                >
                  <span>Explore Best Deals</span>
                </Link>
              </div>

              {/* Trust Markers Bar */}
              <div className="pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
                <Link to="/communities" className="flex items-center gap-2.5 hover:text-amber-300 transition-colors">
                  <div className="w-7 h-7 rounded bg-amber-400/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block">Community Delivery</span>
                    <span className="text-slate-400">{communities.length} Attapur Townships</span>
                  </div>
                </Link>

                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-amber-400/10 flex items-center justify-center shrink-0">
                    <Banknote className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block">Cash on Delivery</span>
                    <span className="text-slate-400">Pay upon doorstep receipt</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-amber-400/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <span className="font-semibold text-white block">Verified Inventory</span>
                    <span className="text-slate-400">Atomic real-time stock</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Festive Showcase Card with Uploaded Logo Artwork */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl p-1 bg-gradient-to-b from-amber-500/40 via-amber-600/20 to-slate-900 shadow-2xl shadow-slate-950">
                <div className="relative rounded-xl overflow-hidden bg-[#111A35] p-5 text-left border border-slate-700/50">
                  <div className="relative rounded-lg overflow-hidden border border-amber-500/30 shadow-xl bg-slate-950 group">
                    <img
                      src="/assets/aistudio/image_9c781e1e.png"
                      alt="KanakaDurga FireWorks — ఆనందానికి No Limits!"
                      className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    />
                    <div className="p-3 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent border-t border-amber-500/20">
                      <div className="font-serif text-lg font-bold text-amber-300">
                        KanakaDurga Festive Collection
                      </div>
                      <div className="text-xs text-slate-300 font-mono mt-0.5">
                        Sparklers · Chakkars · Anars · Aerial Cakes · Gift Boxes
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 p-3.5 rounded-lg bg-slate-900/90 border border-amber-500/30 text-xs space-y-1.5">
                    <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      Resident Community Restriction Policy
                    </div>
                    <p className="text-slate-300 leading-normal">
                      Orders are accepted exclusively for resident flats within registered societies in Attapur. Your block will be validated during checkout.
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                    <Link
                      to="/communities"
                      className="p-2.5 rounded bg-slate-900/50 border border-slate-800 hover:border-amber-400/40 text-slate-300 transition-colors"
                    >
                      <span className="text-slate-400 block text-[11px]">Eligible Towns</span>
                      <span className="font-bold text-amber-300">View {communities.length} Societies →</span>
                    </Link>
                    <Link
                      to="/catalogue"
                      className="p-2.5 rounded bg-slate-900/50 border border-slate-800 hover:border-amber-400/40 text-slate-300 transition-colors"
                    >
                      <span className="text-slate-400 block text-[11px]">Payment Mode</span>
                      <span className="font-bold text-amber-300">100% COD</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Featured Bestsellers Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-left">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-mono tracking-wider uppercase mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Handpicked Diwali Specials</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Featured Festive Crackers
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Top-selling celebration favorites with verified inventory.
            </p>
          </div>

          <Link
            to="/catalogue"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 font-mono uppercase tracking-wider"
          >
            <span>View Full Catalogue ({featuredProducts.length ? '8+ SKUs' : ''})</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Product Cards Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-80 rounded-xl bg-slate-900/50 border border-slate-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => {
                const inCart = cartItems.find((i) => i.product.id === product.id);
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={(p) => addToCart(p, 1)}
                    onViewDetails={(p) => navigate(`/products/${p.id}`)}
                    cartQuantity={inCart ? inCart.quantity : 0}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Approved Communities Banner Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-[#111A35] via-[#162248] to-[#111A35] border border-amber-500/25 p-8 sm:p-12 text-left relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-mono tracking-wider uppercase">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Attapur Resident Security</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white">
                Only Approved Gated Communities Can Checkout
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                We coordinate directly with society gate security at Janapriya Utopia, Silpa Green Valley, Trendset Winz, Fortune Butterfly City, and Maple Town to ensure safe, lawful fireworks handling straight to your flat.
              </p>
              <div className="pt-2">
                <Link
                  to="/communities"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors shadow-md"
                >
                  <span>Check Approved Societies & Blocks</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4 bg-slate-900/80 p-5 rounded-xl border border-slate-800 space-y-3 text-xs">
              <span className="font-serif font-bold text-amber-300 block text-sm">
                Doorstep COD Delivery Terms
              </span>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Strictly Cash on Delivery — pay only when items reach your flat.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Flat and block details validated against society registry.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Atomic inventory reservations prevent out-of-stock surprises.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
