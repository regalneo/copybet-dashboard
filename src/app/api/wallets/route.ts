import { COORDINATOR, WALLETS } from '@/lib/constants';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function fetchWallet(wallet: (typeof WALLETS)[number]) {
  try {
    // Fetch agent stats + predictions concurrently
    const [statsRes, predRes] = await Promise.all([
      fetch(`${COORDINATOR}/api/v1/agents/${wallet.address}`, { cache: 'no-store' }),
      fetch(`${COORDINATOR}/api/v1/agents/${wallet.address}/predictions?limit=5`, { cache: 'no-store' }),
    ]);

    const [statsData, predData] = await Promise.all([statsRes.json(), predRes.json()]);

    const agent = statsData?.data;
    const predictions: any[] = predData?.data?.data || [];

    // Filter resolved predictions (not cancelled) for recent results
    const resolved = predictions
      .filter(p => p.outcome !== 'cancelled')
      .slice(0, 5);

    return {
      id: wallet.id,
      label: wallet.label,
      target: wallet.target,
      address: wallet.address,
      balance: agent?.today?.balance ?? agent?.stats?.net_chips ?? '0',
      excess: agent?.today?.excess ?? '0',
      accuracy: agent?.today?.accuracy ?? agent?.stats?.accuracy ?? 0,
      totalPredictions: agent?.stats?.total_submissions ?? 0,
      correct: agent?.stats?.correct ?? 0,
      incorrect: agent?.stats?.incorrect ?? 0,
      todaySubmissions: agent?.today?.submissions ?? 0,
      todayResolved: agent?.today?.resolved ?? 0,
      recentResults: resolved.map(p => ({
        asset: p.asset,
        direction: p.direction,
        outcome: p.outcome,
        won: p.outcome === 'correct',
        market_id: p.market_id,
        tickets: p.tickets ?? 0,
        chips: p.payout_chips ?? p.chips_spent ?? '0',
        submitted_at: p.submitted_at,
      })),
    };
  } catch (e) {
    return { id: wallet.id, label: wallet.label, target: wallet.target, address: wallet.address, error: String(e) };
  }
}

export async function GET() {
  const results = await Promise.all(WALLETS.map(fetchWallet));
  return NextResponse.json({ wallets: results, updated: new Date().toISOString() });
}