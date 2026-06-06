export const demoAssets = [
  { symbol: 'NGN', name: 'Naira', balance: 318450, value: 318450, change: 0, color: '#20D68F' },
  { symbol: 'USDT', name: 'Tether', balance: 86.42, value: 135679, change: 0.02, color: '#26A17B' },
  { symbol: 'SOL', name: 'Solana', balance: 0.128, value: 31540, change: 4.82, color: '#A989FF' },
  { symbol: 'NFROG', name: 'Naija Frog', balance: 2820100, value: 11844, change: 146.2, color: '#F6C85F' },
  { symbol: 'SABI', name: 'Sabi Cat', balance: 13800, value: 2484, change: 72.4, color: '#58C7E8' }
];

export const demoTokens = [
  { mint: '8gV4dWgLwrmZ9hG9w1R9VYkSgu8kL67hJkPUMP001', name: 'Naija Frog', symbol: 'NFROG', score: 91, risk: 28, change: 146.2, price: 0.0042, marketCap: '₦38.4M', liquidity: '₦8.2M', holders: 1842, color: '#20D68F' },
  { mint: '6qTjN9d3kJr22LPp4ZdM8VtWLn8qPUMP002', name: 'Sabi Cat', symbol: 'SABI', score: 84, risk: 36, change: 72.4, price: 0.018, marketCap: '₦71.2M', liquidity: '₦14.6M', holders: 3015, color: '#58C7E8' },
  { mint: '4mHg2PTd7yL5nXwR3fC9sKqVaPUMP003', name: 'Jollof Wars', symbol: 'JOLLOF', score: 72, risk: 61, change: 31.6, price: 0.00081, marketCap: '₦11.9M', liquidity: '₦2.2M', holders: 723, color: '#FF7A59' },
  { mint: '9NaijaNoDeyCarryLast7xPUMP004', name: 'No Dulling', symbol: 'DULL', score: 78, risk: 42, change: 44.8, price: 0.0067, marketCap: '₦24.7M', liquidity: '₦5.8M', holders: 1129, color: '#A989FF' }
];

export const demoTransactions = [
  { title: 'Bought Naija Frog', detail: 'NFROG · Demo trade', amount: '-₦12,000', time: 'Today, 06:18', tone: 'buy' },
  { title: 'Sold Sabi Cat', detail: 'Net after ₦84 fee', amount: '+₦8,316', time: 'Yesterday, 21:44', tone: 'sell' },
  { title: 'Naira deposit', detail: 'Monnify demo rail', amount: '+₦50,000', time: 'Jun 4, 14:02', tone: 'sell' }
];

export const demoPosts = [
  { name: 'Tobi Charts', handle: '@tobicharts', rank: 'Elite', body: 'NFROG liquidity held through the first pullback. I took 40% profit and moved the stop above entry.', likes: 284, comments: 39, returnText: '+68.4%' },
  { name: 'Amina Alpha', handle: '@aminaalpha', rank: 'Pro', body: 'Watching SABI holder growth. Strong tape, but concentration is still above my comfort zone.', likes: 147, comments: 21, returnText: '+31.2%' }
];

export const providerGroups = [
  { title: 'Naira payments', names: 'Monnify · Paystack · Flutterwave', status: 'Setup required', fields: 'API key, secret, contract ID, webhook secret' },
  { title: 'Identity checks', names: 'Dojah · Smile ID · Prembly', status: 'Setup required', fields: 'App ID, private key, webhook secret' },
  { title: 'Market & execution', names: 'DexScreener · Birdeye · Jupiter', status: 'Public data only', fields: 'API keys and Jupiter execution adapter' },
  { title: 'Solana infrastructure', names: 'Helius · QuickNode · Alchemy', status: 'Setup required', fields: 'RPC URL and webhook signing secret' },
  { title: 'Messaging & AI', names: 'Resend · Expo Push · OpenAI-compatible', status: 'Setup required', fields: 'Server-side keys and monthly budget' }
];
