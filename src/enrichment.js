export class HolderEnrichmentService {
  constructor({ config, events }) {
    this.config = config;
    this.events = events;
    this.lastChecked = new Map();
  }

  async enrich(tokens) {
    const candidates = tokens
      .filter((token) => token.mint && shouldCheck(this.lastChecked, token.mint, 45000))
      .slice(0, 8);
    for (const token of candidates) {
      this.lastChecked.set(token.mint, Date.now());
      await this.enrichViaRpc(token).catch((error) => {
        this.events.emit('feed:sourceHealth', { source: 'HolderRPC', status: 'degraded', message: error.message, updatedAt: Date.now() });
      });
      if (this.config.sources.birdeyeApiKey) {
        await this.enrichViaBirdeye(token).catch((error) => {
          this.events.emit('feed:sourceHealth', { source: 'BirdeyeHolders', status: 'degraded', message: error.message, updatedAt: Date.now() });
        });
      } else {
        this.events.emit('feed:sourceHealth', { source: 'BirdeyeHolders', status: 'not-configured', message: 'BIRDEYE_API_KEY missing', updatedAt: Date.now() });
      }
    }
  }

  async enrichViaRpc(token) {
    const started = Date.now();
    const response = await fetch(this.config.sources.solanaRpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: token.mint,
        method: 'getTokenLargestAccounts',
        params: [token.mint]
      })
    });
    if (!response.ok) throw new Error(`Holder RPC ${response.status}`);
    const body = await response.json();
    const accounts = body.result?.value || [];
    const amounts = accounts.map((account) => Number(account.uiAmount || account.amount || 0)).filter((amount) => amount > 0);
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    if (total <= 0) return;
    this.events.emit('feed:marketSnapshot', {
      mint: token.mint,
      topHolderPct: amounts[0] / total,
      top5HolderPct: amounts.slice(0, 5).reduce((sum, amount) => sum + amount, 0) / total,
      holderDistribution: amounts.slice(0, 8).map((amount, index) => ({ rank: index + 1, pct: amount / total })),
      holderSource: 'solana:getTokenLargestAccounts',
      source: 'holder-rpc',
      timestamp: Date.now()
    });
    this.events.emit('feed:sourceHealth', { source: 'HolderRPC', status: 'online', latencyMs: Date.now() - started, updatedAt: Date.now() });
  }

  async enrichViaBirdeye(token) {
    const started = Date.now();
    const url = new URL('https://public-api.birdeye.so/defi/v3/token/holder');
    url.searchParams.set('address', token.mint);
    url.searchParams.set('limit', '20');
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'x-chain': 'solana',
        'X-API-KEY': this.config.sources.birdeyeApiKey
      }
    });
    if (!response.ok) throw new Error(`Birdeye holder ${response.status}`);
    const body = await response.json();
    const items = body.data?.items || body.data || [];
    const amounts = items.map((item) => Number(item.ui_amount || item.amount || item.balance || 0)).filter((amount) => amount > 0);
    const total = amounts.reduce((sum, amount) => sum + amount, 0);
    if (total <= 0) return;
    this.events.emit('feed:marketSnapshot', {
      mint: token.mint,
      holderCount: Number(body.data?.total || items.length || 0),
      topHolderPct: amounts[0] / total,
      top5HolderPct: amounts.slice(0, 5).reduce((sum, amount) => sum + amount, 0) / total,
      holderDistribution: amounts.slice(0, 8).map((amount, index) => ({ rank: index + 1, pct: amount / total })),
      holderSource: 'birdeye:token-holder',
      source: 'birdeye:holders',
      timestamp: Date.now()
    });
    this.events.emit('feed:sourceHealth', { source: 'BirdeyeHolders', status: 'online', latencyMs: Date.now() - started, updatedAt: Date.now() });
  }
}

export class HeliusDevActivityService {
  constructor({ config, events }) {
    this.config = config;
    this.events = events;
    this.lastChecked = new Map();
  }

  async enrich(tokens) {
    if (!this.config.sources.heliusApiKey) {
      this.events.emit('feed:sourceHealth', { source: 'HeliusDevActivity', status: 'not-configured', message: 'HELIUS_API_KEY missing', updatedAt: Date.now() });
      return;
    }
    const candidates = tokens
      .filter((token) => token.mint && token.devWallet && shouldCheck(this.lastChecked, token.devWallet, 60000))
      .slice(0, 5);
    for (const token of candidates) {
      this.lastChecked.set(token.devWallet, Date.now());
      await this.enrichDev(token).catch((error) => {
        this.events.emit('feed:sourceHealth', { source: 'HeliusDevActivity', status: 'degraded', message: error.message, updatedAt: Date.now() });
      });
    }
  }

  async enrichDev(token) {
    const started = Date.now();
    const url = `https://api.helius.xyz/v0/addresses/${token.devWallet}/transactions?api-key=${encodeURIComponent(this.config.sources.heliusApiKey)}&limit=20`;
    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`Helius dev activity ${response.status}`);
    const txs = await response.json();
    const swaps = txs.filter((tx) => String(tx.type || '').includes('SWAP')).length;
    const transfers = txs.filter((tx) => String(tx.type || '').includes('TRANSFER')).length;
    this.events.emit('feed:marketSnapshot', {
      mint: token.mint,
      devActivity: {
        source: 'helius:address-transactions',
        swaps,
        transfers,
        recentTxCount: txs.length,
        lastSignature: txs[0]?.signature || '',
        updatedAt: Date.now()
      },
      source: 'helius:dev-activity',
      timestamp: Date.now()
    });
    this.events.emit('feed:sourceHealth', { source: 'HeliusDevActivity', status: 'online', latencyMs: Date.now() - started, updatedAt: Date.now() });
  }
}

function shouldCheck(map, key, intervalMs) {
  const last = map.get(key) || 0;
  return Date.now() - last >= intervalMs;
}
