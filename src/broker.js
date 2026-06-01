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

  async sell(position, pct, { exitValueSol = position.sizeSol * pct } = {}) {
    if (pct <= 0) return;
    const proceeds = exitValueSol;
    const fee = proceeds * 0.005;
    this.cashSol += Math.max(0, proceeds - fee);
    this.feesSol += fee;
    this.lastExecution = this.execution('sell', { feeSol: fee, slippageSol: 0, grossSol: proceeds, netSol: Math.max(0, proceeds - fee) });
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
  async buy() {
    throw new Error('live trading is disabled. Implement a broker only after paper/backtest validation.');
  }

  async sell() {
    throw new Error('live trading is disabled. Implement a broker only after paper/backtest validation.');
  }
}
