export function buildPerformanceReview({ trades = [], state = {}, status = {} } = {}) {
  const closed = trades.map(normalizeTrade).filter((trade) => trade.mint);
  const wins = closed.filter((trade) => trade.netPnlSol > 0);
  const losses = closed.filter((trade) => trade.netPnlSol < 0);
  const netPnlSol = sum(closed, 'netPnlSol');
  const grossPnlSol = sum(closed, 'grossPnlSol');
  const feesSol = sum(closed, 'feesSol');
  const lossSol = Math.abs(sum(losses, 'netPnlSol'));
  const winRate = closed.length ? wins.length / closed.length : 0;
  const profitFactor = lossSol > 0 ? sum(wins, 'netPnlSol') / lossSol : sum(wins, 'netPnlSol');
  const feeDragPct = grossPnlSol > 0 ? feesSol / grossPnlSol : 0;
  const accountPnlSol = Number(state.accountPnlSol || 0);
  const blockers = [];
  const recommendations = [];
  const sourceStatus = status.sources || {};
  const live = status.liveTrading || {};

  if (sourceStatus.pumpPortal?.apiKey !== 'present') blockers.push('PumpPortal key missing; trade subscriptions are limited.');
  if (sourceStatus.devActivity?.heliusApiKey !== 'present') blockers.push('Helius key missing; dev wallet detection is incomplete.');
  if (sourceStatus.holders?.birdeyeApiKey !== 'present') blockers.push('Birdeye key missing; holder concentration checks are limited.');
  if (!live.ready) blockers.push(`Live execution not ready: ${live.reason || 'secure broker not configured'}.`);
  if (closed.length < 100) blockers.push(`Need at least 100 reviewed paper/live-dry-run trades; current sample is ${closed.length}.`);
  if (closed.length >= 20 && profitFactor < 1.25) blockers.push('Profit factor is below 1.25; edge is not proven yet.');
  if (closed.length >= 20 && winRate < 0.48) blockers.push('Win rate is below 48%; entries/exits need more filtering.');
  if (closed.length >= 10 && feeDragPct > 0.18) blockers.push('Fees/slippage are eating too much gross profit.');
  if (closed.length >= 10 && accountPnlSol <= 0) blockers.push('Account PnL is not positive yet.');

  if (feeDragPct > 0.14) recommendations.push('Reduce churn: demand stronger first move, lower slippage, or avoid tiny exits.');
  if (losses.length && average(losses, 'netPnlSol') < -average(wins, 'netPnlSol')) recommendations.push('Average loss is larger than average win; tighten stop or take profits earlier.');
  if (reasonNet(closed, 'winner losing momentum') < 0) recommendations.push('Momentum-protection exits are losing money; keep fee-aware profit protection active.');
  if (reasonNet(closed, 'abnormal sell pressure') < 0) recommendations.push('Sell-pressure exits are net negative; require stronger entry buffer before exposure.');
  if (!recommendations.length) recommendations.push('Keep collecting paper/live-dry-run trades, then review again before risking real funds.');

  const score = readinessScore({
    closedCount: closed.length,
    sourceStatus,
    live,
    accountPnlSol,
    profitFactor,
    winRate,
    feeDragPct,
    blockers
  });

  return {
    score,
    label: score >= 85 ? 'Nearly live-ready' : score >= 70 ? 'Promising' : score >= 55 ? 'Needs proof' : 'Not live-ready',
    metrics: {
      trades: closed.length,
      netPnlSol: round(netPnlSol),
      accountPnlSol: round(accountPnlSol),
      grossPnlSol: round(grossPnlSol),
      feesSol: round(feesSol),
      feeDragPct: round(feeDragPct),
      winRate: round(winRate),
      profitFactor: round(profitFactor),
      averageWinSol: round(average(wins, 'netPnlSol')),
      averageLossSol: round(average(losses, 'netPnlSol'))
    },
    blockers,
    recommendations
  };
}

export function normalizeTrade(trade = {}) {
  const feesSol = Number(trade.feesSol || 0);
  const grossPnlSol = Number(trade.grossPnlSol ?? trade.pnlSol ?? 0);
  return {
    mint: String(trade.mint || ''),
    reason: String(trade.reason || 'unknown'),
    grossPnlSol,
    feesSol,
    netPnlSol: Number(trade.netPnlSol ?? grossPnlSol - feesSol)
  };
}

function readinessScore({ closedCount, sourceStatus, live, accountPnlSol, profitFactor, winRate, feeDragPct, blockers }) {
  let score = 38;
  if (sourceStatus.pumpPortal?.apiKey === 'present') score += 10;
  if (sourceStatus.devActivity?.heliusApiKey === 'present') score += 8;
  if (sourceStatus.holders?.birdeyeApiKey === 'present') score += 8;
  if (live.ready) score += 10;
  score += Math.min(12, closedCount / 100 * 12);
  if (accountPnlSol > 0) score += 8;
  if (profitFactor >= 1.25) score += 8;
  if (profitFactor >= 1.75) score += 4;
  if (winRate >= 0.5) score += 5;
  if (feeDragPct > 0.18) score -= 8;
  score -= Math.min(18, blockers.length * 2);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function reasonNet(trades, reason) {
  return sum(trades.filter((trade) => trade.reason === reason), 'netPnlSol');
}

function average(items, key) {
  return items.length ? sum(items, key) / items.length : 0;
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function round(value) {
  return Math.round(Number(value || 0) * 1_000_000) / 1_000_000;
}
