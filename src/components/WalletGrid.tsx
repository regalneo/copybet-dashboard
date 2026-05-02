'use client';

import { useEffect, useState, useCallback } from 'react';

interface RecentResult {
  asset: string;
  direction: string;
  outcome: string;
  won: boolean;
  market_id: string;
  tickets: number;
  chips: string;
  submitted_at: string;
}

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
  recentResults: RecentResult[];
  error?: string;
}

// ── Formatters ─────────────────────────────────────────────────────────────────
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

function accBg(v: number) {
  if (v >= 0.52) return 'bg-emerald-900/40 border border-emerald-800';
  if (v >= 0.48) return 'bg-yellow-900/40 border border-yellow-800';
  return 'bg-red-900/40 border border-red-800';
}

// ── Mini stat cell (shown in collapsed header row) ─────────────────────────────
function StatCell({ label, value, color = 'text-gray-200' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <div className={`text-sm font-bold tabular-nums truncate ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 whitespace-nowrap">{label}</div>
    </div>
  );
}

// ── Chevron icon ───────────────────────────────────────────────────────────────
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ── Collapsed row ──────────────────────────────────────────────────────────────
function RowHeader({ w, open, onClick }: { w: Wallet; open: boolean; onClick: () => void }) {
  const balance = short(w.balance);
  const accPct = `${(w.accuracy * 100).toFixed(1)}%`;
  const wl = `${w.correct}–${w.incorrect}`;
  const today = `${w.todaySubmissions}/${w.todayResolved}`;
  const excessVal = short(w.excess || '0');
  const excessPos = parseFloat(w.excess || '0') >= 0;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3 flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800/60 transition-colors cursor-pointer ${open ? 'rounded-b-none border-b-0' : ''}`}
    >
      {/* Wallet identity */}
      <div className="flex flex-col min-w-0 w-28 flex-shrink-0">
        <div className="text-sm font-semibold text-white truncate">{w.id}</div>
        <div className="text-xs text-gray-500 truncate">{w.label}</div>
      </div>

      {/* Balance */}
      <div className="flex flex-col items-center w-24 flex-shrink-0">
        <div className="text-base font-bold text-white tabular-nums">{balance}</div>
        <div className="text-xs text-gray-500">chips</div>
      </div>

      {/* Accuracy */}
      <div className={`w-20 flex-shrink-0 rounded-lg px-2 py-1.5 flex flex-col items-center gap-0.5 ${accBg(w.accuracy)}`}>
        <div className={`text-sm font-bold tabular-nums ${accColor(w.accuracy)}`}>{accPct}</div>
        <div className="text-xs text-gray-500">accuracy</div>
      </div>

      {/* W:L */}
      <div className="w-16 flex-shrink-0 flex flex-col items-center gap-0.5">
        <div className="text-sm font-bold text-gray-200 tabular-nums">{wl}</div>
        <div className="text-xs text-gray-500">W:L</div>
      </div>

      {/* Today */}
      <div className="w-16 flex-shrink-0 flex flex-col items-center gap-0.5">
        <div className="text-sm font-bold text-gray-200 tabular-nums">{today}</div>
        <div className="text-xs text-gray-500">today</div>
      </div>

      {/* Excess */}
      <div className={`w-20 flex-shrink-0 flex flex-col items-center gap-0.5`}>
        <div className={`text-sm font-bold tabular-nums ${excessPos ? 'text-emerald-400' : 'text-red-400'}`}>
          {excessPos ? '+' : ''}{excessVal}
        </div>
        <div className="text-xs text-gray-500">excess</div>
      </div>

      {/* Streak dots */}
      <div className="flex gap-0.5 items-center flex-1 min-w-0">
        {w.recentResults.slice(0, 12).map((r, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-sm flex-shrink-0 ${r.won ? 'bg-emerald-600' : 'bg-red-700'}`}
            title={`${r.asset} ${r.direction} → ${r.outcome}`}
          />
        ))}
        {w.recentResults.length === 0 && <span className="text-xs text-gray-700">no data</span>}
      </div>

      {/* Chevron */}
      <Chevron open={open} />
    </button>
  );
}

// ── Expanded content ───────────────────────────────────────────────────────────
function RowDetail({ w }: { w: Wallet }) {
  return (
    <div className="border border-t-0 border-gray-800 rounded-b-xl bg-gray-900 px-4 pb-4 overflow-hidden">
      {/* Recent results */}
      <div className="mt-3">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Recent Results</div>
        {w.recentResults.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            {w.recentResults.slice(0, 10).map((r, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                {/* W/L badge */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${r.won ? 'bg-emerald-900 text-emerald-400' : 'bg-red-900 text-red-400'}`}>
                  {r.won ? 'W' : 'L'}
                </div>
                {/* Asset */}
                <div className="flex flex-col min-w-0 w-24 flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-200 truncate">{r.asset}</span>
                  <span className="text-xs text-gray-600 capitalize">{r.direction} · {r.outcome}</span>
                </div>
                {/* Tickets */}
                <div className="flex flex-col items-center w-16 flex-shrink-0">
                  <span className="text-sm font-bold text-gray-200 tabular-nums">{Number(r.tickets).toLocaleString()}</span>
                  <span className="text-xs text-gray-500">tickets</span>
                </div>
                {/* Chips */}
                <div className="flex flex-col items-center w-20 flex-shrink-0">
                  <span className={`text-sm font-bold tabular-nums ${parseFloat(r.chips || '0') >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {parseFloat(r.chips || '0') >= 0 ? '+' : ''}{short(r.chips || '0')}
                  </span>
                  <span className="text-xs text-gray-500">chips</span>
                </div>
                {/* Market ID */}
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs text-gray-600 font-mono truncate">{r.market_id}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-600 text-center py-4">No results yet</div>
        )}
      </div>

      {/* Footer info */}
      <div className="mt-4 pt-3 border-t border-gray-800 flex items-center gap-6 text-xs text-gray-600">
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-500">wallet</span>
          <span className="font-mono text-gray-400">{w.address}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-500">→ target</span>
          <span className="font-mono text-gray-400">{w.target}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-500">all-time</span>
          <span className="text-gray-400">{w.totalPredictions} predictions</span>
        </div>
        <div className="ml-auto text-gray-700">
          {w.recentResults.length} results shown
        </div>
      </div>
    </div>
  );
}

// ── Wallet row ─────────────────────────────────────────────────────────────────
function WalletRow({ w }: { w: Wallet }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <RowHeader w={w} open={open} onClick={() => setOpen(o => !o)} />
      {open && <RowDetail w={w} />}
    </div>
  );
}

// ── Summary ────────────────────────────────────────────────────────────────────
function Summary({ ws }: { ws: Wallet[] }) {
  const totalBal = ws.reduce((s, w) => s + parseFloat(w.balance || '0'), 0);
  const totC = ws.reduce((s, w) => s + (w.correct || 0), 0);
  const totI = ws.reduce((s, w) => s + (w.incorrect || 0), 0);
  const totEx = ws.reduce((s, w) => s + parseFloat(w.excess || '0'), 0);
  const wr = totC + totI > 0 ? totC / (totC + totI) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
      {[
        { label: 'Total Chips', value: short(String(totalBal)), color: 'text-white' },
        { label: 'Win Rate', value: `${(wr * 100).toFixed(1)}%`, color: wr >= 0.5 ? 'text-emerald-400' : 'text-red-400' },
        { label: 'Total Excess', value: short(String(totEx)), color: totEx >= 0 ? 'text-emerald-400' : 'text-red-400' },
        { label: 'Wallets', value: String(ws.length), color: 'text-white' },
        { label: 'Resolved Today', value: String(ws.reduce((s, w) => s + (w.todayResolved || 0), 0)), color: 'text-white' },
      ].map(({ label, value, color }) => (
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
    const id = setInterval(fetch_, 300_000);
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
      {/* Header bar */}
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

      {/* Column headers */}
      <div className="hidden md:flex items-center gap-4 px-4 mb-2 text-xs text-gray-600 font-medium uppercase tracking-wider">
        <div className="w-28 flex-shrink-0">wallet</div>
        <div className="w-24 flex-shrink-0 text-center">chips</div>
        <div className="w-20 flex-shrink-0 text-center">accuracy</div>
        <div className="w-16 flex-shrink-0 text-center">W:L</div>
        <div className="w-16 flex-shrink-0 text-center">today</div>
        <div className="w-20 flex-shrink-0 text-center">excess</div>
        <div className="flex-1">streak</div>
      </div>

      {/* Wallet rows */}
      <div className="flex flex-col gap-2">
        {wallets.map(w => <WalletRow key={w.id} w={w} />)}
      </div>
    </div>
  );
}