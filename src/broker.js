export class PaperBroker {
  constructor(startingSol) {
    this.cashSol = startingSol;
    this.equitySol = startingSol;
    this.feesSol = 0;
    this.lastExecution = null;
  }

  async buy(position, { maxSlippagePct }) {
    const fee = position.sizeSol * 0.005;
    const slippage = position.sizeSol * Math.min(maxSlippagePct, 0.08) * 0.15;
    const cost = position.sizeSol + fee + slippage;
    if (cost > this.cashSol) throw new Error('paper broker has insufficient SOL');
    this.cashSol -= cost;
    this.feesSol += fee + slippage;
    this.lastExecution = { side: 'buy', feeSol: fee, slippageSol: slippage, grossSol: position.sizeSol, netSol: cost };
    this.markToMarket([...arguments]);
    return this.lastExecution;
  }

  async sell(position, pct, { exitValueSol = position.sizeSol * pct } = {}) {
    if (pct <= 0) return;
    const proceeds = exitValueSol;
    const fee = proceeds * 0.005;
    this.cashSol += Math.max(0, proceeds - fee);
    this.feesSol += fee;
    this.equitySol = this.cashSol;
    this.lastExecution = { side: 'sell', feeSol: fee, slippageSol: 0, grossSol: proceeds, netSol: Math.max(0, proceeds - fee) };
    return this.lastExecution;
  }

  markToMarket() {
    this.equitySol = this.cashSol;
  }
}

export class DisabledLiveBroker {
  async buy() {
    throw new Error('live trading is disabled. Implement a broker only after paper/backtest validation.');
  }

  async sell() {
    throw new Error('live trading is disabled. Implement a broker only after paper/backtest validation.');
  }
}
