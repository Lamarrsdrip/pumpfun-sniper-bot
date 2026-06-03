import { readJsonl } from './logger.js';

const file = process.argv[2] || 'data/history.jsonl';
const closedTrades = readJsonl(file, 5000)
  .filter((event) => event.type === 'trade:close')
  .map(normalizeTrade)
  .filter((trade) => trade.mint);

if (!closedTrades.length) {
  console.log(JSON.stringify({
    trades: 0,
    message: 'No closed trades found in history yet. Run paper mode until positions close, then run npm run history again.'
  }, null, 2));
  process.exit(0);
}

const net = sum(closedTrades, 'netPnlSol');
const gross = sum(closedTrades, 'grossPnlSol');
const fees = sum(closedTrades, 'feesSol');
const wins = closedTrades.filter((trade) => trade.netPnlSol > 0);
const losses = closedTrades.filter((trade) => trade.netPnlSol < 0);
const byReason = groupByReason(closedTrades);
const feeDragPct = gross > 0 ? fees / gross : 0;

console.log(JSON.stringify({
  trades: closedTrades.length,
  netPnlSol: round(net),
  grossPnlSol: round(gross),
  feesAndSlippageSol: round(fees),
  feeDragPct: round(feeDragPct),
  winRate: round(wins.length / closedTrades.length),
  averageWinSol: round(wins.length ? sum(wins, 'netPnlSol') / wins.length : 0),
  averageLossSol: round(losses.length ? sum(losses, 'netPnlSol') / losses.length : 0),
  profitFactor: round(Math.abs(sum(losses, 'netPnlSol')) > 0 ? sum(wins, 'netPnlSol') / Math.abs(sum(losses, 'netPnlSol')) : sum(wins, 'netPnlSol')),
  reasons: byReason,
  recommendations: recommendations({ closedTrades, feeDragPct, byReason })
}, null, 2));

function normalizeTrade(trade = {}) {
  const feesSol = Number(trade.feesSol || 0);
  const grossPnlSol = Number(trade.grossPnlSol ?? trade.pnlSol ?? 0);
  return {
    mint: String(trade.mint || ''),
    name: String(trade.name || trade.symbol || trade.mint || ''),
    reason: String(trade.reason || 'unknown'),
    entryScore: Number(trade.entryScore || 0),
    exitScore: Number(trade.exitScore || 0),
    sizeSol: Number(trade.sizeSol || 0),
    grossPnlSol,
    feesSol,
    netPnlSol: Number(trade.netPnlSol ?? grossPnlSol - feesSol),
    maxDrawdownPct: Number(trade.maxDrawdownPct || 0)
  };
}

function groupByReason(trades) {
  return Object.values(trades.reduce((groups, trade) => {
    const key = trade.reason || 'unknown';
    groups[key] ||= { reason: key, trades: 0, netPnlSol: 0, feesSol: 0, wins: 0, losses: 0 };
    groups[key].trades += 1;
    groups[key].netPnlSol += trade.netPnlSol;
    groups[key].feesSol += trade.feesSol;
    if (trade.netPnlSol > 0) groups[key].wins += 1;
    if (trade.netPnlSol < 0) groups[key].losses += 1;
    return groups;
  }, {}))
    .map((group) => ({
      ...group,
      netPnlSol: round(group.netPnlSol),
      feesSol: round(group.feesSol),
      winRate: round(group.wins / group.trades)
    }))
    .sort((a, b) => a.netPnlSol - b.netPnlSol);
}

function recommendations({ closedTrades, feeDragPct, byReason }) {
  const notes = [];
  const smallGrossLosers = closedTrades.filter((trade) => trade.grossPnlSol > 0 && trade.netPnlSol <= 0);
  const momentumReason = byReason.find((group) => group.reason === 'winner losing momentum');
  if (smallGrossLosers.length) {
    notes.push('Some gross winners became net losers after fees/slippage. Keep fee-aware profit protection enabled.');
  }
  if (feeDragPct > 0.18) {
    notes.push('Fees/slippage are eating more than 18% of gross profit. Reduce churn, demand stronger first move, or lower max slippage.');
  }
  if (momentumReason && momentumReason.netPnlSol < 0) {
    notes.push('Momentum exits are losing money overall. Require higher net profit before using winner-protection exits.');
  }
  if (!notes.length) notes.push('No obvious repeated leak found yet. Keep collecting paper/live-dry-run trade history.');
  return notes;
}

function sum(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function round(value) {
  return Math.round(Number(value || 0) * 1_000_000) / 1_000_000;
}
