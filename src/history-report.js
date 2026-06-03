import { readJsonl } from './logger.js';
import { buildPerformanceReview } from './performance-review.js';

const file = process.argv[2] || 'data/history.jsonl';
const trades = readJsonl(file, 5000).filter((event) => event.type === 'trade:close');
const review = buildPerformanceReview({
  trades,
  state: { accountPnlSol: trades.reduce((total, trade) => total + Number(trade.netPnlSol ?? trade.pnlSol ?? 0), 0) },
  status: {
    sources: {
      pumpPortal: { apiKey: process.env.PUMPPORTAL_API_KEY ? 'present' : 'missing' },
      devActivity: { heliusApiKey: process.env.HELIUS_API_KEY ? 'present' : 'missing' },
      holders: { birdeyeApiKey: process.env.BIRDEYE_API_KEY ? 'present' : 'missing' }
    },
    liveTrading: {
      ready: process.env.MODE === 'live'
        && process.env.LIVE_TRADING_ENABLED === 'true'
        && Boolean(process.env.LIVE_TRADE_API_URL)
        && Boolean(process.env.LIVE_TRADE_API_KEY),
      reason: process.env.MODE === 'live' ? 'live broker/API not fully configured' : 'MODE is not live'
    }
  }
});

console.log(JSON.stringify(review, null, 2));
