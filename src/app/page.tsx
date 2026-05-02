'use client';

import WalletGrid from '@/components/WalletGrid';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-white">Copybet Monitor</h1>
          <p className="text-gray-400 mt-1">Live wallet tracking — auto-refreshes every 30s</p>
        </header>
        <WalletGrid />
      </div>
    </main>
  );
}