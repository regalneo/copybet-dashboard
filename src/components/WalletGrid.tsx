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

// ── Formatters ─────────────────────────────────────────────────────────────────
function fmt(v: string, decimals = 0): string {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
  return n.toFixed(decimals);
}

function short(v: string): string {
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}

function addr(a: string) { return `${a.slice(0, 6)}…${a.slice(-4)}`; }

function accColor(v: number) {
  if (v >= 0.52) return 'text-emerald-400';
  if (v >= 0.48) return 'text-yellow-400';
  return 'text-red-400';
}

// ── Stat pill ──────────────────────────────────────────────────────────────────
function Pill({ label, value, color = 'text-gray-200' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-800/60 rounded-lg px-2.5 py-1.5 flex flex-col items-center gap-0.5">
      <div className={`text-sm font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

// ── Wallet card ────────────────────────────────────────────────────────────────
function Card({ w }: { w: Wallet }) {
  const bal = fmt(w.balance);
  const won = w.recentResults?.filter(r => r.won) || [];
  const lost = w.recentResults?.filter(r => !r.won) || [];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">

      {/* Card header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between bg-gray-900">
        <div>
          <div className="text-sm font-semibold text-white">{w.id}</div>
          <div className="text-xs text-gray-500">{w.label}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-white tabular-nums">{bal}</div>
          <div className="text-xs text-gray-500">chips</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-4 py-3 grid grid-cols-3 gap-2">
        <Pill label="Accuracy" value={`${(w.accuracy * 100).toFixed(1)}%`} color={accColor(w.accuracy)} />
        <Pill label="W:L" value={`${w.correct}：${w.incorrect}`} />
        <Pill
          label="Excess"
          value={short(w.excess || '0')}
          color={parseFloat(w.excess || '0') >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
      </div>

      {/* Recent streak */}
      <div className="px-4 pb-2 flex gap-1 items-center">
        {w.recentResults.slice(0, 8).map((r, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-sm ${r.won ? 'bg-emerald-600' : 'bg-red-700'}`}
            title={`${r.asset} ${r.direction} → ${r.outcome}`}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 mt-auto border-t border-gray-800 flex items-center justify-between text-xs text-gray-600">
        <span className="font-mono">{addr(w.address)}</span>
        <span className="text-gray-700">→ {addr(w.target)}</span>
      </div>
    </div>
  );
}

// ── Summary row ────────────────────────────────────────────────────────────────
function Summary({ ws }: { ws: Wallet[] }) {
  const totalBal = ws.reduce((s, w) => s + parseFloat(w.balance || '0'), 0);
  const totC = ws.reduce((s, w) => s + (w.correct || 0), 0);
  const totI = ws.reduce((s, w) => s + (w.incorrect || 0), 0);
  const totEx = ws.reduce((s, w) => s + parseFloat(w.excess || '0'), 0);
  const wr = totC + totI > 0 ? `${((totC / (totC + totI)) * 100).toFixed(1)}%` : '—';

  const items = [
    { label: 'Total Chips', value: short(String(totalBal)), color: 'text-white' },
    { label: 'Win Rate', value: wr, color: parseFloat(String(totC / (totC + totI))) >= 0.5 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Total Excess', value: short(String(totEx)), color: totEx >= 0 ? 'text-emerald-400' : 'text-red-400' },
    { label: 'Wallets', value: String(ws.length), color: 'text-white' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {items.map(({ label, value, color }) => (
        <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex flex-col gap-1">
          <div className="text-xs text-gray-500">{label}</div>
          <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WalletGrid() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [updated, setUpdated] = useState('');
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const r = await fetch('/api/wallets');
      const json = await r.json();
      setWallets(json.wallets || []);
      setUpdated(json.updated || '');
    } catch { /* keep last state */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);
  useEffect(() => {
    const id = setInterval(fetch_, 30_000);
    return () => clearInterval(id);
  }, [fetch_]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3 text-gray-400">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-gray-500">
          {wallets.length} wallets · updated {updated ? new Date(updated).toLocaleTimeString() : '—'}
        </div>
        <button
          onClick={fetch_}
          className="text-xs text-gray-400 border border-gray-700 rounded-lg px-3 py-1.5 hover:bg-gray-800 transition-colors cursor-pointer"
        >
          ↻ Refresh
        </button>
      </div>
      <Summary ws={wallets} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {wallets.map(w => <Card key={w.id} w={w} />)}
      </div>
    </div>
  );
}