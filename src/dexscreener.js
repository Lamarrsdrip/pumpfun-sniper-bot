const SOL_USD_FALLBACK = 165;

export class DexScreenerClient {
  constructor({ events }) {
    this.events = events;
    this.base = 'https://api.dexscreener.com';
    this.tracked = new Map();
  }

  async pollLatestProfiles() {
    const started = Date.now();
    const profiles = await this.getJson('/token-profiles/latest/v1');
    const solana = profiles.filter((profile) => profile.chainId === 'solana' && profile.tokenAddress);
    for (const profile of solana.slice(0, 18)) {
      if (this.tracked.has(profile.tokenAddress)) continue;
      this.tracked.set(profile.tokenAddress, profile);
      this.events.emit('feed:newToken', {
        mint: profile.tokenAddress,
        name: profile.description?.split('\n')[0]?.slice(0, 48) || symbolFromProfile(profile),
        symbol: symbolFromProfile(profile),
        uri: profile.url,
        icon: profile.icon,
        createdAt: Date.now(),
        source: 'dexscreener:profiles'
      });
    }
    this.events.emit('feed:sourceHealth', {
      source: 'DexScreener',
      status: 'online',
      latencyMs: Date.now() - started,
      tracked: this.tracked.size,
      updatedAt: Date.now()
    });
  }

  async pollPairs() {
    const addresses = [...this.tracked.keys()].slice(-30);
    if (!addresses.length) return;
    const started = Date.now();
    for (const chunk of chunked(addresses, 12)) {
      const data = await this.getJson(`/latest/dex/tokens/${chunk.join(',')}`);
      for (const pair of data.pairs || []) {
        if (pair.chainId !== 'solana' || !pair.baseToken?.address) continue;
        const liquidityUsd = Number(pair.liquidity?.usd || 0);
        const marketCapUsd = Number(pair.marketCap || pair.fdv || 0);
        const priceUsd = Number(pair.priceUsd || 0);
        const volumeUsd = Number(pair.volume?.m5 || pair.volume?.h1 || pair.volume?.h24 || 0);
        const txns = pair.txns?.m5 || pair.txns?.h1 || pair.txns?.h24 || {};
        const solUsd = Number(pair.quoteToken?.symbol === 'SOL' && pair.priceNative && pair.priceUsd ? pair.priceUsd / pair.priceNative : SOL_USD_FALLBACK) || SOL_USD_FALLBACK;
        this.events.emit('feed:marketSnapshot', {
          mint: pair.baseToken.address,
          name: pair.baseToken.name,
          symbol: pair.baseToken.symbol,
          price: priceUsd / solUsd,
          marketCapSol: marketCapUsd / solUsd,
          liquiditySol: liquidityUsd / solUsd,
          volumeSol: volumeUsd / solUsd,
          buys: Number(txns.buys || 0),
          sells: Number(txns.sells || 0),
          holderCount: estimateHolders(pair),
          bondingCurveProgress: estimateCurve(pair),
          source: 'dexscreener:pairs',
          timestamp: Date.now()
        });
      }
    }
    this.events.emit('feed:sourceHealth', {
      source: 'DexScreenerPairs',
      status: 'online',
      latencyMs: Date.now() - started,
      tracked: addresses.length,
      updatedAt: Date.now()
    });
  }

  async getJson(path) {
    const response = await fetch(`${this.base}${path}`, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`DexScreener ${response.status}`);
    return response.json();
  }
}

export class SolanaRpcHealth {
  constructor({ config, events }) {
    this.config = config;
    this.events = events;
  }

  async poll() {
    const started = Date.now();
    const response = await fetch(this.config.sources.solanaRpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSlot' })
    });
    if (!response.ok) throw new Error(`Solana RPC ${response.status}`);
    const body = await response.json();
    this.events.emit('feed:sourceHealth', {
      source: 'SolanaRPC',
      status: 'online',
      latencyMs: Date.now() - started,
      slot: body.result,
      updatedAt: Date.now()
    });
  }
}

function symbolFromProfile(profile) {
  const url = String(profile.url || '');
  const last = url.split('/').filter(Boolean).at(-1);
  return (last || profile.tokenAddress.slice(0, 5)).replace(/[^a-z0-9]/gi, '').slice(0, 10).toUpperCase();
}

function estimateHolders(pair) {
  const buys = Number(pair.txns?.h24?.buys || pair.txns?.h1?.buys || pair.txns?.m5?.buys || 0);
  const liquidity = Number(pair.liquidity?.usd || 0);
  return Math.max(1, Math.round(Math.min(3500, buys * 0.45 + Math.sqrt(liquidity) * 1.2)));
}

function estimateCurve(pair) {
  const fdv = Number(pair.fdv || pair.marketCap || 0);
  if (!fdv) return 0.12;
  return Math.max(0.03, Math.min(0.94, fdv / 120000));
}

function chunked(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}
