import { PumpPortalClient } from './pumpportal.js';
import { DexScreenerClient, SolanaRpcHealth } from './dexscreener.js';
import { HolderEnrichmentService, HeliusDevActivityService } from './enrichment.js';

export class ScannerService {
  constructor({ config, events }) {
    this.config = config;
    this.events = events;
    this.client = null;
    this.dex = null;
    this.rpc = null;
    this.holders = null;
    this.devActivity = null;
    this.mock = null;
    this.realLaunches = 0;
    this.trackedTokens = new Map();
  }

  start() {
    if (this.config.dataMode === 'live' || this.config.dataMode === 'hybrid') {
      this.client = new PumpPortalClient({ apiKey: this.config.pumpPortalApiKey, events: this.events });
      this.events.on('feed:newToken', (token) => {
        if (token.source !== 'mock') this.realLaunches += 1;
        const mint = token.mint || token.ca || token.token || token.address;
        if (mint) this.trackedTokens.set(mint, { mint, devWallet: token.devWallet || token.creator || token.traderPublicKey || '' });
        if (mint) this.client.subscribeTrades(mint);
      });
      this.events.on('feed:marketSnapshot', (snapshot) => {
        const mint = snapshot.mint || snapshot.tokenAddress || snapshot.address;
        if (!mint) return;
        this.trackedTokens.set(mint, { ...(this.trackedTokens.get(mint) || {}), mint, devWallet: snapshot.devWallet || this.trackedTokens.get(mint)?.devWallet || '' });
      });
      this.client.connect();
      this.startRealPolling();
      if (this.config.dataMode === 'live') return;
    }
    if (this.config.mockFeed.enabled === false) {
      this.events.emit('feed:status', { status: 'live-only', source: 'real-sources-only' });
      return;
    }
    if (!this.config.mockFeed.fallbackOnly) this.startMock('mock');
    else {
      setTimeout(() => {
        if (this.realLaunches === 0) this.startMock('fallback-sim');
      }, this.config.mockFeed.fallbackAfterMs);
    }
  }

  stop() {
    this.mock?.stop();
  }

  startRealPolling() {
    this.dex = new DexScreenerClient({ events: this.events });
    this.rpc = new SolanaRpcHealth({ config: this.config, events: this.events });
    this.holders = new HolderEnrichmentService({ config: this.config, events: this.events });
    this.devActivity = new HeliusDevActivityService({ config: this.config, events: this.events });
    const safePoll = async (label, fn) => {
      try {
        await fn();
      } catch (error) {
        this.events.emit('feed:sourceHealth', { source: label, status: 'degraded', message: error.message, updatedAt: Date.now() });
      }
    };
    safePoll('DexScreener', () => this.dex.pollLatestProfiles());
    safePoll('DexScreenerPairs', () => this.dex.pollPairs());
    safePoll('SolanaRPC', () => this.rpc.poll());
    safePoll('HolderRPC', () => this.holders.enrich(this.enrichmentTargets()));
    safePoll('HeliusDevActivity', () => this.devActivity.enrich(this.enrichmentTargets()));
    setInterval(() => safePoll('DexScreener', () => this.dex.pollLatestProfiles()), this.config.sources.dexScreenerPollMs);
    setInterval(() => safePoll('DexScreenerPairs', () => this.dex.pollPairs()), this.config.sources.dexScreenerPollMs);
    setInterval(() => safePoll('SolanaRPC', () => this.rpc.poll()), this.config.sources.solanaRpcPollMs);
    setInterval(() => safePoll('HolderRPC', () => this.holders.enrich(this.enrichmentTargets())), 30000);
    setInterval(() => safePoll('HeliusDevActivity', () => this.devActivity.enrich(this.enrichmentTargets())), 45000);
  }

  enrichmentTargets() {
    const dexTargets = [...this.dex.tracked.values()].map((profile) => ({
      mint: profile.tokenAddress,
      devWallet: this.trackedTokens.get(profile.tokenAddress)?.devWallet || ''
    }));
    return [...new Map([...this.trackedTokens.values(), ...dexTargets].map((token) => [token.mint, token])).values()].slice(-40);
  }

  startMock(source = 'mock') {
    if (this.mock) return;
    this.mock = new MockPumpFunFeed({ config: this.config, events: this.events, source });
    this.mock.start();
  }
}

class MockPumpFunFeed {
  constructor({ config, events, source }) {
    this.config = config;
    this.events = events;
    this.source = source || 'mock';
    this.tokens = [];
    this.timers = [];
    this.count = 0;
  }

  start() {
    this.events.emit('feed:status', { status: this.source, source: this.source === 'fallback-sim' ? 'fallback-simulator' : 'simulated-pumpfun' });
    this.spawnToken();
    this.timers.push(setInterval(() => this.spawnToken(), this.config.mockFeed.newTokenEveryMs));
    this.timers.push(setInterval(() => this.emitTrade(), this.config.mockFeed.tradeEveryMs));
  }

  stop() {
    for (const timer of this.timers) clearInterval(timer);
  }

  spawnToken() {
    if (this.tokens.length >= this.config.mockFeed.maxActiveTokens) this.tokens.shift();
    const profile = profiles[Math.floor(Math.random() * profiles.length)];
    const id = randomBase58(8);
    const meme = randomMeme(profile);
    const token = {
      ...profile,
      behavior: profile,
      mint: randomMint(),
      name: meme.name,
      symbol: meme.symbol,
      devWallet: randomMint().slice(0, 44),
      createdAt: Date.now(),
      price: profile.priceSol,
      tick: 0,
      holders: new Set()
    };
    this.count += 1;
    this.tokens.push(token);
    this.events.emit('feed:newToken', { ...token, source: this.source });
  }

  emitTrade() {
    if (!this.tokens.length) return;
    const token = this.tokens[Math.floor(Math.random() * this.tokens.length)];
    token.tick += 1;
    const profile = token.behavior;
    const dangerPhase = token.tick > profile.dangerAfter;
    const sellBias = dangerPhase ? profile.lateSellBias : profile.sellBias;
    const isDevDump = dangerPhase && profile.devDumps && Math.random() < 0.25;
    const isSell = isDevDump || Math.random() < sellBias;
    const wallet = isDevDump ? token.devWallet : walletFor(token, profile);
    const size = amountFor(profile, token.tick, isSell);
    const drift = isSell ? -profile.sellImpact : profile.buyImpact;
    token.price = Math.max(profile.priceSol * 0.22, token.price * (1 + drift + noise(0.015)));
    token.marketCapSol = Math.max(8, token.marketCapSol * (1 + drift * 0.7 + noise(0.02)));
    token.bondingCurveProgress = Math.max(0.01, Math.min(0.95, token.bondingCurveProgress + (isSell ? -0.004 : 0.012)));
    token.liquiditySol = Math.max(1, token.liquiditySol + (isSell ? -0.08 : 0.11) + noise(0.05));
    if (!isSell && Math.random() < 0.04 && token.bondingCurveProgress > 0.72) {
      this.events.emit('feed:migration', { mint: token.mint, symbol: token.symbol, timestamp: Date.now() });
    }

    this.events.emit('feed:trade', {
      type: 'trade',
      mint: token.mint,
      txType: isSell ? 'sell' : 'buy',
      traderPublicKey: wallet,
      solAmount: size,
      tokenAmount: Math.max(1, size / token.price),
      priceSol: token.price,
      marketCapSol: token.marketCapSol,
      liquiditySol: token.liquiditySol,
      bondingCurveProgress: token.bondingCurveProgress,
      timestamp: Date.now()
    });
  }
}

const profiles = [
  {
    profile: 'clean-runner',
    priceSol: 0.00034,
    marketCapSol: 44,
    liquiditySol: 19,
    bondingCurveProgress: 0.12,
    buyImpact: 0.055,
    sellImpact: 0.035,
    sellBias: 0.14,
    lateSellBias: 0.42,
    dangerAfter: 45,
    devDumps: false
  },
  {
    profile: 'rug-risk',
    priceSol: 0.00022,
    marketCapSol: 32,
    liquiditySol: 9,
    bondingCurveProgress: 0.08,
    buyImpact: 0.04,
    sellImpact: 0.12,
    sellBias: 0.25,
    lateSellBias: 0.75,
    dangerAfter: 8,
    devDumps: true
  },
  {
    profile: 'fake-volume',
    priceSol: 0.00018,
    marketCapSol: 38,
    liquiditySol: 11,
    bondingCurveProgress: 0.1,
    buyImpact: 0.02,
    sellImpact: 0.02,
    sellBias: 0.12,
    lateSellBias: 0.55,
    dangerAfter: 20,
    clusteredWallets: true,
    devDumps: false
  },
  {
    profile: 'late-pump',
    priceSol: 0.00075,
    marketCapSol: 160,
    liquiditySol: 22,
    bondingCurveProgress: 0.72,
    buyImpact: 0.035,
    sellImpact: 0.055,
    sellBias: 0.22,
    lateSellBias: 0.5,
    dangerAfter: 12,
    devDumps: false
  }
];

const memeNames = [
  ['dogwifhat wife', 'WIFWIFE'],
  ['trencher cat 🐱', 'TRENCHCAT'],
  ['retardio cartel', 'CARTEL'],
  ['npc on sol', 'NPCSOL'],
  ['pepe terminal', 'PEPET'],
  ['chill guy CTO', 'CHILLCTO'],
  ['bonkler baby', 'BONKBB'],
  ['jeet detector', 'JEETD'],
  ['pump jesus', 'PJesus'],
  ['gork girlfriend', 'GORKGF'],
  ['micro capybara', 'CAPY'],
  ['dev is sleeping', 'SLEEP'],
  ['solana goblin mode', 'GOBLIN'],
  ['moon or food', 'MOONFOOD'],
  ['quant hamster', 'QHAM'],
  ['intern took profits', 'INTERN'],
  ['larry the laser eyes', 'LARRY'],
  ['cat wearing pit vipers', 'PITCAT'],
  ['elon reply guy', 'REPLY'],
  ['based banana', 'BANANA']
];

function randomMeme(profile) {
  const [name, symbol] = memeNames[Math.floor(Math.random() * memeNames.length)];
  const suffix = profile.profile === 'rug-risk' ? [' CTO', ' V2', ' stealth'][Math.floor(Math.random() * 3)] : '';
  return {
    name: `${name}${suffix}`,
    symbol: symbol.toUpperCase().slice(0, 10)
  };
}

function walletFor(token, profile) {
  if (profile.clusteredWallets) return `CLUSTER_${token.tick % 3}`;
  const id = token.tick + Math.floor(Math.random() * 40);
  return `${randomBase58(6)}${token.symbol.slice(0, 3)}${String(id).padStart(2, '0')}`;
}

function amountFor(profile, tick, isSell) {
  const base = profile.profile === 'clean-runner' ? 0.09 + tick * 0.002 : 0.07 + tick * 0.002;
  const multiplier = isSell ? 0.75 : 1.15;
  return Math.max(0.015, base * multiplier + Math.random() * (profile.profile === 'clean-runner' ? 0.04 : 0.12));
}

function noise(scale) {
  return (Math.random() - 0.5) * scale;
}

function randomMint() {
  return randomBase58(44);
}

function randomBase58(length) {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let value = '';
  for (let i = 0; i < length; i += 1) value += chars[Math.floor(Math.random() * chars.length)];
  return value;
}
