import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MapPin, ShieldAlert } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer id="safety-section" className="bg-[#070D1E] border-t border-amber-500/15 text-slate-400 text-xs mt-20">
      {/* Safety Notice Banner */}
      <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/60 border-b border-amber-500/10 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white font-serif font-bold text-sm">
                Diwali Safety & PESO Compliance Guidelines
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                Always celebrate in open designated community grounds under adult supervision. Keep buckets of water and sand ready. Never light fireworks indoors or near parked vehicles.
              </p>
            </div>
          </div>
          <div className="shrink-0 text-[11px] font-mono text-amber-300/80 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            Age 18+ Supervision Required
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Brand & Location */}
          <div className="space-y-3 text-left">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-md overflow-hidden border border-amber-400/50 bg-slate-950 shrink-0">
                <img
                  src="/assets/aistudio/image_9c781e1e.png"
                  alt="KanakaDurga FireWorks Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-base font-serif font-bold text-white uppercase tracking-wider gold-gradient-text block">
                  KanakaDurga FireWorks
                </span>
                <span className="text-[11px] text-amber-400 font-medium block font-telugu">
                  ఆనందానికి No Limits!
                </span>
              </div>
            </Link>
            <p className="text-slate-300 text-xs leading-relaxed">
              Curated festive celebration crackers delivering strictly to verified gated communities around Attapur, Hyderabad.
            </p>
            <div className="flex items-start gap-2 text-slate-300 text-[11px] pt-1">
              <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Near Janapriya Utopia - Block 1, Hyderguda, Upperpally, Hyderabad, Telangana, India.
              </span>
            </div>
          </div>

          {/* Quick Pages Navigation */}
          <div className="space-y-2 text-left">
            <h3 className="text-white font-serif font-bold text-xs uppercase tracking-wider text-amber-300">
              Explore Store
            </h3>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <Link to="/catalogue" className="hover:text-amber-300 transition-colors">
                  • Festive Catalogue
                </Link>
              </li>
              <li>
                <Link to="/communities" className="hover:text-amber-300 transition-colors">
                  • Approved Gated Societies
                </Link>
              </li>
              <li>
                <Link to="/cart" className="hover:text-amber-300 transition-colors">
                  • Review Shopping Bag
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-amber-300 transition-colors">
                  • Track Existing Orders
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-amber-300 transition-colors">
                  • Resident Account & Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Safety Policies */}
          <div className="space-y-2 text-left">
            <h3 className="text-white font-serif font-bold text-xs uppercase tracking-wider text-amber-300">
              Safety & Regulations
            </h3>
            <ul className="space-y-1.5 text-[11px]">
              <li>• Only green / low-smoke crackers stocked</li>
              <li>• Final sale: No returns on fireworks once received</li>
              <li>• Inspect packages with delivery agent upon COD</li>
              <li>• Compliant with Indian Explosives Act</li>
              <li>• Strict prohibition of sale to minors</li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div>
            © 2026 KanakaDurga FireWorks (Attapur, Hyderabad). All Rights Reserved.
          </div>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center sm:justify-end">
            <span>Cash on Delivery Only</span>
            <span>·</span>
            <span>Community-Restricted Service</span>
            <span>·</span>
            <span>Telangana, India</span>
            <span>·</span>
            <Link to="/admin" className="text-slate-500 hover:text-amber-400/80 transition-colors">
              Staff Portal
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
