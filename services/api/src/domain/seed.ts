import type { StoreState } from './types.js';

const now = '2026-06-05T18:00:00.000Z';

export function seedDemoData(): StoreState {
  return {
    users: [
      { id: 'demo-user-ada', mode: 'DEMO', handle: '@ada', name: 'Ada Nwosu', email: 'ada@demo.memezo.ng', phone: '+2348010001001', status: 'ACTIVE', role: 'SUPER_ADMIN', kycStatus: 'APPROVED', createdAt: '2026-06-01T09:00:00.000Z', lastActiveAt: now, notes: [] },
      { id: 'demo-user-tobi', mode: 'DEMO', handle: '@tobi', name: 'Tobi Adeyemi', email: 'tobi@demo.memezo.ng', phone: '+2348010001002', status: 'ACTIVE', role: 'USER', kycStatus: 'APPROVED', createdAt: '2026-06-03T11:00:00.000Z', lastActiveAt: '2026-06-05T17:40:00.000Z', notes: [] },
      { id: 'demo-user-zainab', mode: 'DEMO', handle: '@zainab', name: 'Zainab Musa', email: 'zainab@demo.memezo.ng', phone: '+2348010001003', status: 'ACTIVE', role: 'USER', kycStatus: 'APPROVED', createdAt: '2026-06-04T14:00:00.000Z', lastActiveAt: '2026-06-05T16:10:00.000Z', notes: [] },
      { id: 'live-user-empty', mode: 'LIVE', name: 'Live Preview User', email: 'live-preview@memezo.ng', phone: '+2348010001999', status: 'ACTIVE', role: 'USER', kycStatus: 'NOT_STARTED', createdAt: '2026-06-05T12:00:00.000Z', lastActiveAt: now, notes: [] }
    ],
    wallets: [
      ...['NGN', 'USDT', 'USDC', 'SOL', 'ETH', 'BTC'].map((asset) => ({ id: `demo-user-ada-${asset.toLowerCase()}`, userId: 'demo-user-ada', mode: 'DEMO' as const, asset, label: `${asset} Wallet` })),
      { id: 'demo-user-tobi-ngn', userId: 'demo-user-tobi', mode: 'DEMO', asset: 'NGN', label: 'NGN Wallet' },
      { id: 'demo-user-zainab-ngn', userId: 'demo-user-zainab', mode: 'DEMO', asset: 'NGN', label: 'NGN Wallet' },
      ...['NGN', 'USDT', 'USDC', 'SOL', 'ETH', 'BTC'].map((asset) => ({ id: `live-user-empty-${asset.toLowerCase()}`, userId: 'live-user-empty', mode: 'LIVE' as const, asset, label: `${asset} Wallet` })),
      ...['NGN', 'USDT', 'USDC', 'SOL', 'ETH', 'BTC'].map((asset) => ({ id: `platform-demo-funding-${asset.toLowerCase()}`, userId: 'platform-demo', mode: 'DEMO' as const, asset, label: `Demo ${asset} Reserve` }))
    ],
    ledgerTransactions: [
      {
        id: 'ledger-demo-opening-ada',
        mode: 'DEMO',
        idempotencyKey: 'seed-credit-demo-user-ada',
        description: 'Demo opening balance',
        createdAt: '2026-06-01T09:01:00.000Z',
        entries: [
          { accountId: 'platform-demo-funding-ngn', side: 'DEBIT', amountMinor: '50000000' },
          { accountId: 'demo-user-ada-ngn', side: 'CREDIT', amountMinor: '50000000' }
        ]
      },
      ...[
        ['USDT', '86420000'],
        ['USDC', '12800000'],
        ['BTC', '720'],
        ['ETH', '31000'],
        ['SOL', '128000']
      ].map(([asset, amountMinor]) => ({
        id: `ledger-demo-opening-ada-${asset.toLowerCase()}`,
        mode: 'DEMO' as const,
        idempotencyKey: `seed-credit-demo-user-ada-${asset.toLowerCase()}`,
        description: `Demo ${asset} opening balance`,
        createdAt: '2026-06-01T09:01:00.000Z',
        entries: [
          { accountId: `platform-demo-funding-${asset.toLowerCase()}`, side: 'DEBIT' as const, amountMinor },
          { accountId: `demo-user-ada-${asset.toLowerCase()}`, side: 'CREDIT' as const, amountMinor }
        ]
      }))
    ],
    kycCases: [{ id: 'kyc-demo-tobi', userId: 'demo-user-tobi', mode: 'DEMO', status: 'PENDING_REVIEW', provider: 'dojah', submittedAt: '2026-06-05T13:10:00.000Z' }],
    providers: [],
    auditEvents: [],
    tokens: [
      { id: 'token-base-pepe', mode: 'DEMO', name: 'Based Pepe', symbol: 'BPEPE', mint: '0x4200000000000000000000000000000000000006', priceNgn: '0.0042', marketCapNgn: '148400000', liquidityNgn: '42200000', volume24hNgn: '91800000', holders: 6842, runnerScore: 89, riskScore: 31, change24h: 64.2, source: 'DEX Screener Demo', sourceMode: 'DEX', chain: 'BASE', dex: 'Uniswap', pairAddress: '0xDEMOBASEPAIR', ageMinutes: 540, buyPressurePercent: 68, contractWarnings: [], observedAt: now },
      { id: 'token-eth-pepe', mode: 'DEMO', name: 'Pepe', symbol: 'PEPE', mint: '0x6982508145454ce325ddbe47a25d4ec3d2311933', priceNgn: '0.018', marketCapNgn: '9700000000000', liquidityNgn: '288600000000', volume24hNgn: '516200000000', holders: 415000, runnerScore: 84, riskScore: 22, change24h: 12.4, source: 'DEX Screener Demo', sourceMode: 'DEX', chain: 'ETHEREUM', dex: 'Uniswap', pairAddress: '0xDEMOETHPAIR', ageMinutes: 1_576_800, buyPressurePercent: 57, contractWarnings: [], observedAt: '2026-06-05T17:58:00.000Z' },
      { id: 'token-sol-bonk', mode: 'DEMO', name: 'Bonk', symbol: 'BONK', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6C4H8NGADv2pPUMP', priceNgn: '0.00081', marketCapNgn: '3200000000000', liquidityNgn: '71400000000', volume24hNgn: '164900000000', holders: 887000, runnerScore: 82, riskScore: 26, change24h: 18.6, source: 'DEX Screener Demo', sourceMode: 'DEX', chain: 'SOLANA', dex: 'Raydium', pairAddress: 'DemoRaydiumPair', ageMinutes: 1_576_800, buyPressurePercent: 61, contractWarnings: [], observedAt: '2026-06-05T17:56:00.000Z' },
      { id: 'token-early-solana', mode: 'DEMO', name: 'No Dulling', symbol: 'DULL', mint: '9NaijaDemoLaunch7xHighRiskPUMP004', priceNgn: '0.0067', marketCapNgn: '24700000', liquidityNgn: '5800000', volume24hNgn: '18300000', holders: 1129, runnerScore: 78, riskScore: 67, change24h: 44.8, source: 'Pump.fun Demo Stream', sourceMode: 'EARLY_SOLANA', chain: 'SOLANA', dex: 'Pump.fun', ageMinutes: 18, buyPressurePercent: 73, contractWarnings: ['EARLY_LAUNCH', 'CREATOR_UNVERIFIED'], observedAt: '2026-06-05T17:54:00.000Z' },
      { id: 'token-bnb-dog', mode: 'DEMO', name: '1inch Dog', symbol: '1DOG', mint: '0x111111111117dc0aa78b770fa6a738034120c302', priceNgn: '0.00042', marketCapNgn: '87300000', liquidityNgn: '12100000', volume24hNgn: '34800000', holders: 2931, runnerScore: 74, riskScore: 44, change24h: 21.7, source: 'DEX Screener Demo', sourceMode: 'DEX', chain: 'BNB_CHAIN', dex: 'PancakeSwap', pairAddress: '0xDEMOBNBPAIR', ageMinutes: 2880, buyPressurePercent: 59, contractWarnings: ['TOP_HOLDERS_28_PERCENT'], observedAt: '2026-06-05T17:52:00.000Z' }
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
    internalTransfers: [],
    p2pOrders: [
      { id: 'p2p-demo-1', userId: 'demo-user-ada', mode: 'DEMO', exchange: 'Manual demo order', externalOrderId: 'BYB-3829104', sellerName: 'Chinedu O.', bankName: 'GTBank', accountNumber: '0123456789', accountName: 'Chinedu Okafor', amountMinor: '18500000', asset: 'USDT', assetQuantity: '116.40', riskFlags: [], status: 'PENDING', createdAt: '2026-06-05T17:55:00.000Z', updatedAt: '2026-06-05T17:55:00.000Z' },
      { id: 'p2p-demo-2', userId: 'demo-user-ada', mode: 'DEMO', exchange: 'Manual demo order', externalOrderId: 'BYB-3829077', sellerName: 'Mariam A.', bankName: 'Access Bank', accountNumber: '0234567890', accountName: 'Mariam Abdullahi', amountMinor: '4200000', asset: 'USDT', assetQuantity: '26.42', riskFlags: ['NEW_COUNTERPARTY'], status: 'REVIEW', createdAt: '2026-06-05T17:42:00.000Z', updatedAt: '2026-06-05T17:42:00.000Z' }
    ],
    billPayments: [],
    whatsappConnections: [],
    whatsappMessages: [],
    whatsappWebhookEvents: [],
    whatsappCommandLogs: [],
    whatsappApprovalSessions: [],
    whatsappAutomationSettings: [{
      id: 'wa-settings-demo-ada',
      userId: 'demo-user-ada',
      mode: 'DEMO',
      paymentsEnabled: true,
      p2pAlertsEnabled: true,
      p2pAutoPayPaused: false,
      perTransactionLimitMinor: '10000000',
      requireInAppAboveMinor: '10000000',
      dailyLimitMinor: '25000000',
      trustedRecipients: ['0123456789'],
      updatedAt: now
    }],
    whatsappTemplates: [
      { id: 'wa-template-security', mode: 'DEMO', name: 'security_alert', category: 'UTILITY', language: 'en', status: 'APPROVED', body: 'MemeZo security alert: {{1}}', createdAt: now },
      { id: 'wa-template-p2p', mode: 'DEMO', name: 'p2p_order_alert', category: 'UTILITY', language: 'en', status: 'APPROVED', body: 'New P2P order {{1}} requires attention.', createdAt: now }
    ],
    trades: [],
    positions: [],
    sessions: [],
    credentials: []
  };
}
