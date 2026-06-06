import type { StoreState } from './types.js';

const now = '2026-06-05T18:00:00.000Z';

export function seedDemoData(): StoreState {
  return {
    users: [
      { id: 'demo-user-ada', mode: 'DEMO', name: 'Ada Nwosu', email: 'ada@demo.nairameme.ng', phone: '+2348010001001', status: 'ACTIVE', role: 'SUPER_ADMIN', kycStatus: 'APPROVED', createdAt: '2026-06-01T09:00:00.000Z', lastActiveAt: now, notes: [] },
      { id: 'demo-user-tobi', mode: 'DEMO', name: 'Tobi Adeyemi', email: 'tobi@demo.nairameme.ng', phone: '+2348010001002', status: 'ACTIVE', role: 'USER', kycStatus: 'PENDING_REVIEW', createdAt: '2026-06-03T11:00:00.000Z', lastActiveAt: '2026-06-05T17:40:00.000Z', notes: ['Requested clearer address document.'] },
      { id: 'demo-user-zainab', mode: 'DEMO', name: 'Zainab Musa', email: 'zainab@demo.nairameme.ng', phone: '+2348010001003', status: 'ACTIVE', role: 'USER', kycStatus: 'NOT_STARTED', createdAt: '2026-06-04T14:00:00.000Z', lastActiveAt: '2026-06-05T16:10:00.000Z', notes: [] },
      { id: 'live-user-empty', mode: 'LIVE', name: 'Live Preview User', email: 'live-preview@nairameme.ng', phone: '+2348010001999', status: 'ACTIVE', role: 'USER', kycStatus: 'NOT_STARTED', createdAt: '2026-06-05T12:00:00.000Z', lastActiveAt: now, notes: [] }
    ],
    wallets: [
      ...['NGN', 'USDT', 'USDC', 'SOL', 'ETH', 'BTC'].map((asset) => ({ id: `demo-user-ada-${asset.toLowerCase()}`, userId: 'demo-user-ada', mode: 'DEMO' as const, asset, label: `${asset} Wallet` })),
      ...['NGN', 'USDT', 'USDC', 'SOL', 'ETH', 'BTC'].map((asset) => ({ id: `live-user-empty-${asset.toLowerCase()}`, userId: 'live-user-empty', mode: 'LIVE' as const, asset, label: `${asset} Wallet` })),
      { id: 'platform-demo-funding-ngn', userId: 'platform-demo', mode: 'DEMO', asset: 'NGN', label: 'Demo Funding Reserve' }
    ],
    ledgerTransactions: [{
      id: 'ledger-demo-opening-ada',
      mode: 'DEMO',
      idempotencyKey: 'seed-credit-demo-user-ada',
      description: 'Demo opening balance',
      createdAt: '2026-06-01T09:01:00.000Z',
      entries: [
        { accountId: 'platform-demo-funding-ngn', side: 'DEBIT', amountMinor: '50000000' },
        { accountId: 'demo-user-ada-ngn', side: 'CREDIT', amountMinor: '50000000' }
      ]
    }],
    kycCases: [{ id: 'kyc-demo-tobi', userId: 'demo-user-tobi', mode: 'DEMO', status: 'PENDING_REVIEW', provider: 'dojah', submittedAt: '2026-06-05T13:10:00.000Z' }],
    providers: [],
    auditEvents: [],
    tokens: [
      { id: 'token-naijafrog', mode: 'DEMO', name: 'Naija Frog', symbol: 'NFROG', mint: '8gV4dWgLwrmZ9hG9w1R9VYkSgu8kL67hJkPUMP001', priceNgn: '0.0042', marketCapNgn: '38400000', liquidityNgn: '8200000', volume24hNgn: '12900000', holders: 1842, runnerScore: 91, riskScore: 28, change24h: 146.2, source: 'Demo market simulator', observedAt: now },
      { id: 'token-sabi', mode: 'DEMO', name: 'Sabi Cat', symbol: 'SABI', mint: '6qTjN9d3kJr22LPp4ZdM8VtWLn8qPUMP002', priceNgn: '0.018', marketCapNgn: '71200000', liquidityNgn: '14600000', volume24hNgn: '22100000', holders: 3015, runnerScore: 84, riskScore: 36, change24h: 72.4, source: 'Demo market simulator', observedAt: '2026-06-05T17:58:00.000Z' },
      { id: 'token-jollof', mode: 'DEMO', name: 'Jollof Wars', symbol: 'JOLLOF', mint: '4mHg2PTd7yL5nXwR3fC9sKqVaPUMP003', priceNgn: '0.00081', marketCapNgn: '11900000', liquidityNgn: '2200000', volume24hNgn: '6400000', holders: 723, runnerScore: 72, riskScore: 61, change24h: 31.6, source: 'Demo market simulator', observedAt: '2026-06-05T17:54:00.000Z' }
    ],
    bounties: [
      { id: 'bounty-video-1', mode: 'DEMO', title: 'Create the best Naija Frog launch video', sponsor: 'Naija Frog Community', rewardNgn: '250000', category: 'Video', deadline: '2026-06-12T23:59:59.000Z', status: 'OPEN' },
      { id: 'bounty-research-1', mode: 'DEMO', title: 'Map the fastest-growing Nigerian meme communities', sponsor: 'NairaMeme Research', rewardNgn: '150000', category: 'Research', deadline: '2026-06-15T23:59:59.000Z', status: 'OPEN' }
    ],
    alerts: [
      { id: 'alert-runner-1', mode: 'DEMO', title: 'Runner score jumped to 91', body: 'Naija Frog gained 428 holders in 12 minutes while liquidity remained healthy.', severity: 'OPPORTUNITY', createdAt: now },
      { id: 'alert-risk-1', mode: 'DEMO', title: 'Risk increased on Jollof Wars', body: 'Wallet concentration rose above the balanced preset threshold.', severity: 'WARNING', createdAt: '2026-06-05T17:50:00.000Z' }
    ],
    moneyRequests: [{
      id: 'deposit-demo-opening-ada',
      mode: 'DEMO',
      userId: 'demo-user-ada',
      type: 'DEPOSIT',
      amountMinor: '50000000',
      feeMinor: '0',
      status: 'CONFIRMED',
      provider: 'Demo Bank Rail',
      reference: 'NM-DEMO-240601',
      createdAt: '2026-06-01T09:01:00.000Z',
      updatedAt: '2026-06-01T09:02:00.000Z'
    }],
    trades: [],
    positions: [],
    sessions: [],
    credentials: []
  };
}
