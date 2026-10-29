import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Sparkles, Search, Filter, ShoppingBag, ArrowRight } from 'lucide-react';
import { Product } from '../types/index.ts';
import { api } from '../api/client.ts';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';

const CATEGORIES = [
  'All',
  'Sparklers',
  'Ground Chakkars',
  'Flower Pots (Anar)',
  'Aerial Shots',
  'Rockets',
  'Gift Boxes',
];

export const CataloguePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart, cartItems, cartCount } = useStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedCategory = searchParams.get('category') || 'All';
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sort') || 'featured';

  const fetchProds = async () => {
    setLoading(true);
    try {
      const prods = await api.getProducts({
        category: selectedCategory,
        search: searchQuery,
        sort: sortBy,
      });
      setProducts(prods);
    } catch (e) {
      console.warn('Failed to load products:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProds();

    // Auto-synchronize when admin adds, updates, deletes products or adjusts stock
    const handleSync = () => {
      fetchProds();
    };

    window.addEventListener('kanakadurga:data_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('kanakadurga:data_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [selectedCategory, searchQuery, sortBy]);

  const updateParam = (key: string, value: string) => {
    const current = new URLSearchParams(searchParams);
    if (!value || value === 'All' || (key === 'sort' && value === 'featured')) {
      current.delete(key);
    } else {
      current.set(key, value);
    }
    setSearchParams(current);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-left">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
            <Link to="/" className="hover:text-amber-400 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-amber-300 font-medium">Catalogue</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Diwali Crackers Catalogue
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Certified safe family celebration fireworks delivering to Attapur societies.
          </p>
        </div>

        {/* Search Input & Sort Selector */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by name, SKU or type..."
              value={searchQuery}
              onChange={(e) => updateParam('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-amber-400 font-sans"
          >
            <option value="featured">Sort: Featured Collection</option>
            <option value="discount_desc">Sort: Highest Discount %</option>
            <option value="price_asc">Sort: Price (Low to High)</option>
            <option value="price_desc">Sort: Price (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Category Filter Tabs (Zero-Pill Discipline: Clean Segmented Controls) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-medium">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => updateParam('category', cat)}
            className={`px-3.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
              selectedCategory === cat
                ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                : 'bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="h-80 rounded-xl bg-slate-900/50 border border-slate-800 animate-pulse p-4 space-y-4">
                <div className="w-full aspect-[4/3] bg-slate-800 rounded-lg" />
                <div className="h-4 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-200">
              No products found
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No active crackers match your selected filters. Try searching for a different keyword or category.
            </p>
            <button
              onClick={() => {
                setSearchParams(new URLSearchParams());
              }}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-amber-400 border border-amber-400/40 hover:bg-amber-400/10"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => {
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

      {/* Floating Cart Access Pill if Items Present */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 right-6 z-30 animate-in slide-in-from-bottom duration-200">
          <Link
            to="/cart"
            className="px-5 py-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2.5 shadow-2xl shadow-amber-950/80 active:scale-95 transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-slate-950" />
            <span>View Bag ({cartCount} items)</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </Link>
        </div>
      )}
    </div>
  );
};
