import { NextResponse } from 'next/server';

const COORDINATOR = 'https://api.agentpredict.work';

const WALLETS = [
  {
    id: 'burner-1',
    address: '0x7239853Ef7DEb1a00B3E2583e44b06B29949B756',
    pk: '0x800feb2069187b62da24ad032eddde70727081615e4310192623d1de077a7dd1',
    proxy: 'f543c2436c9d6196f3c8__cr.sg:f564fbfe1d17761c@gw.dataimpulse.com:10000',
    target: '0x8537bfbd08d4d37dd85228169b5d640d625b03a2',
    label: 'BNB Target',
  },
  {
    id: 'burner-4',
    address: '0x4b3993C0bd5d141419E9EF1164d61eEeaE7563C1',
    pk: '0x6dceb7e3fa790786fae5ce47cd1e30e258fb7ffc13029ac90f1bffb7a0b6bd6e',
    proxy: 'f543c2436c9d6196f3c8__cr.sg:f564fbfe1d17761c@gw.dataimpulse.com:10001',
    target: '0xcd0baeb4e8ea89338bebd1470e3e4fe636211cd8',
    label: 'SOL Target',
  },
  {
    id: 'burner-5',
    address: '0x52Be0b6e122faA2b6a07Cb1f526ef0540429ad2b',
    pk: '0x973883d982ff4a6f2b66a8b6f523fcac4a3d366457a5b0581a1d524270a6421b',
    proxy: 'f543c2436c9d6196f3c8__cr.sg:f564fbfe1d17761c@gw.dataimpulse.com:10002',
    target: '0x23b50576710f5d6fe522dc2d89ab5c3342a2ed43',
    label: 'ETH Target',
  },
  {
    id: 'burner-6',
    address: '0x630Ac8AeCa5E567040B76a6Ee83e49D71055bC9F',
    pk: '0x70a005de492132bb038856cb9059ff41d35a972b9a046c2d020eba90dbf53fb1',
    proxy: 'f543c2436c9d6196f3c8__cr.sg:f564fbfe1d17761c@gw.dataimpulse.com:10003',
    target: '0xd0b826c4c0f4f83ecc8560b811b818291f876a2e',
    label: 'BTC Target',
  },
  {
    id: 'burner-7',
    address: '0x6092F1BC5990159F69A70F21D08163B76e27F432',
    pk: '0x18e117300fb2a79a40d3f0e0953497b11f1b026a5cfcbbe93196f74c5871664b',
    proxy: 'f543c2436c9d6196f3c8__cr.sg:f564fbfe1d17761c@gw.dataimpulse.com:10004',
    target: '0x56786f28b1aaa0463db46d0fedb0c1c52e0bbb66',
    label: 'SOL Target',
  },
];

async function fetchWalletStatus(wallet: typeof WALLETS[0], token: string) {
  const res = await fetch(`${COORDINATOR}/api/v1/agents/${wallet.address}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET() {
  const results = await Promise.all(
    WALLETS.map(async (wallet) => {
      try {
        // Use public agent endpoint (no auth needed for read-only data)
        const res = await fetch(
          `${COORDINATOR}/api/v1/agents/${wallet.address}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return { id: wallet.id, label: wallet.label, target: wallet.target, error: res.status };

        const data = await res.json();
        const agent = data.data || data;

        return {
          id: wallet.id,
          label: wallet.label,
          target: wallet.target,
          address: wallet.address,
          balance: agent.stats?.net_chips || '0',
          excess: agent.today?.excess || '0',
          accuracy: agent.stats?.accuracy || 0,
          totalPredictions: agent.stats?.total_resolved || 0,
          correct: agent.stats?.correct || 0,
          incorrect: agent.stats?.incorrect || 0,
          todaySubmissions: agent.today?.submissions || 0,
          todayResolved: agent.today?.resolved || 0,
          recentResults: (agent.recent_results || []).slice(0, 5).map((r: {
            asset?: string;
            direction?: string;
            outcome?: string;
            won?: boolean;
            market_id?: string;
            tickets_filled?: number;
            chips_spent?: string;
          }) => ({
            asset: r.asset,
            direction: r.direction,
            outcome: r.outcome,
            won: r.won,
            market_id: r.market_id,
            tickets: r.tickets_filled,
            chips: r.chips_spent,
          })),
        };
      } catch (e) {
        return { id: wallet.id, label: wallet.label, target: wallet.target, error: String(e) };
      }
    })
  );

  return NextResponse.json({ wallets: results, updated: new Date().toISOString() });
}