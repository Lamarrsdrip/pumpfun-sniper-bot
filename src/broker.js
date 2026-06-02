export class PaperBroker {
  constructor(startingSol) {
    this.cashSol = startingSol;
    this.equitySol = startingSol;
    this.openValueSol = 0;
    this.unrealizedPnlSol = 0;
    this.feesSol = 0;
    this.lastExecution = null;
    this.executionSeq = 0;
  }

  async buy(position, { maxSlippagePct }) {
    const fee = position.sizeSol * 0.005;
    const slippage = position.sizeSol * Math.min(maxSlippagePct, 0.08) * 0.15;
    const cost = position.sizeSol + fee + slippage;
    if (cost > this.cashSol) throw new Error('paper broker has insufficient SOL');
    this.cashSol -= cost;
    this.feesSol += fee + slippage;
    this.lastExecution = this.execution('buy', { feeSol: fee, slippageSol: slippage, grossSol: position.sizeSol, netSol: cost });
    this.markToMarket([position]);
    return this.lastExecution;
  }

  async sell(position, pct, { exitValueSol = position.sizeSol * pct, maxSlippagePct = 0 } = {}) {
    if (pct <= 0) return;
    const proceeds = exitValueSol;
    const fee = proceeds * 0.005;
    const slippage = proceeds * Math.min(maxSlippagePct, 0.08) * 0.15;
    this.cashSol += Math.max(0, proceeds - fee - slippage);
    this.feesSol += fee + slippage;
    this.lastExecution = this.execution('sell', { feeSol: fee, slippageSol: slippage, grossSol: proceeds, netSol: Math.max(0, proceeds - fee - slippage) });
    return this.lastExecution;
  }

  execution(side, data) {
    this.executionSeq += 1;
    return {
      id: `paper-${String(this.executionSeq).padStart(6, '0')}`,
      side,
      at: Date.now(),
      ...data
    };
  }

  markToMarket(positions = []) {
    this.openValueSol = positions.reduce((total, position) => total + marketValue(position), 0);
    this.unrealizedPnlSol = positions.reduce((total, position) => total + Number(position.unrealizedPnlSol || 0), 0);
    this.equitySol = this.cashSol + this.openValueSol;
    return this.equitySol;
  }
}

function marketValue(position) {
  const entry = Number(position.entryPrice || 0);
  const current = Number(position.currentPrice || entry);
  const remaining = Number(position.remainingPct || 0);
  const size = Number(position.sizeSol || 0);
  if (!entry || !current || !remaining || !size) return 0;
  return size * remaining * (current / entry);
}

export class DisabledLiveBroker {
  constructor(config = {}) {
    this.config = config;
    this.cashSol = 0;
    this.equitySol = 0;
    this.openValueSol = 0;
    this.unrealizedPnlSol = 0;
    this.feesSol = 0;
    this.lastExecution = null;
    this.executionSeq = 0;
  }

  async buy() {
    throw new Error('live trading is disabled. Configure LIVE_TRADING_ENABLED=true and a live broker provider first.');
  }

  async sell() {
    throw new Error('live trading is disabled. Configure LIVE_TRADING_ENABLED=true and a live broker provider first.');
  }

  markToMarket() {
    return this.equitySol;
  }
}

export class LiveBroker {
  constructor(config = {}) {
    this.config = config;
    this.cashSol = 0;
    this.equitySol = 0;
    this.openValueSol = 0;
    this.unrealizedPnlSol = 0;
    this.feesSol = 0;
    this.lastExecution = null;
    this.executionSeq = 0;
  }

  async buy(position, context = {}) {
    return this.execute('buy', position, 1, context);
  }

  async sell(position, pct, context = {}) {
    return this.execute('sell', position, pct, context);
  }

  async execute(side, position, pct, context = {}) {
    const live = this.config.live || {};
    if (!live.enabled) throw new Error('live trading is not enabled. Set LIVE_TRADING_ENABLED=true.');
    const payload = {
      side,
      mint: position.mint,
      symbol: position.symbol,
      name: position.name,
      sizeSol: Number(position.sizeSol || 0) * Number(pct || 1),
      pct,
      maxSlippagePct: context.maxSlippagePct ?? this.config.risk?.maxSlippagePct,
      walletAddress: context.walletAddress || position.walletAddress || '',
      reason: context.reason || '',
      dryRun: live.dryRun,
      requestedAt: new Date().toISOString()
    };
    if (live.dryRun) {
      this.lastExecution = this.execution(`live-dry-run-${side}`, payload);
      return this.lastExecution;
    }
    if (!live.tradeApiUrl) throw new Error('live trade API URL is missing. Set LIVE_TRADE_API_URL.');
    if (!live.tradeApiKey) throw new Error('live trade API key is missing. Set LIVE_TRADE_API_KEY.');
    const response = await fetch(live.tradeApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${live.tradeApiKey}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || body.message || `live broker ${response.status}`);
    this.lastExecution = this.execution(`live-${side}`, {
      ...payload,
      provider: body.provider || 'external-live-broker',
      txSignature: body.txSignature || body.signature || '',
      response: body
    });
    return this.lastExecution;
  }

  execution(side, data) {
    this.executionSeq += 1;
    return {
      id: `live-${String(this.executionSeq).padStart(6, '0')}`,
      side,
      at: Date.now(),
      ...data
    };
  }

  markToMarket() {
    return this.equitySol;
  }
}
