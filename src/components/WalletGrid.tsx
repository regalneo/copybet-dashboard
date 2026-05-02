'use client';

import { useEffect, useState } from 'react';

interface WalletData {
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

interface ApiResponse {
  wallets: WalletData[];
  updated: string;
}

function formatChips(value: string): string {
  const num = parseFloat(value);
  if (isNaN(num)) return '—';
  return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function AccuracyBadge({ value }: { value: number }) {
  const pct = (value * 100).toFixed(1);
  const color = value >= 0.52 ? 'text-green-400' : value >= 0.48 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`font-mono text-sm ${color}`}>{pct}%</span>;
}

function ResultRow({ result }: { result: WalletData['recentResults'][0] }) {
  const won = result.outcome === result.direction;
  return (
    <div className={`flex items-center gap-3 py-1.5 px-3 rounded ${result.won ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
      <span className={`text-xs font-bold w-8 ${result.won ? 'text-green-400' : 'text-red-400'}`}>
        {result.won ? '✅' : '❌'}
      </span>
      <span className="text-gray-300 text-xs w-20">{result.asset}</span>
      <span className={`text-xs font-mono w-8 ${result.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
        {result.direction?.toUpperCase()}
      </span>
      <span className="text-xs text-gray-500 w-12">{result.tickets?.toLocaleString()}t</span>
    </div>
  );
}

function WalletCard({ wallet }: { wallet: WalletData }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">{wallet.id}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{wallet.label}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white font-mono">
            {formatChips(wallet.balance)}
          </div>
          <div className="text-xs text-gray-400">chips</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-sm font-bold text-white">{wallet.correct + wallet.incorrect}</div>
          <div className="text-xs text-gray-400">total</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <AccuracyBadge value={wallet.accuracy} />
          <div className="text-xs text-gray-400">accuracy</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className={`text-sm font-bold ${parseFloat(wallet.excess || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {wallet.excess || '0'}
          </div>
          <div className="text-xs text-gray-400">excess</div>
        </div>
      </div>

      {/* Address */}
      <div className="text-xs text-gray-600 font-mono break-all">
        {wallet.address}
      </div>

      {/* Recent results */}
      <div>
        <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Recent (last 5)</div>
        <div className="flex flex-col gap-1">
          {wallet.recentResults.length > 0 ? (
            wallet.recentResults.map((r, i) => <ResultRow key={i} result={r} />)
          ) : (
            <div className="text-xs text-gray-600 text-center py-2">No recent results</div>
          )}
        </div>
      </div>

      {/* Target */}
      <div className="text-xs text-gray-600">
        <span className="text-gray-500">target: </span>
        <span className="font-mono">{wallet.target}</span>
      </div>
    </div>
  );
}

export default function WalletGrid() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchData = async () => {
    try {
      const res = await fetch('/api/wallets');
      const json: ApiResponse = await res.json();
      setData(json);
      setLastUpdate(json.updated);
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch', e);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading wallets...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-gray-500">
          {data?.wallets.length || 0} wallets · last update: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '—'}
        </div>
        <button
          onClick={fetchData}
          className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded px-3 py-1 transition-colors"
        >
          Refresh
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {data?.wallets.map((w) => (
          <WalletCard key={w.id} wallet={w} />
        ))}
      </div>
    </div>
  );
}