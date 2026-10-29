import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, ShieldCheck, ArrowRight, CheckCircle2, Clock, Banknote } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatRupee } from '../utils/pureLogic.ts';

export const CommunitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { communities, refreshCommunities } = useStore();

  useEffect(() => {
    refreshCommunities();

    const handleSync = () => {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 text-left">
      {/* Header & Breadcrumbs */}
      <div className="border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <Link to="/" className="hover:text-amber-400 transition-colors">Home</Link>
          <span>/</span>
          <span className="text-amber-300 font-medium">Eligible Communities</span>
        </div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
            Approved Gated Communities (Attapur)
          </h1>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/40">
            {communities.length} Societies
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
          To maintain strict compliance with explosives safety regulations and guarantee safe transit, KanakaDurga FireWorks delivers exclusively to resident flats in these registered communities.
        </p>
      </div>

      {/* Security Protocol Overview */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111A35] via-[#162248] to-[#111A35] border border-amber-500/25 p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
        <div className="space-y-1.5">
          <div className="font-semibold text-white flex items-center gap-2 text-sm">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Society Gate Protocol</span>
          </div>
          <p className="leading-relaxed">
            Our delivery partners present dispatch invoices at security gates. Customers are contacted by phone prior to entry.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="font-semibold text-white flex items-center gap-2 text-sm">
            <Banknote className="w-4 h-4 text-emerald-400" />
            <span>100% Cash on Delivery</span>
          </div>
          <p className="leading-relaxed">
            No advance online payments. Inspect packages with the delivery person and pay exact cash at your doorstep.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="font-semibold text-white flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Scheduled Delivery Batches</span>
          </div>
          <p className="leading-relaxed">
            Orders are batched by society to streamline security clearances during peak Diwali festive evenings.
          </p>
        </div>
      </div>

      {/* Communities Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {communities.map((comm) => (
          <div
            key={comm.id}
            className="rounded-2xl bg-[#111A35] border border-amber-500/20 p-6 flex flex-col justify-between space-y-4 shadow-xl hover:border-amber-400/50 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif font-bold text-lg text-white">{comm.name}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                  Active
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{comm.locality}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Minimum Order Value:</span>
                  <span className="font-mono text-white font-bold">{formatRupee(comm.minimumOrderAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Doorstep Delivery Charge:</span>
                  <span className="font-mono text-white font-bold">{formatRupee(comm.deliveryFee)}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-amber-300 font-semibold block mb-1.5 uppercase tracking-wider">
                  Permitted Blocks / Towers ({comm.allowedBlocks.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {comm.allowedBlocks.map((b, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-200"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/catalogue`)}
              className="w-full py-2.5 px-4 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Order Crackers for {comm.name.split(' ')[0]}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
