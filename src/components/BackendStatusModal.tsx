import React, { useState } from 'react';
import { X, Server, Database, CheckCircle2, AlertCircle, RefreshCw, Terminal, ExternalLink } from 'lucide-react';

interface BackendStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLiveBackend: boolean;
  currentUrl: string;
  onUpdateUrl: (url: string) => Promise<void>;
}

export const BackendStatusModal: React.FC<BackendStatusModalProps> = ({
  isOpen,
  onClose,
  isLiveBackend,
  currentUrl,
  onUpdateUrl,
}) => {
  if (!isOpen) return null;

  const [inputUrl, setInputUrl] = useState(currentUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    setTestResult(null);
    try {
      await onUpdateUrl(inputUrl);
      setTestResult('Saved and checked endpoint successfully.');
    } catch (err: any) {
      setTestResult('Could not reach Flask API at that address. Kept in simulation mode.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className="relative w-full max-w-2xl rounded-2xl bg-[#0F1833] border border-amber-500/30 shadow-2xl p-6 sm:p-8 text-left text-slate-100 space-y-5"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif font-bold text-white">
                Python Flask & MongoDB Atlas Architecture
              </h2>
              <span className="text-xs text-amber-300 font-mono">
                Attapur Local Business Full-Stack Stack
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            isLiveBackend
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
          }`}
        >
          {isLiveBackend ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <div className="font-bold text-sm">
              {isLiveBackend
                ? 'Connected to Live Python Flask REST API & MongoDB Atlas'
                : 'In-Browser Simulation Mode (Standalone AI Studio Preview)'}
            </div>
            <p className="leading-relaxed text-slate-300">
              {isLiveBackend
                ? `Communicating over HTTP with Flask backend at: ${currentUrl}`
                : 'The AI Studio container runs Node.js/Vite on port 3000. All customer cart rules, Attapur community validation, atomic stock deductions, and order status transitions are fully testable in this preview using the browser storage engine.'}
            </p>
          </div>
        </div>

        {/* URL Configuration Form */}
        <form onSubmit={handleTestAndSave} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3 text-xs">
          <label className="block text-slate-200 font-medium">
            Configurable External Flask API URL (or local <code className="font-mono text-amber-300">http://localhost:5000/api/v1</code>)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="http://localhost:5000/api/v1"
              className="flex-1 px-3 py-2 text-xs rounded-lg bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              disabled={testing}
              className="px-4 py-2 rounded-lg bg-amber-400 text-slate-950 font-bold hover:bg-amber-300 transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>Connect</span>
            </button>
          </div>
          {testResult && (
            <span className="text-[11px] text-amber-300 font-mono block">{testResult}</span>
          )}
        </form>

        {/* Terminal Run Guide */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-white">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>How to run the Python Flask Backend locally:</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto space-y-1">
            <div className="text-slate-500"># 1. Navigate to backend directory</div>
            <div className="text-amber-300">cd backend</div>
            <div className="text-slate-500"># 2. Create and activate Python virtual environment</div>
            <div className="text-amber-300">python3 -m venv venv && source venv/bin/activate</div>
            <div className="text-slate-500"># 3. Install dependencies from requirements.txt</div>
            <div className="text-amber-300">pip install -r requirements.txt</div>
            <div className="text-slate-500"># 4. Copy .env.example and add MongoDB URI</div>
            <div className="text-amber-300">cp .env.example .env</div>
            <div className="text-slate-500"># 5. Seed initial Attapur communities & demo crackers</div>
            <div className="text-amber-300">python seed.py</div>
            <div className="text-slate-500"># 6. Start the Flask server (port 5000)</div>
            <div className="text-amber-300">python app.py</div>
          </div>
        </div>

        {/* Free Tier Services Guide */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
          <div className="font-semibold text-amber-300 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-amber-400" />
            <span>Free-Tier Hosting & Persistence Architecture</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed text-[11px]">
            <li><strong>Database:</strong> MongoDB Atlas Free Tier (M0 Cluster) — 512MB free perpetual storage, TLS encryption, and replica set reliability.</li>
            <li><strong>Backend API:</strong> Free hosting on Render, Railway, or Fly.io (run <code className="font-mono text-amber-300">gunicorn app:app</code>).</li>
            <li><strong>Payment:</strong> 100% Cash on Delivery (COD) — Zero gateway transaction fees, zero bank setup costs.</li>
            <li><strong>Admin Console:</strong> Authenticate securely using the server administrator credentials configured in <code className="font-mono">backend/.env</code>.</li>
          </ul>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
