export type DemoAsset = {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  change: number;
  color: string;
  networks: string[];
};

export const demoAssets: DemoAsset[] = [
  { symbol: 'NGN', name: 'Nigerian Naira', balance: 318450, value: 318450, change: 0, color: '#25D995', networks: ['MemeZo Balance'] },
  { symbol: 'USDT', name: 'Tether', balance: 86.42, value: 135679, change: 0.02, color: '#26A17B', networks: ['Ethereum', 'Tron', 'BNB Chain', 'Solana', 'Polygon', 'Arbitrum'] },
  { symbol: 'USDC', name: 'USD Coin', balance: 12.8, value: 20102, change: 0.01, color: '#2775CA', networks: ['Ethereum', 'Base', 'Solana', 'Polygon', 'Arbitrum'] },
  { symbol: 'BTC', name: 'Bitcoin', balance: 0.00072, value: 78540, change: 2.31, color: '#F7931A', networks: ['Bitcoin'] },
  { symbol: 'ETH', name: 'Ethereum', balance: 0.031, value: 19180, change: -0.84, color: '#7188FF', networks: ['Ethereum', 'Base', 'Arbitrum', 'Optimism'] },
  { symbol: 'SOL', name: 'Solana', balance: 0.128, value: 31540, change: 4.82, color: '#A989FF', networks: ['Solana'] },
  { symbol: 'BNB', name: 'BNB', balance: 0.084, value: 8360, change: 1.46, color: '#F3BA2F', networks: ['BNB Chain'] },
  { symbol: 'TRX', name: 'TRON', balance: 82.4, value: 18940, change: 0.63, color: '#FF4B55', networks: ['Tron'] },
  { symbol: 'XRP', name: 'XRP', balance: 0, value: 0, change: 1.18, color: '#8AA4B7', networks: ['XRP Ledger'] },
  { symbol: 'DOGE', name: 'Dogecoin', balance: 0, value: 0, change: 2.76, color: '#C3A634', networks: ['Dogecoin'] },
  { symbol: 'POL', name: 'Polygon', balance: 42.8, value: 15540, change: 3.02, color: '#8247E5', networks: ['Polygon'] },
  { symbol: 'TON', name: 'Toncoin', balance: 3.18, value: 11920, change: -1.12, color: '#0098EA', networks: ['TON'] }
];

export const supportedNetworks = [
  { name: 'Bitcoin', symbol: 'BTC', color: '#F7931A' },
  { name: 'Ethereum', symbol: 'ETH', color: '#7188FF' },
  { name: 'BNB Chain', symbol: 'BNB', color: '#F3BA2F' },
  { name: 'Tron', symbol: 'TRX', color: '#FF4B55' },
  { name: 'Solana', symbol: 'SOL', color: '#A989FF' },
  { name: 'Polygon', symbol: 'POL', color: '#8247E5' },
  { name: 'Base', symbol: 'BASE', color: '#4C78FF' },
  { name: 'Arbitrum', symbol: 'ARB', color: '#57A8E5' },
  { name: 'Optimism', symbol: 'OP', color: '#FF4B55' },
  { name: 'XRP Ledger', symbol: 'XRP', color: '#8AA4B7' },
  { name: 'Dogecoin', symbol: 'DOGE', color: '#C3A634' }
];

export const demoTokens = [
  { mint: '0x4200000000000000000000000000000000000006', name: 'Based Pepe', symbol: 'BPEPE', score: 89, risk: 31, change: 64.2, price: 0.0042, marketCap: '₦148.4M', liquidity: '₦42.2M', volume: '₦91.8M', holders: 6842, color: '#25D995', chain: 'Base', source: 'DEX Screener', sourceMode: 'DEX', age: '9h', buyPressure: 68, warnings: [] },
  { mint: '0x6982508145454ce325ddbe47a25d4ec3d2311933', name: 'Pepe', symbol: 'PEPE', score: 84, risk: 22, change: 12.4, price: 0.018, marketCap: '₦9.7T', liquidity: '₦288.6B', volume: '₦516.2B', holders: 415000, color: '#58C7E8', chain: 'Ethereum', source: 'DEX Screener', sourceMode: 'DEX', age: '3y', buyPressure: 57, warnings: [] },
  { mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6C4H8NGADv2pPUMP', name: 'Bonk', symbol: 'BONK', score: 82, risk: 26, change: 18.6, price: 0.00081, marketCap: '₦3.2T', liquidity: '₦71.4B', volume: '₦164.9B', holders: 887000, color: '#FF9B67', chain: 'Solana', source: 'DEX Screener', sourceMode: 'DEX', age: '3y', buyPressure: 61, warnings: [] },
  { mint: '9NaijaDemoLaunch7xHighRiskPUMP004', name: 'No Dulling', symbol: 'DULL', score: 78, risk: 67, change: 44.8, price: 0.0067, marketCap: '₦24.7M', liquidity: '₦5.8M', volume: '₦18.3M', holders: 1129, color: '#B49AFF', chain: 'Solana', source: 'Pump.fun Demo Stream', sourceMode: 'EARLY_SOLANA', age: '18m', buyPressure: 73, warnings: ['Early launch', 'Creator wallet unverified'] },
  { mint: '0x111111111117dc0aa78b770fa6a738034120c302', name: '1inch Dog', symbol: '1DOG', score: 74, risk: 44, change: 21.7, price: 0.00042, marketCap: '₦87.3M', liquidity: '₦12.1M', volume: '₦34.8M', holders: 2931, color: '#6A9BFF', chain: 'BNB Chain', source: 'DEX Screener', sourceMode: 'DEX', age: '2d', buyPressure: 59, warnings: ['Top holders 28%'] }
];

export const demoTransactions = [
  { id: 'MZ-240611-0091', title: 'Salary received', detail: 'Brightline Studio', amount: '+₦250,000', time: 'Today, 08:42', status: 'SUCCESSFUL', kind: 'deposit' },
  { id: 'MZ-240611-0087', title: 'AI Pay transfer', detail: 'Chinedu Okafor · Access Bank', amount: '-₦50,100', time: 'Today, 07:18', status: 'SUCCESSFUL', kind: 'transfer' },
  { id: 'MZ-240610-0742', title: 'MTN data', detail: '0803 000 0000', amount: '-₦2,050', time: 'Yesterday, 21:44', status: 'SUCCESSFUL', kind: 'bill' },
  { id: 'MZ-240610-0681', title: 'USDT purchase', detail: '86.42 USDT · Demo quote', amount: '-₦135,679', time: 'Yesterday, 14:02', status: 'PENDING', kind: 'crypto' },
  { id: 'MZ-240609-0420', title: 'Card authorization', detail: 'APPLE.COM/BILL', amount: '-₦4,900', time: 'Jun 9, 11:22', status: 'REVERSED', kind: 'card' }
];

export const demoNotifications = [
  { id: 'n1', title: 'Money received', body: '₦250,000 arrived from Brightline Studio.', time: '2m', type: 'money', unread: true },
  { id: 'n2', title: 'Security check complete', body: 'Your current iPhone remains a trusted device.', time: '1h', type: 'security', unread: true },
  { id: 'n3', title: 'Runner alert', body: 'Based Pepe moved from 76 to 89 on rising liquidity.', time: '3h', type: 'market', unread: false },
  { id: 'n4', title: 'P2P order needs review', body: 'A new counterparty triggered manual review.', time: 'Yesterday', type: 'p2p', unread: false }
];

export const demoRecipients = [
  { id: 'demo-user-tobi', name: 'Tobi Adeyemi', tag: '@tobi', bank: 'MemeZo', initials: 'TA', color: '#25D995', favorite: true },
  { id: 'demo-user-zainab', name: 'Zainab Musa', tag: '@zainab', bank: 'MemeZo', initials: 'ZM', color: '#B49AFF', favorite: true }
];

export const demoPosts = [
  { name: 'Tobi Charts', handle: '@tobicharts', rank: 'Elite', body: 'Liquidity held through the first pullback. I secured partial profit and moved risk above entry.', likes: 284, comments: 39, returnText: '+68.4%' },
  { name: 'Amina Alpha', handle: '@aminaalpha', rank: 'Pro', body: 'Watching Base activity. Strong tape, but concentration still needs confirmation.', likes: 147, comments: 21, returnText: '+31.2%' }
];

export const providerGroups = [
  { title: 'Naira payments', names: 'Nomba · Monnify · Paystack · Flutterwave', status: 'Setup required', fields: 'API key, secret, contract ID, webhook secret' },
  { title: 'Identity checks', names: 'Dojah · Smile ID · Prembly', status: 'Setup required', fields: 'App ID, private key, webhook secret' },
  { title: 'Market intelligence', names: 'DEX Screener · Birdeye · PumpPortal', status: 'Public/demo data only', fields: 'Provider keys and signed webhooks' },
  { title: 'Multi-chain infrastructure', names: 'Helius · QuickNode · Alchemy', status: 'Setup required', fields: 'RPC URLs and webhook signing secrets' },
  { title: 'Messaging & AI', names: 'WhatsApp Cloud · Resend · Expo Push · Emergent', status: 'Setup required', fields: 'Server-side keys and monthly budget' }
];
