import type { StoreState } from './types.js';

const now = '2026-06-05T18:00:00.000Z';

export function seedDemoData(): StoreState {
  return {
    users: [
      { id: 'demo-user-ada', mode: 'DEMO', name: 'Ada Nwosu', email: 'ada@demo.memezo.ng', phone: '+2348010001001', status: 'ACTIVE', role: 'SUPER_ADMIN', kycStatus: 'APPROVED', createdAt: '2026-06-01T09:00:00.000Z', lastActiveAt: now, notes: [] },
      { id: 'demo-user-tobi', mode: 'DEMO', name: 'Tobi Adeyemi', email: 'tobi@demo.memezo.ng', phone: '+2348010001002', status: 'ACTIVE', role: 'USER', kycStatus: 'PENDING_REVIEW', createdAt: '2026-06-03T11:00:00.000Z', lastActiveAt: '2026-06-05T17:40:00.000Z', notes: ['Requested clearer address document.'] },
      { id: 'demo-user-zainab', mode: 'DEMO', name: 'Zainab Musa', email: 'zainab@demo.memezo.ng', phone: '+2348010001003', status: 'ACTIVE', role: 'USER', kycStatus: 'NOT_STARTED', createdAt: '2026-06-04T14:00:00.000Z', lastActiveAt: '2026-06-05T16:10:00.000Z', notes: [] },
      { id: 'live-user-empty', mode: 'LIVE', name: 'Live Preview User', email: 'live-preview@memezo.ng', phone: '+2348010001999', status: 'ACTIVE', role: 'USER', kycStatus: 'NOT_STARTED', createdAt: '2026-06-05T12:00:00.000Z', lastActiveAt: now, notes: [] }
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
      reference: 'MZ-DEMO-240601',
      createdAt: '2026-06-01T09:01:00.000Z',
      updatedAt: '2026-06-01T09:02:00.000Z'
    }],
    virtualAccounts: [{
      id: 'va-demo-ada',
      userId: 'demo-user-ada',
      mode: 'DEMO',
      provider: 'Demo payment rail',
      bankName: 'MemeZo Demo Bank',
      accountName: 'MemeZo / Ada Nwosu',
      accountNumber: '0001234567',
      reference: 'MZ-ADA-1001',
      status: 'ACTIVE',
      createdAt: '2026-06-01T09:00:00.000Z'
    }],
    aiPaymentDrafts: [],
    p2pOrders: [
      { id: 'p2p-demo-1', userId: 'demo-user-ada', mode: 'DEMO', exchange: 'Manual demo order', externalOrderId: 'BYB-3829104', sellerName: 'Chinedu O.', bankName: 'GTBank', accountNumber: '0123456789', accountName: 'Chinedu Okafor', amountMinor: '18500000', asset: 'USDT', assetQuantity: '116.40', riskFlags: [], status: 'PENDING', createdAt: '2026-06-05T17:55:00.000Z', updatedAt: '2026-06-05T17:55:00.000Z' },
      { id: 'p2p-demo-2', userId: 'demo-user-ada', mode: 'DEMO', exchange: 'Manual demo order', externalOrderId: 'BYB-3829077', sellerName: 'Mariam A.', bankName: 'Access Bank', accountNumber: '0234567890', accountName: 'Mariam Abdullahi', amountMinor: '4200000', asset: 'USDT', assetQuantity: '26.42', riskFlags: ['NEW_COUNTERPARTY'], status: 'REVIEW', createdAt: '2026-06-05T17:42:00.000Z', updatedAt: '2026-06-05T17:42:00.000Z' }
    ],
    billPayments: [],
    trades: [],
    positions: [],
    sessions: [],
    credentials: []
  };
}
