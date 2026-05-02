'use client';

import WalletGrid from '@/components/WalletGrid';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Copybet Monitor</h1>
          <p className="text-sm text-gray-500 mt-1">Live wallet tracking · auto-refreshes every 30s</p>
        </header>
        <WalletGrid />
      </div>
    </main>
  );
}