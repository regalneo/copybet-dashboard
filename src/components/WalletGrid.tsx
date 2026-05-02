'use client';

import { useEffect, useState, useCallback } from 'react';

interface Wallet {
  id: string;
  label: string;
  target: string;
  address: string;
  balance: string;
  excess: string;
  accuracy: number;
  totalPredictions: number;
  correct: number;
  incorrect: number;
  todaySubmissions: number;
  todayResolved: number;
  recentResults: {
    asset: string;
    direction: string;
    outcome: string;
    won: boolean;
    market_id: string;
    tickets: number;
    chips: string;
  }[];
  error?: string | number;
}

function fmtChips(v: string): string {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtAddr(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function AccColor({ v }: { v: number }) {
  if (v >= 0.52) return 'text-emerald-400';
  if (v >= 0.48) return 'text-yellow-400';
  return 'text-red-400';
}

// ── Single wallet card ──────────────────────────────────────────────────────────
function WalletCard({ w }: { w: Wallet }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-4 hover:border-gray-700 transition-colors">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">{w.id}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{w.label}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white tabular-nums">{fmtChips(w.balance)}</div>
          <div className="text-xs text-gray-500">chips</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Accuracy', value: pct(w.accuracy), color: <AccColor v={w.accuracy} /> },
          { label: 'W:L', value: `${w.correct}：${w.incorrect}`, color: 'text-gray-200' },
          { label: 'Excess', value: fmtChips(w.excess || '0'), color: parseFloat(w.excess || '0') >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-800 rounded-xl px-3 py-2.5 text-center">
            <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Recent predictions */}
      <div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Recent</div>
        <div className="flex flex-col gap-1">
          {w.recentResults.length > 0 ? w.recentResults.slice(0, 4).map((r, i) => (
            <div key={i} className={`flex items-center gap-2.5 py-1.5 px-3 rounded-lg ${r.won ? 'bg-emerald-900/20' : 'bg-red-900/20'}`}>
              <span className="text-xs font-bold w-6">{r.won ? '✅' : '❌'}</span>
              <span className="text-xs text-gray-300 w-20">{r.asset}</span>
              <span className={`text-xs font-mono font-bold w-7 ${r.direction === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
                {r.direction?.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500 ml-auto">{r.tickets?.toLocaleString()}t</span>
            </div>
          )) : (
            <div className="text-xs text-gray-600 text-center py-2">No recent results</div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-600 pt-1 border-t border-gray-800">
        <span className="font-mono">{fmtAddr(w.address)}</span>
        <span className="text-gray-600">→ {fmtAddr(w.target)}</span>
      </div>
    </div>
  );
}

// ── Summary bar ─────────────────────────────────────────────────────────────────
function SummaryBar({ wallets }: { wallets: Wallet[] }) {
  const totalBal = wallets.reduce((s, w) => s + parseFloat(w.balance || '0'), 0);
  const totalCorrect = wallets.reduce((s, w) => s + (w.correct || 0), 0);
  const totalIncorrect = wallets.reduce((s, w) => s + (w.incorrect || 0), 0);
  const totalExcess = wallets.reduce((s, w) => s + parseFloat(w.excess || '0'), 0);
  const avgAcc = wallets.length > 0 ? wallets.reduce((s, w) => s + (w.accuracy || 0), 0) / wallets.length : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[
        { label: 'Total Chips', value: fmtChips(String(totalBal)), accent: 'text-white' },
        { label: 'Win Rate', value: totalCorrect + totalIncorrect > 0 ? pct(totalCorrect / (totalCorrect + totalIncorrect)) : '—', accent: totalCorrect / (totalCorrect + totalIncorrect) >= 0.5 ? 'text-emerald-400' : 'text-red-400' },
        { label: 'Avg Accuracy', value: pct(avgAcc), accent: 'text-white' },
        { label: 'Total Excess', value: fmtChips(String(totalExcess)), accent: totalExcess >= 0 ? 'text-emerald-400' : 'text-red-400' },
      ].map(({ label, value, accent }) => (
        <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-xs text-gray-500">{label}</div>
          <div className={`text-xl font-bold tabular-nums ${accent}`}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main grid ──────────────────────────────────────────────────────────────────
export default function WalletGrid() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [updated, setUpdated] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch('/api/wallets');
      const json = await r.json();
      setWallets(json.wallets || []);
      setUpdated(json.updated || '');
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    const id = setInterval(fetch_, 30_000);
    return () => clearInterval(id);
  }, [fetch_]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
        <span className="text-sm">Loading wallets...</span>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="text-sm text-gray-500">
          {wallets.length} wallets · updated {updated ? new Date(updated).toLocaleTimeString() : '—'}
        </div>
        <button
          onClick={fetch_}
          className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-800 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>
      <SummaryBar wallets={wallets} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {wallets.map((w) => <WalletCard key={w.id} w={w} />)}
      </div>
    </div>
  );
}