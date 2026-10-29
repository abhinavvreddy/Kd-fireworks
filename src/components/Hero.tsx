import React from 'react';
import { Sparkles, MapPin, ShieldCheck, Banknote, ArrowRight } from 'lucide-react';

interface HeroProps {
  onShopClick: () => void;
  onExploreDeals: () => void;
  activeCommunityCount: number;
}

export const Hero: React.FC<HeroProps> = ({
  onShopClick,
  onExploreDeals,
  activeCommunityCount,
}) => {
  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:py-20 border-b border-amber-500/15 bg-gradient-to-b from-[#0B132B] via-[#0F1A3A] to-[#0B132B]">
      {/* Ambient Festive Shimmer Elements */}
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

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-serif font-bold text-white tracking-tight leading-tight [text-wrap:balance]">
              Make This Diwali Shine with{' '}
              <span className="gold-gradient-text block sm:inline">KanakaDurga FireWorks</span>
            </h1>

            <div className="text-amber-400 font-telugu text-base sm:text-xl font-bold tracking-wide">
              “ఆనందానికి No Limits!”
            </div>

            <p className="text-slate-300 text-sm sm:text-lg leading-relaxed max-w-2xl">
              Authentic green and low-smoke fireworks crafted for joyful family celebrations. 
              Delivered safely directly to resident doorsteps in select approved gated communities across Attapur.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-2">
              <button
                onClick={onShopClick}
                className="w-full sm:w-auto px-6 py-3.5 rounded-lg text-sm font-semibold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 transition-all shadow-lg shadow-amber-950/60 flex items-center justify-center gap-2 group active:scale-95"
              >
                <span>Shop Crackers</span>
                <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onExploreDeals}
                className="w-full sm:w-auto px-6 py-3.5 rounded-lg text-sm font-semibold text-slate-200 bg-slate-900/80 border border-amber-500/30 hover:border-amber-400 hover:text-amber-300 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Explore Best Deals</span>
              </button>
            </div>

            {/* Trust Markers Bar */}
            <div className="pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded bg-amber-400/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <span className="font-semibold text-white block">Community Delivery</span>
                  <span className="text-slate-400">{activeCommunityCount} Attapur Townships</span>
                </div>
              </div>

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

          {/* Right Column: Festive Visual Showcase Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-2xl p-1 bg-gradient-to-b from-amber-500/30 via-slate-800 to-amber-500/10 shadow-2xl shadow-slate-950">
              <div className="relative rounded-xl overflow-hidden bg-[#111A35] p-6 text-left border border-slate-700/50">
                
                {/* Visual Header Graphic with Uploaded Logo */}
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

                {/* Community Restriction Notice Callout */}
                <div className="mt-5 p-3.5 rounded-lg bg-slate-900/90 border border-amber-500/30 text-xs space-y-1.5">
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    Resident Community Restriction Policy
                  </div>
                  <p className="text-slate-300 leading-normal">
                    To maintain strict safety and delivery logistics, orders are accepted exclusively for resident flats within registered societies in Attapur. Your block will be validated during checkout.
                  </p>
                </div>

                {/* Quick Highlights */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Payment</span>
                    <span className="font-bold text-amber-300">100% COD</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-900/50 border border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Location</span>
                    <span className="font-bold text-amber-300">Attapur, HYD</span>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
