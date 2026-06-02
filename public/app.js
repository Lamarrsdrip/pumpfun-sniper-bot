const els = {
  walletButton: q('#walletButton'),
  walletLabel: q('#walletLabel'),
  walletMeta: q('#walletMeta'),
  walletBalance: q('#walletBalance'),
  emergencyButton: q('#emergencyButton'),
  feedStatus: q('#feedStatus'),
  networkLabel: q('#networkLabel'),
  connectionHealth: q('#connectionHealth'),
  mode: q('#mode'),
  modeSwitch: q('#modeSwitch'),
  equity: q('#equity'),
  pnl: q('#pnl'),
  activePositions: q('#activePositions'),
  tickerTape: q('#tickerTape'),
  sourceStrip: q('#sourceStrip'),
  openRisk: q('#openRisk'),
  unrealizedPnl: q('#unrealizedPnl'),
  winRate: q('#winRate'),
  tradeCount: q('#tradeCount'),
  blocked: q('#blocked'),
  rugBlocks: q('#rugBlocks'),
  fees: q('#fees'),
  healthScore: q('#healthScore'),
  marketRegime: q('#marketRegime'),
  marketRegimeDetail: q('#marketRegimeDetail'),
  readinessScore: q('#readinessScore'),
  readinessDetail: q('#readinessDetail'),
  missedRunHeadline: q('#missedRunHeadline'),
  missedRunDetail: q('#missedRunDetail'),
  runCaptureHeadline: q('#runCaptureHeadline'),
  runCaptureDetail: q('#runCaptureDetail'),
  alphaCount: q('#alphaCount'),
  alphaQueue: q('#alphaQueue'),
  scannerCount: q('#scannerCount'),
  scannerRows: q('#scannerRows'),
  tokenSearch: q('#tokenSearch'),
  statusFilter: q('#statusFilter'),
  analysisSubtitle: q('#analysisSubtitle'),
  analysisScore: q('#analysisScore'),
  tokenDetail: q('#tokenDetail'),
  positionCount: q('#positionCount'),
  positions: q('#positions'),
  pnlChart: q('#pnlChart'),
  dailyPnl: q('#dailyPnl'),
  maxDrawdown: q('#maxDrawdown'),
  exposurePct: q('#exposurePct'),
  threshold: q('#threshold'),
  settings: q('#settings'),
  riskImpact: q('#riskImpact'),
  riskPresets: q('#riskPresets'),
  events: q('#events'),
  eventCount: q('#eventCount'),
  alerts: q('#alerts'),
  blockedList: q('#blockedList'),
  toastStack: q('#toastStack')
};
els.appTabs = q('#appTabs');
els.bestCoinSubtitle = q('#bestCoinSubtitle');
els.bestCoinScore = q('#bestCoinScore');
els.bestCoinCard = q('#bestCoinCard');
els.simpleEntryReason = q('#simpleEntryReason');
els.simpleAvoidReason = q('#simpleAvoidReason');
els.simpleRugRisk = q('#simpleRugRisk');
els.simpleMomentum = q('#simpleMomentum');
els.simpleActivePnl = q('#simpleActivePnl');
els.simpleScannerStatus = q('#simpleScannerStatus');
els.blockedRanList = q('#blockedRanList');
els.missedRunList = q('#missedRunList');

els.walletMenu = q('#walletMenu');
els.walletMenuAddress = q('#walletMenuAddress');
els.walletMenuSol = q('#walletMenuSol');
els.walletMenuEquity = q('#walletMenuEquity');
els.walletMenuHoldings = q('#walletMenuHoldings');
els.walletMenuSwaps = q('#walletMenuSwaps');
els.walletActivity = q('#walletActivity');
els.disconnectWallet = q('#disconnectWallet');
els.copyWallet = q('#copyWallet');
els.openWalletSolscan = q('#openWalletSolscan');
els.walletMode = q('#walletMode');
els.walletConnectModal = q('#walletConnectModal');
els.closeWalletConnect = q('#closeWalletConnect');
els.walletProviderList = q('#walletProviderList');
els.executionModal = q('#executionModal');
els.executionTitle = q('#executionTitle');
els.executionSubtitle = q('#executionSubtitle');
els.executionBody = q('#executionBody');
els.closeExecution = q('#closeExecution');

let latestState = null;
let selectedMint = null;
let sortKey = 'ageMs';
let sortDir = 1;
let eventTotal = 0;
let walletConnected = false;
let walletAddress = '';
let walletSessionMode = '';
let riskPreset = 'balanced';
let chartMode = 'realized';
let activePage = 'trade';
let swapCount = 0;
let lastTokenScores = new Map();
const eventMemory = [];

const presetProfiles = {
  safe: { risk: 0.5, threshold: 88, freq: 'Fewer trades', drawdown: 'Lower risk', label: 'Safe: fewer trades, lower risk' },
  balanced: { risk: 1, threshold: 80, freq: 'Normal', drawdown: 'Controlled', label: 'Balanced: normal' },
  sniper: { risk: 1.2, threshold: 76, freq: 'Faster entries', drawdown: 'Higher monitoring needed', label: 'Sniper: faster entries' },
  aggressive: { risk: 1.55, threshold: 70, freq: 'More trades', drawdown: 'Research only', label: 'Aggressive: research only' }
};

async function refresh() {
  try {
    const response = await fetch('/api/state');
    if (!response.ok) throw new Error(`state API ${response.status}`);
    const state = await response.json();
    latestState = state;
    renderState(state);
  } catch (error) {
    setFeedOffline(error.message || 'state API unavailable');
  }
}

function renderState(state) {
  const stats = state.stats || {};
  const positions = state.openPositions || [];
  const unrealized = Number(state.unrealizedPnlSol || positions.reduce((total, p) => total + Number(p.unrealizedPnlSol || 0), 0));
  const deployed = positions.reduce((total, p) => total + Number(p.sizeSol || 0) * Number(p.remainingPct || 0), 0);
  const equity = Number(state.equitySol || 0);
  const maxRisk = Number(state.config.risk.maxPositionSizeSol || 0) * Number(state.config.risk.maxOpenTrades || 1);
  if ((state.watchedTokens || []).length && els.networkLabel.textContent === 'SYNCING') {
    setFeed(state.config.dataMode === 'mock' ? 'mock-live' : 'connected');
  }

  els.mode.textContent = state.config.mode === 'paper' ? 'Paper' : state.config.live?.dryRun ? 'Live Dry Run' : 'Live Armed';
  if (state.config.mode === 'live') {
    els.mode.textContent = state.config.live?.dryRun ? 'Live Dry Run' : 'Live Armed';
  }
  renderModeSwitch(state.config);
  els.threshold.textContent = `Score ${state.config.strictScoreThreshold}+`;
  els.equity.textContent = fixed(equity);
  els.pnl.textContent = signed(stats.totalPnlSol || 0);
  els.pnl.className = Number(stats.totalPnlSol || 0) >= 0 ? 'green' : 'red';
  els.activePositions.textContent = positions.length;
  els.openRisk.textContent = fixed(deployed);
  els.unrealizedPnl.textContent = signed(unrealized);
  els.unrealizedPnl.className = unrealized >= 0 ? 'green' : 'red';
  els.winRate.textContent = pct(stats.winRate || 0);
  els.tradeCount.textContent = `${stats.closed || 0} closed`;
  els.blocked.textContent = stats.blocked || 0;
  els.rugBlocks.textContent = `${stats.blockedRugRisk || 0} rug-risk`;
  els.fees.textContent = fixed(state.feesSol || 0);
  els.dailyPnl.textContent = signed(stats.totalPnlSol || 0);
  els.exposurePct.textContent = pct(maxRisk ? deployed / maxRisk : 0);
  els.healthScore.textContent = healthScore(state);

  renderWalletPrompt(state.config);
  if (walletConnected) {
    els.walletBalance.textContent = 'connected';
    els.walletMenuSol.textContent = walletSessionMode === 'live' ? 'Not loaded' : 'Paper only';
    els.walletMenuEquity.textContent = `${fixed(equity)} SOL`;
    els.walletMenuHoldings.textContent = positions.length;
    els.walletMenuSwaps.textContent = swapCount;
    els.walletMode.textContent = walletSessionMode === 'live' ? 'Live Wallet' : 'Paper Session';
    els.walletMeta.textContent = walletSessionMode === 'live' ? 'Live wallet connected' : 'Paper session active';
  }
  els.emergencyButton.textContent = state.config.emergencyStop ? 'Clear Stop' : 'Emergency Stop';
  els.emergencyButton.classList.toggle('armed', Boolean(state.config.emergencyStop));

  renderTicker(state.watchedTokens || []);
  renderOnboarding(state);
  renderBeginner(state);
  renderSourceStrip(state.sourceHealth || {}, state.config);
  renderIntelligence(state.intelligence || {});
  renderLearning(state.learning || {});
  renderScanner(state.watchedTokens || []);
  renderPositions(positions);
  renderTokenDetail(selectedToken(state.watchedTokens || []) || bestToken(state.watchedTokens || []));
  renderRiskConsole(state.config);
  renderAlerts(state.portfolio?.alerts || []);
  renderBlocked(state.watchedTokens || []);
  drawChart(state.portfolio?.equityCurve || [], positions);
  renderPage();
}

function renderPage() {
  document.querySelectorAll('[data-page-panel]').forEach((panel) => {
    panel.classList.toggle('page-hidden', panel.dataset.pagePanel !== activePage);
  });
  if (!els.appTabs) return;
  els.appTabs.querySelectorAll('button[data-page]').forEach((button) => {
    button.classList.toggle('active', button.dataset.page === activePage);
  });
}

function renderBeginner(state) {
  const tokens = state.watchedTokens || [];
  const positions = state.openPositions || [];
  const best = [...tokens].sort((a, b) => beginnerRank(b) - beginnerRank(a))[0];
  const unrealized = Number(state.unrealizedPnlSol || 0);
  els.simpleActivePnl.textContent = `${signed(unrealized)} SOL`;
  els.simpleActivePnl.className = unrealized >= 0 ? 'green' : 'red';
  const source = state.sourceHealth?.PumpPortal;
  els.simpleScannerStatus.textContent = source?.message || source?.status || `${tokens.length} tokens tracked`;
  if (!best) {
    els.bestCoinSubtitle.textContent = 'No token data yet';
    els.bestCoinScore.textContent = '--';
    els.bestCoinCard.className = 'best-coin-card empty-state';
    els.bestCoinCard.textContent = 'No live tokens yet. Add API keys for stronger real-time data or wait for public sources.';
    els.simpleEntryReason.textContent = 'No entry yet';
    els.simpleAvoidReason.textContent = 'Waiting for scanner data';
    els.simpleRugRisk.textContent = '--';
    els.simpleMomentum.textContent = '--';
    return;
  }
  selectedMint = selectedMint || best.mint;
  const score = best.lastScore?.score || 0;
  els.bestCoinSubtitle.textContent = `${short(best.mint)} / ${best.decisionLabel || best.status}`;
  els.bestCoinScore.textContent = score;
  els.bestCoinScore.className = `score-badge ${scoreClass(score, state.config.strictScoreThreshold)}`;
  els.simpleEntryReason.textContent = entryWhy(best, state.config);
  els.simpleAvoidReason.textContent = avoidWhy(best);
  els.simpleRugRisk.textContent = best.rugRiskLevel || 'Unknown';
  els.simpleRugRisk.className = /High|Extreme/.test(best.rugRiskLevel || '') ? 'red' : best.rugRiskLevel === 'Medium' ? 'yellow' : 'green';
  els.simpleMomentum.textContent = `${Math.round(best.momentumScore || best.lastScore?.categories?.momentum || 0)}/100`;
  els.bestCoinCard.className = 'best-coin-card';
  const hasBestPosition = positions.some((position) => position.mint === best.mint);
  els.bestCoinCard.innerHTML = `
    <div class="best-title"><strong>${tokenIcon(best)}${tokenName(best)}</strong><span class="state ${safeClass(best.status)}">${escapeHtml(best.status || 'WATCHING')}</span></div>
    <div class="contract-copy"><span>${escapeHtml(best.mint)}</span><button class="copy-chip" data-action="copy-mint" data-mint="${escapeAttr(best.mint)}">Copy Contract</button></div>
    <canvas class="analysis-chart" width="520" height="170"></canvas>
    <div class="best-actions">
      <button class="action-button profit" data-action="paper-buy" data-mint="${escapeAttr(best.mint)}">Paper Buy</button>
      <button class="action-button" ${hasBestPosition ? `data-action="close" data-mint="${escapeAttr(best.mint)}"` : 'disabled'}>${hasBestPosition ? 'Paper Sell' : 'No Position'}</button>
      <button class="action-button" data-action="analyze" data-mint="${escapeAttr(best.mint)}">View Chart</button>
      <button class="action-button warn" data-action="block-reason" data-mint="${escapeAttr(best.mint)}">Block Reason</button>
      <button class="action-button ${liveButtonClass()}" data-action="live-buy" data-mint="${escapeAttr(best.mint)}">${liveButtonLabel()}</button>
    </div>`;
  drawMiniChart(els.bestCoinCard.querySelector('canvas'), best);
}

function renderModeSwitch(config) {
  if (!els.modeSwitch) return;
  for (const button of els.modeSwitch.querySelectorAll('button[data-mode-option]')) {
    button.classList.toggle('active', button.dataset.modeOption === config.mode);
  }
}

function beginnerRank(token) {
  const score = token.lastScore?.score || 0;
  const riskPenalty = Number(token.rugRiskScore || 0) * 0.45;
  const statusBoost = token.status === 'QUALIFIED' ? 20 : token.status === 'ENTERED' ? 15 : token.status === 'WATCHING' ? 5 : -20;
  return score + Number(token.momentumScore || 0) * 0.18 - riskPenalty + statusBoost;
}

function entryWhy(token, config) {
  const score = token.lastScore?.score || 0;
  if (score >= config.strictScoreThreshold) return `Score ${score}, ${token.decisionLabel || 'confirmed'}, buyers active.`;
  if ((token.lastScore?.categories?.momentum || token.momentumScore || 0) >= 70) return 'Momentum forming; scout only if safety improves.';
  return 'No entry until score, timing, and safety align.';
}

function avoidWhy(token) {
  const reasons = token.blockReasons || [token.statusReason].filter(Boolean);
  if (reasons.length) return reasons.slice(0, 2).join(' | ');
  if (token.decisionLabel === 'Too late') return 'Move is extended; avoid top-buy risk.';
  if ((token.rugRiskScore || 0) > 60) return 'Rug risk is too high.';
  return 'No major avoid reason.';
}

function renderLearning(learning) {
  const badBlocks = (learning.blockedMemory || []).filter((item) => item.outcome === 'bad block or missed run').slice(0, 6);
  els.blockedRanList.innerHTML = badBlocks.map((item) => learningRow(item)).join('') || '<div class="empty-mini">No bad blocks detected yet.</div>';
  const missed = (learning.missedRuns || []).filter((item) => item.maxRunPct > 0.2 || item.outcome === 'bad block or missed run').slice(0, 6);
  els.missedRunList.innerHTML = missed.map((item) => learningRow(item)).join('') || '<div class="empty-mini">No missed runs recorded yet.</div>';
}

function learningRow(item) {
  return `<div class="learning-row"><strong>${escapeHtml(item.symbol || item.name || short(item.mint))} <span>${signedPct(item.maxRunPct || 0)}</span></strong><small>${escapeHtml((item.reasons || []).slice(0, 2).join(' | ') || item.outcome || 'pending')}</small></div>`;
}

function renderOnboarding(state) {
  const steps = [...document.querySelectorAll('.onboard-step')];
  const hasSource = Object.values(state.sourceHealth || {}).some((source) => ['online', 'connected', 'public-only'].includes(source.status));
  const hasToken = (state.watchedTokens || []).length > 0;
  const hasSelection = Boolean(selectedToken(state.watchedTokens || []) || bestToken(state.watchedTokens || []));
  const hasPosition = (state.openPositions || []).length > 0;
  [walletConnected, true, hasSource, hasToken && hasSelection, hasPosition].forEach((done, index) => {
    if (!steps[index]) return;
    steps[index].classList.toggle('done', Boolean(done));
    steps[index].classList.toggle('active', !done && !steps.slice(0, index).some((step) => !step.classList.contains('done')));
  });
}

function renderIntelligence(intel) {
  const regime = intel.marketRegime || { label: '--', tone: 'stable', detail: 'Waiting for live flow' };
  els.marketRegime.textContent = regime.label;
  els.marketRegimeDetail.textContent = regime.detail;
  els.marketRegime.closest('.intel-card').className = `intel-card ${regime.tone || 'stable'}`;

  const readiness = intel.executionReadiness || {};
  els.readinessScore.textContent = readiness.score ? `${readiness.score}/100` : '--';
  els.readinessDetail.textContent = readiness.sourceCount
    ? `${readiness.sourceCount} sources / ${readiness.avgLatencyMs || 0}ms avg / ${fixed(readiness.openRiskSol || 0)} SOL open risk`
    : 'Sources syncing';

  const near = (intel.nearMisses || [])[0];
  if (near) {
    els.missedRunHeadline.textContent = `${tokenName(near)} ${near.lastScore?.score || 0} score / ${near.alphaScore} alpha`;
    els.missedRunDetail.textContent = (near.opportunityReasons || []).join(' | ');
  } else {
    els.missedRunHeadline.textContent = 'No near-miss yet';
    els.missedRunDetail.textContent = 'The bot will flag tokens rising toward threshold before entry.';
  }

  const runCapture = intel.runCapture || {};
  els.runCaptureHeadline.textContent = runCapture.headline || 'No clean run forming';
  els.runCaptureDetail.textContent = runCapture.detail || 'Watching for acceleration without chasing unsafe candles.';

  const captureQueue = (runCapture.candidates || []).map((item) => ({
    ...item,
    lastScore: { score: item.score },
    opportunityReasons: item.reasons,
    alphaScore: item.alphaScore
  }));
  const queue = captureQueue.length ? captureQueue : (intel.hotQueue || []);
  els.alphaCount.textContent = `${queue.length} queued`;
  els.alphaQueue.innerHTML = queue.slice(0, 8).map((token) => `
    <article class="alpha-card" data-mint="${escapeAttr(token.mint)}">
      <strong><span>${tokenIcon(token)}${tokenName(token)}</span><span class="${scoreClass(token.alphaScore, 80)}">${token.alphaScore}</span></strong>
      <small>${short(token.mint)} / ${token.status} / score ${token.lastScore?.score || 0}</small>
      <div class="alpha-meter"><span style="width:${clamp(token.alphaScore, 4, 100)}%"></span></div>
      <div class="alpha-reasons">${escapeHtml((token.opportunityReasons || []).join(' | '))}</div>
    </article>
  `).join('') || '<div class="empty-state">No clean alpha queue yet. Scanner is waiting for real confirmation.</div>';
}

function renderTicker(tokens) {
  const hot = [...tokens].slice(-12).reverse();
  els.tickerTape.innerHTML = hot.map((t) => {
    const score = t.lastScore?.score || 0;
    const dir = score >= (lastTokenScores.get(t.mint) || 0) ? 'arrow-up' : 'arrow-down';
    lastTokenScores.set(t.mint, score);
    return `<div class="ticker-chip"><span class="activity-dot ${t.status === 'BLOCKED' ? '' : 'buy'}"></span><strong>${tokenName(t)}</strong><span class="${dir}">${score}</span><span class="muted">${t.status}</span></div>`;
  }).join('');
}

function renderSourceStrip(health, config) {
  const sources = [
    ['PumpPortal', health.PumpPortal || { status: config.pumpPortalApiKey ? 'connecting' : 'missing-key', message: 'Missing API key; public launch data only, trade subscriptions unavailable' }],
    ['DexScreener', health.DexScreener || { status: 'connecting' }],
    ['DexPairs', health.DexScreenerPairs || { status: 'connecting' }],
    ['Solana RPC', health.SolanaRPC || { status: 'connecting' }],
    ['Holders', health.BirdeyeHolders || health.HolderRPC || { status: config.birdeyeApiKey || config.sources?.birdeyeApiKey ? 'connecting' : 'not-configured', message: config.birdeyeApiKey || config.sources?.birdeyeApiKey ? 'Holder enrichment pending' : 'Missing Birdeye key; limited holder signals only' }],
    ['Dev Monitor', health.HeliusDevActivity || { status: config.heliusApiKey || config.sources?.heliusApiKey ? 'connecting' : 'not-configured', message: config.heliusApiKey || config.sources?.heliusApiKey ? 'Dev monitor pending' : 'Missing Helius key; dev wallet monitor unavailable' }],
    ['Execution', { status: config.mode === 'paper' ? 'paper-safe' : 'live-gated' }]
  ];
  els.sourceStrip.innerHTML = sources.map(([label, src]) => {
    const status = String(src.status || 'offline');
    const online = status.includes('online') || status.includes('paper') || status.includes('public') || status.includes('connected');
    const degraded = status.includes('degraded') || status.includes('connecting');
    const missing = status.includes('missing') || status.includes('not-configured');
    const meta = src.slot ? `slot ${src.slot}` : src.latencyMs ? `${src.latencyMs}ms latency` : src.message || status;
    const tone = online ? 'online' : degraded || missing ? 'degraded' : 'offline';
    return `<article class="source-card"><small><span class="source-status ${tone}"></span>${escapeHtml(label)}</small><strong>${escapeHtml(meta)}</strong></article>`;
  }).join('');
}

function renderScanner(tokens) {
  const term = els.tokenSearch.value.trim().toLowerCase();
  const filter = els.statusFilter.value;
  const threshold = latestState.config.strictScoreThreshold;
  const filtered = tokens
    .filter((t) => filter === 'ALL' || t.status === filter)
    .filter((t) => !term || `${t.symbol} ${t.name} ${t.mint}`.toLowerCase().includes(term))
    .sort((a, b) => compareTokens(a, b));

  els.scannerCount.textContent = `${filtered.length} of ${tokens.length} launches tracked`;
  els.scannerRows.innerHTML = filtered.slice(0, 42).map((t) => {
    const score = t.lastScore?.score || 0;
    const prev = lastTokenScores.get(`row-${t.mint}`) || score;
    const move = score >= prev ? 'arrow-up' : 'arrow-down';
    lastTokenScores.set(`row-${t.mint}`, score);
    const selected = selectedMint === t.mint ? 'selected' : '';
    const fresh = t.ageMs < 9000 ? 'fresh' : '';
    return `<tr class="${selected} ${fresh}" data-mint="${escapeAttr(t.mint)}">
      <td data-label="Token" class="token-cell"><strong>${tokenIcon(t)}${tokenName(t)}</strong><small><span class="contract-line">${short(t.mint)} <button class="copy-chip" data-action="copy-mint" data-mint="${escapeAttr(t.mint)}">Copy</button></span> / ${age(t.ageMs)} / ${escapeHtml(t.source || 'market')}</small></td>
      <td data-label="Score" class="${scoreClass(score, threshold)}">${score}</td>
      <td data-label="Risk" class="${t.rugRiskScore > 65 ? 'red' : t.rugRiskScore > 42 ? 'yellow' : 'green'}">${Math.round(t.rugRiskScore || 0)}</td>
      <td data-label="Volume">${fixed(t.buyVolumeSol + t.sellVolumeSol)}<div class="heat" style="opacity:${Math.min(1, 0.25 + (t.volumeSpike || 0) / 8)}"></div></td>
      <td data-label="Status"><span class="state ${safeClass(t.status)}">${escapeHtml(t.status || 'WATCHING')}</span></td>
      <td data-label="Chart" class="spark-cell"><canvas class="row-spark" width="90" height="28" data-spark="${escapeAttr(t.mint)}"></canvas></td>
      <td data-label="Action"><div class="row-actions">
        <button class="mini-button" data-action="paper-buy" data-mint="${escapeAttr(t.mint)}">Paper Buy</button>
        <button class="mini-button" data-action="analyze" data-mint="${escapeAttr(t.mint)}">View Chart</button>
        <button class="mini-button" data-action="block-reason" data-mint="${escapeAttr(t.mint)}">Block Reason</button>
        <button class="mini-button ${liveButtonClass()}" data-action="live-buy" data-mint="${escapeAttr(t.mint)}">${liveButtonLabel()}</button>
      </div></td>
    </tr>`;
  }).join('') || '<tr><td colspan="7"><div class="empty-row">No tokens yet. Connect data sources or wait for the scanner to receive live launches.</div></td></tr>';
  drawRowSparklines(filtered.slice(0, 42));
}

function renderTokenDetail(token) {
  if (!token) {
    els.analysisSubtitle.textContent = 'Select a token from the sniper feed';
    els.analysisScore.textContent = '--';
    els.tokenDetail.className = 'token-detail empty-state';
    els.tokenDetail.textContent = 'Waiting for selection.';
    return;
  }
  const score = token.lastScore?.score || 0;
  const components = token.lastScore?.components || {};
  els.analysisSubtitle.textContent = `${tokenName(token)} / ${short(token.mint)} / ${token.status}`;
  els.analysisScore.textContent = score;
  els.analysisScore.className = `score-badge ${scoreClass(score, latestState.config.strictScoreThreshold)}`;
  els.tokenDetail.className = 'token-detail';
  els.tokenDetail.innerHTML = `
    <div class="detail-header">
      <div><h3>${tokenIcon(token)}${tokenName(token)}</h3><p>${escapeHtml(token.name || token.symbol || token.mint)} / ${escapeHtml(token.source || 'market')}</p></div>
      <span class="state ${safeClass(token.status)}">${escapeHtml(token.status || 'WATCHING')}</span>
    </div>
    <div class="detail-actions">
      <button class="mini-button" data-action="copy-mint" data-mint="${escapeAttr(token.mint)}">Copy Mint</button>
      <button class="mini-button" data-action="copy-dev" data-wallet="${escapeAttr(token.devWallet || '')}">Copy Dev</button>
      <button class="mini-button" data-action="open-pump" data-mint="${escapeAttr(token.mint)}">Pump.fun</button>
      <button class="mini-button" data-action="open-dex" data-mint="${escapeAttr(token.mint)}">DexScreener</button>
      <button class="mini-button" data-action="open-solscan" data-mint="${escapeAttr(token.mint)}">Solscan</button>
    </div>
    <div class="token-facts">
      <div><small>Mint</small><strong>${escapeHtml(token.mint)}</strong></div>
      <div><small>Creator / Dev</small><strong>${escapeHtml(short(token.devWallet || 'unknown'))}</strong></div>
      <div><small>Age</small><strong>${age(token.ageMs)}</strong></div>
      <div><small>Market Cap</small><strong>${fixed(token.marketCapSol)} SOL</strong></div>
      <div><small>Bonding Curve</small><strong>${pct(token.bondingCurveProgress)}</strong></div>
      <div><small>Liquidity</small><strong>${fixed(token.liquiditySol)} SOL</strong></div>
      <div><small>Holders</small><strong>${token.holderCount}</strong></div>
      <div><small>Top Holder</small><strong>${pct(token.topHolderPct || 0)}</strong></div>
      <div><small>Holder Source</small><strong class="${token.holderSource ? '' : 'yellow'}">${escapeHtml(token.holderSource || 'Unavailable: add Birdeye/RPC data')}</strong></div>
      <div><small>Dev Activity</small><strong class="${token.devActivity ? '' : 'yellow'}">${token.devActivity ? `${token.devActivity.recentTxCount} tx / ${token.devActivity.swaps} swaps` : 'Unavailable: add Helius key'}</strong></div>
      <div><small>Mint Authority</small><strong class="yellow">Not verified without mint-account enrichment</strong></div>
      <div><small>Freeze Authority</small><strong class="yellow">Not verified without mint-account enrichment</strong></div>
    </div>
    <canvas class="analysis-chart" width="520" height="190" data-chart-mint="${escapeAttr(token.mint)}"></canvas>
    <div class="zones">
      <div class="zone"><small>Entry Zone</small><strong>${fixed(token.price * 0.985)} - ${fixed(token.price * 1.015)}</strong></div>
      <div class="zone"><small>Stop Zone</small><strong class="red">${fixed(token.price * (1 - latestState.config.management.hardStopLossPct))}</strong></div>
      <div class="zone"><small>Projected TP</small><strong class="green">${latestState.config.management.takeProfits.map((tp) => `+${Math.round(tp.profitPct * 100)}%`).join(' / ')}</strong></div>
    </div>
    <div class="breakdown">
      ${metric('Momentum', token.momentumScore || components.momentum || 0)}
      ${metric('Volume acceleration', components.volume || 0)}
      ${metric('Buy pressure', components.sellPressure || 0)}
      ${metric('Holder growth', components.holder || 0)}
      ${metric('Dev safety', components.devSafety || 0)}
      ${metric('Whale risk shield', components.whaleRisk || 0)}
      ${metric('Liquidity strength', components.liquidity || token.liquidityQuality || 0)}
      ${metric('Rug protection', components.rugRisk || 0)}
    </div>
    <div class="reason-box">
      <strong>Execution reasoning</strong>
      <div>${executionReason(token)}</div>
      <div class="muted">Estimated slippage cap ${pct(latestState.config.risk.maxSlippagePct)} / liquidity quality ${Math.round(token.liquidityQuality || 0)} / top holder ${pct(token.topHolderPct || 0)}</div>
    </div>`;
  els.tokenDetail.insertAdjacentHTML('beforeend', renderTokenTxFeed(token));
  drawMiniChart(els.tokenDetail.querySelector('canvas'), token);
}

function renderPositions(positions) {
  els.positionCount.textContent = `${positions.length} open positions`;
  if (!positions.length) {
    els.positions.innerHTML = `<div class="empty-state">No active position. The engine is scanning, scoring, and waiting for a strict setup.</div>`;
    return;
  }
  els.positions.innerHTML = positions.map((p) => {
    const pnl = Number(p.unrealizedPnlSol || 0);
    const pctGain = Number(p.unrealizedPct || 0);
    const hitTargets = (p.takeProfits || []).map((tp) => pctGain >= tp.profitPct);
    return `<article class="position-card">
      <div class="position-top">
        <div class="position-title"><strong>${tokenName(p)}</strong><small>${short(p.mint)} / ${age(p.timeInTradeMs)} in trade</small></div>
        <div class="pnl-badge ${pnl >= 0 ? 'green' : 'red'}">${signed(pnl)} SOL<br><small>${signedPct(pctGain)}</small></div>
      </div>
      <div class="position-metrics">
        <div><small>Entry</small><strong>${fixed(p.entryPrice)}</strong></div>
        <div><small>Current</small><strong>${fixed(p.currentPrice)}</strong></div>
        <div><small>Stop</small><strong class="red">${fixed(p.stopPrice)}</strong></div>
        <div><small>Trail</small><strong>${p.trailingStopPrice ? fixed(p.trailingStopPrice) : 'armed > +' + Math.round(latestState.config.management.trailingStartPct * 100) + '%'}</strong></div>
        <div><small>Exit Risk</small><strong class="${p.exitConfidence > 65 ? 'red' : p.exitConfidence > 40 ? 'yellow' : 'green'}">${Math.round(p.exitConfidence)}%</strong></div>
      </div>
      <div class="tp-progress">${hitTargets.map((hit) => `<span class="${hit ? 'hit' : ''}"></span>`).join('')}</div>
      <div class="muted">Momentum ${escapeHtml(p.momentumStatus || 'stable')} / remaining ${pct(p.remainingPct)} / score ${p.entryScore || p.score}</div>
      <div class="position-actions">
        <button class="action-button warn" data-action="partial-close" data-mint="${escapeAttr(p.mint)}">Partial Close</button>
        <button class="action-button profit" data-action="protect" data-mint="${escapeAttr(p.mint)}">Protect Profit</button>
        <button class="action-button" data-action="close" data-mint="${escapeAttr(p.mint)}">Close</button>
        <button class="action-button danger" data-action="emergency-exit" data-mint="${escapeAttr(p.mint)}">Emergency Exit</button>
      </div>
    </article>`;
  }).join('');
}

function renderTokenTxFeed(token) {
  const trades = token.recentTrades || [];
  const rows = trades.slice(-10).reverse().map((trade) => `
    <div class="tx-row">
      <span class="${trade.side}">${trade.side.toUpperCase()}</span>
      <span>${escapeHtml(short(trade.wallet || 'wallet'))}</span>
      <strong>${fixed(trade.solAmount)} SOL</strong>
    </div>
  `).join('');
  return `<div class="reason-box"><strong>Live transaction feed</strong><div class="tx-feed">${rows || '<div class="tx-row"><span class="muted">WAIT</span><span>Awaiting trade stream or DEX pair updates</span><strong>--</strong></div>'}</div></div>`;
}

function renderRiskConsole(config) {
  const profile = presetProfiles[riskPreset];
  const risk = config.risk;
  const display = [
    ['Score threshold', config.strictScoreThreshold, profile.threshold, 'points'],
    ['Max risk / trade', risk.maxRiskPerTradeSol, risk.maxRiskPerTradeSol * profile.risk, 'SOL'],
    ['Max position', risk.maxPositionSizeSol, risk.maxPositionSizeSol * profile.risk, 'SOL'],
    ['Slippage cap', risk.maxSlippagePct, Math.min(0.15, risk.maxSlippagePct * profile.risk), '%'],
    ['Daily loss stop', risk.maxDailyLossSol, risk.maxDailyLossSol * profile.risk, 'SOL']
  ];
  els.settings.innerHTML = display.map(([label, current, next, unit]) => `
    <div class="risk-setting">
      <label>${label}</label>
      <strong>${formatRiskValue(current, unit)} to ${formatRiskValue(next, unit)}</strong>
    </div>`).join('');
  els.riskImpact.innerHTML = `
    <div><small>Trade Frequency</small><strong>${profile.freq}</strong></div>
    <div><small>Drawdown Bias</small><strong>${profile.drawdown}</strong></div>
    <div><small>Mode</small><strong>${profile.label}</strong></div>`;
}

function formatRiskValue(value, unit) {
  if (unit === '%') return pct(value);
  if (unit === 'points') return Math.round(value);
  return `${fixed(value)} ${unit}`;
}

async function applyRiskPreset(name) {
  const profile = presetProfiles[name];
  if (!profile || !latestState) return;
  const risk = latestState.config.risk;
  const settings = {
    strictScoreThreshold: profile.threshold,
    maxRiskPerTradeSol: risk.maxRiskPerTradeSol * profile.risk,
    maxPositionSizeSol: risk.maxPositionSizeSol * profile.risk,
    maxSlippagePct: Math.min(0.15, risk.maxSlippagePct * profile.risk),
    maxDailyLossSol: risk.maxDailyLossSol * profile.risk
  };
  const result = await apiPost('/api/risk/settings', settings);
  if (!result.ok) {
    toast(result.error || 'Risk preset rejected');
    return;
  }
  toast(`Risk preset applied / ${profile.label}`);
  await refresh();
}

function renderAlerts(alerts) {
  els.alerts.innerHTML = alerts.slice(0, 8).map((a) => `
    <div class="alert"><strong class="${a.level === 'warning' ? 'yellow' : 'blue'}">WARNING / ${escapeHtml(a.title)}</strong><div class="muted">${escapeHtml(a.detail)}</div></div>
  `).join('') || '<div class="alert"><strong>INFO / Guard rails armed</strong><div class="muted">Risk engine is monitoring dev sells, whale concentration, liquidity, sell pressure, and momentum failure.</div></div>';
}

function renderBlocked(tokens) {
  const blocked = tokens.filter((t) => t.status === 'BLOCKED').slice(-8).reverse();
  els.blockedList.innerHTML = blocked.map((t) => `
    <div class="blocked-item"><strong class="red">BLOCKED / ${tokenName(t)} / score ${t.lastScore?.score || 0}</strong><div class="muted">${escapeHtml((t.blockReasons || [t.statusReason]).slice(0, 3).join(' | '))}</div></div>
  `).join('') || '';
}

function addEvent(event) {
  if (event.type === 'feed:status') setFeed(event.status);
  if (event.type === 'feed:sourceHealth') {
    if (event.source === 'SolanaRPC' && event.slot) setFeed(`RPC ${event.slot}`);
  }
  if (event.type === 'feed:migration') {
    eventMemory.unshift(eventCard('INFO', 'Migration alert', `${event.symbol || short(event.mint)} moving off curve`, 'Pump.fun migration signal observed', new Date().toLocaleTimeString()));
  }
  const rendered = eventHtml(event);
  if (!rendered) return;
  eventTotal += 1;
  eventMemory.unshift(rendered);
  if (eventMemory.length > 120) eventMemory.pop();
  els.eventCount.textContent = `${eventTotal} events`;
  els.events.innerHTML = eventMemory.join('');
  if (['trade:open', 'trade:partialExit', 'trade:close', 'feed:error'].includes(event.type)) {
    toast(rendered.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
  }
  refresh();
}

function eventHtml(event) {
  const time = new Date(event.at || Date.now()).toLocaleTimeString();
  if (event.type === 'token:blocked') return eventCard('BLOCKED', 'Risk block executed', `${tokenName(event.snapshot)} / score ${event.score.score}`, event.reasons.slice(0, 3).join(' | '), time);
  if (event.type === 'token:qualified') return eventCard('INFO', 'Setup qualified', `${tokenName(event.snapshot)} / score ${event.score.score}`, 'Strict scanner gates passed. Paper execution may engage.', time);
  if (event.type === 'trade:open') return eventCard('EXECUTED', 'Paper entry filled', `${tokenName(event.position)} / ${fixed(event.position.sizeSol)} SOL`, event.position.reasons.join(' | '), time);
  if (event.type === 'trade:partialExit') return eventCard('PROFIT', 'Profit secured', `${short(event.mint)} / ${pct(event.pct)} sold`, `${event.reason} / PnL ${fixed(event.pnlSol)} SOL`, time);
  if (event.type === 'trade:close') return eventCard(event.pnlSol >= 0 ? 'PROFIT' : 'WARNING', 'Position exited', `${short(event.mint)} / PnL ${fixed(event.pnlSol)} SOL`, `${event.reason} / entry ${event.entryScore} / exit ${event.exitScore ?? '--'}`, time);
  if (event.type === 'risk:emergencyStop') return eventCard(event.enabled ? 'CRITICAL' : 'INFO', 'Emergency stop', event.enabled ? 'New entries blocked' : 'New entries allowed', event.message, time);
  if (event.type === 'mode:changed') return eventCard('INFO', 'Mode changed', `${event.mode}${event.dryRun ? ' / dry run' : ''}`, event.liveReady ? 'Live broker ready' : 'Live broker not fully configured', time);
  if (event.type === 'feed:error') return eventCard('CRITICAL', 'Feed error', 'Data stream interruption', event.message, time);
  return '';
}

function eventCard(priority, title, line, detail, time) {
  return `<div class="event-card ${priority}"><strong>${priority} / ${escapeHtml(title)}</strong><div>${escapeHtml(line)}</div><div class="event-meta"><span>${time}</span><span>${escapeHtml(detail || '')}</span></div></div>`;
}

function drawChart(points, positions) {
  const canvas = els.pnlChart;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#071015';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#20323c';
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i += 1) {
    const y = 18 + i * ((h - 36) / 5);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  const livePoints = [...points];
  const unrealized = positions.reduce((t, p) => t + Number(p.unrealizedPnlSol || 0), 0);
  if (livePoints.length) livePoints.push({ at: Date.now(), equitySol: livePoints.at(-1).equitySol + unrealized });
  if (livePoints.length < 2) {
    drawPlaceholderCurve(ctx, w, h);
    return;
  }
  const values = livePoints.map((p) => p.equitySol);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const peak = Math.max(...values);
  const drawdown = peak ? (peak - values.at(-1)) / peak : 0;
  els.maxDrawdown.textContent = pct(drawdown);
  const span = Math.max(0.0001, max - min);
  ctx.fillStyle = 'rgba(255,81,102,0.08)';
  ctx.fillRect(0, h - 28 - drawdown * (h - 40), w, drawdown * (h - 40));
  ctx.strokeStyle = values.at(-1) >= values[0] ? '#27e7a2' : '#ff5166';
  ctx.lineWidth = 3;
  ctx.beginPath();
  livePoints.forEach((p, i) => {
    const x = (i / Math.max(1, livePoints.length - 1)) * w;
    const y = h - 18 - ((p.equitySol - min) / span) * (h - 36);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = '#2bd9ef';
  livePoints.slice(-8).forEach((p, i) => {
    const x = ((livePoints.length - 8 + i) / Math.max(1, livePoints.length - 1)) * w;
    const y = h - 18 - ((p.equitySol - min) / span) * (h - 36);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawPlaceholderCurve(ctx, w, h) {
  ctx.strokeStyle = '#27e7a2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 36; i += 1) {
    const x = (i / 35) * w;
    const y = h * 0.55 + Math.sin(i * 0.7) * 10 - i * 0.4;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function drawMiniChart(canvas, token) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (token.candles?.length) {
    drawCandles(ctx, token.candles, w, h);
    return;
  }
  ctx.strokeStyle = '#20323c';
  for (let i = 1; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, (h / 4) * i);
    ctx.lineTo(w, (h / 4) * i);
    ctx.stroke();
  }
  ctx.strokeStyle = token.status === 'BLOCKED' ? '#ff5166' : '#27e7a2';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const score = token.lastScore?.score || 35;
  for (let i = 0; i < 28; i += 1) {
    const x = (i / 27) * w;
    const y = h - 18 - (score / 100) * (h - 34) + Math.sin(i * 0.75 + token.ageMs / 8000) * 13;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(39,231,162,0.08)';
  ctx.fillRect(w * 0.58, 0, w * 0.18, h);
  ctx.fillStyle = 'rgba(255,81,102,0.08)';
  ctx.fillRect(0, h * 0.72, w, h * 0.28);
}

function drawCandles(ctx, candles, w, h) {
  const prices = candles.flatMap((c) => [c.high, c.low]).filter(Number.isFinite);
  const volumes = candles.map((c) => c.volumeSol || 0);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(0.0000001, max - min);
  const maxVol = Math.max(0.0001, ...volumes);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#071015';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#20323c';
  for (let i = 1; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, (h / 4) * i);
    ctx.lineTo(w, (h / 4) * i);
    ctx.stroke();
  }
  const step = w / Math.max(1, candles.length);
  candles.forEach((c, i) => {
    const x = i * step + step / 2;
    const yHigh = h * 0.72 - ((c.high - min) / span) * (h * 0.62);
    const yLow = h * 0.72 - ((c.low - min) / span) * (h * 0.62);
    const yOpen = h * 0.72 - ((c.open - min) / span) * (h * 0.62);
    const yClose = h * 0.72 - ((c.close - min) / span) * (h * 0.62);
    const green = c.close >= c.open;
    ctx.strokeStyle = green ? '#27e7a2' : '#ff5166';
    ctx.fillStyle = green ? 'rgba(39,231,162,0.95)' : 'rgba(255,81,102,0.95)';
    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();
    ctx.fillRect(x - Math.max(2, step * 0.26), Math.min(yOpen, yClose), Math.max(3, step * 0.52), Math.max(2, Math.abs(yClose - yOpen)));
    ctx.fillStyle = green ? 'rgba(39,231,162,0.28)' : 'rgba(255,81,102,0.26)';
    ctx.fillRect(x - Math.max(2, step * 0.25), h - 8 - (c.volumeSol / maxVol) * (h * 0.18), Math.max(2, step * 0.5), (c.volumeSol / maxVol) * (h * 0.18));
  });
  ctx.fillStyle = 'rgba(39,231,162,0.08)';
  ctx.fillRect(w * 0.56, 0, w * 0.18, h * 0.72);
  ctx.fillStyle = 'rgba(255,81,102,0.08)';
  ctx.fillRect(0, h * 0.62, w, h * 0.16);
}

function drawRowSparklines(tokens) {
  for (const token of tokens) {
    const canvas = document.querySelector(`[data-spark="${CSS.escape(token.mint)}"]`);
    if (!canvas) continue;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const points = (token.sparkline || []).map((p) => Number(p[1])).filter(Number.isFinite);
    if (points.length < 2) continue;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = Math.max(0.0000001, max - min);
    ctx.strokeStyle = points.at(-1) >= points[0] ? '#27e7a2' : '#ff5166';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((price, i) => {
      const x = (i / Math.max(1, points.length - 1)) * w;
      const y = h - 4 - ((price - min) / span) * (h - 8);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

function selectedToken(tokens) {
  return tokens.find((t) => t.mint === selectedMint);
}

function bestToken(tokens) {
  return [...tokens].sort((a, b) => (b.lastScore?.score || 0) - (a.lastScore?.score || 0))[0];
}

function compareTokens(a, b) {
  const av = sortValue(a, sortKey);
  const bv = sortValue(b, sortKey);
  let result = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
  if (result === 0 && sortKey !== 'ageMs') result = Number(a.ageMs || 0) - Number(b.ageMs || 0);
  return result * sortDir;
}

function sortValue(t, key) {
  if (key === 'score') return t.lastScore?.score || 0;
  if (key === 'symbol') return t.symbol || t.name || '';
  return Number(t[key] || 0);
}

function metric(label, value) {
  const v = clamp(Number(value || 0), 0, 100);
  return `<div class="metric-row"><label><span>${label}</span><strong class="${scoreClass(v, 80)}">${Math.round(v)}</strong></label><div class="bar"><span style="width:${v}%"></span></div></div>`;
}

function executionReason(token) {
  if (token.status === 'ENTERED') return 'Position entered after score, momentum, liquidity, and risk gates aligned.';
  if (token.status === 'BLOCKED') return `Trade blocked: ${(token.blockReasons || [token.statusReason]).slice(0, 3).join(' | ')}`;
  if ((token.lastScore?.score || 0) >= latestState.config.strictScoreThreshold) return 'Setup is qualified. Paper engine can enter if risk budget is available.';
  return 'Scanner is watching. Setup has not passed strict risk and confirmation gates.';
}

function setFeed(status) {
  els.feedStatus.className = 'health-dot online';
  els.networkLabel.textContent = status.toUpperCase();
  els.connectionHealth.textContent = `heartbeat ${new Date().toLocaleTimeString()}`;
}

function setFeedOffline(detail) {
  els.feedStatus.className = 'health-dot offline';
  els.networkLabel.textContent = 'OFFLINE';
  els.connectionHealth.textContent = detail || 'backend unavailable';
}

function toast(text) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = text;
  els.toastStack.prepend(node);
  while (els.toastStack.children.length > 3) els.toastStack.lastChild.remove();
  setTimeout(() => node.remove(), 4200);
}

async function copyText(text, message) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch {
    toast('Copy failed');
  }
}

function openUrl(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openExecutionModal(token, mode) {
  if (!token) return;
  const live = mode === 'live';
  const sizeSol = latestState.config.risk.maxPositionSizeSol;
  const slippage = latestState.config.risk.maxSlippagePct;
  const expectedTokens = token.price ? sizeSol / token.price : 0;
  const liveReady = isLiveReady();
  els.executionTitle.textContent = live ? 'Live Execution Ticket' : 'Paper Execution Ticket';
  els.executionSubtitle.textContent = `${tokenName(token)} / ${short(token.mint)} / ${live ? liveStatusText() : 'backend paper fill simulator'}`;
  els.executionBody.innerHTML = `
    <div class="risk-setting">
      <label>SOL amount</label><strong>${fixed(sizeSol)} SOL</strong>
      <small>Uses current backend max position setting.</small>
    </div>
    <div class="risk-setting">
      <label>Max slippage</label><strong>${pct(slippage)}</strong>
      <small>Change this in Risk settings before execution.</small>
    </div>
    <div class="execution-grid">
      <div><small>Route</small><strong>Pump.fun bonding curve</strong></div>
      <div><small>Max Cost</small><strong>${fixed(sizeSol)} SOL</strong></div>
      <div><small>Slippage Cap</small><strong>${pct(slippage)}</strong></div>
      <div><small>Expected Output</small><strong>${Math.round(expectedTokens).toLocaleString()} tokens</strong></div>
      <div><small>Est. Fee</small><strong>${fixed(sizeSol * 0.005)} SOL</strong></div>
      <div><small>Risk</small><strong class="${token.rugRiskScore > 55 ? 'yellow' : 'green'}">${Math.round(token.rugRiskScore || 0)} / 100</strong></div>
    </div>
    <div class="reason-box">
      <strong>${live ? 'Live broker status' : 'Paper execution realism'}</strong>
      <div>${live ? liveStatusText() : 'Paper mode submits to the backend paper broker. The fill is recorded with a backend paper execution ID, not a fake blockchain transaction.'}</div>
    </div>
    <div class="modal-actions">
      <button class="action-button profit" data-action="${live ? 'confirm-live-buy' : 'confirm-paper-buy'}" data-mint="${escapeAttr(token.mint)}">${live ? liveReady ? 'Confirm Live Buy' : 'Live Not Ready' : 'Confirm Paper Buy'}</button>
      <button class="action-button" data-action="cancel-execution">Cancel</button>
    </div>
    <div class="execution-steps">
      <div class="execution-step active" id="execStep1"><small>1 / Account</small><strong>${live ? walletSessionMode === 'live' ? 'Live wallet verified' : 'Connect a live wallet first' : 'Paper session / no wallet required'}</strong></div>
      <div class="execution-step" id="execStep2"><small>2 / Quote</small><strong>Building route and slippage envelope</strong></div>
      <div class="execution-step" id="execStep3"><small>3 / Backend</small><strong>${live ? liveStatusText() : 'Waiting for backend paper confirmation'}</strong></div>
      <div class="execution-step" id="execStep4"><small>4 / Confirmation</small><strong class="signature">--</strong></div>
    </div>`;
  els.executionModal.classList.remove('hidden');
  setTimeout(() => markStep('execStep2', 'done'), 450);
  setTimeout(() => markStep('execStep3', live ? 'active' : 'active'), 980);
  setTimeout(() => {
    const step = q('#execStep4');
    step.classList.add('active');
    step.querySelector('strong').textContent = live ? liveReady ? 'Ready for backend live broker' : liveStatusText() : 'Ready for backend paper execution';
    if (!live) {
      addWalletActivity('Paper ticket prepared', `${tokenName(token)} / ${fixed(sizeSol)} SOL / backend confirmation required`);
    }
  }, 1500);
}

function isLiveReady() {
  const live = latestState?.config?.live || {};
  return latestState?.config?.mode === 'live' && live.enabled && live.tradeApiConfigured;
}

function liveButtonLabel() {
  const live = latestState?.config?.live || {};
  if (latestState?.config?.mode !== 'live') return 'Live Off';
  if (!live.enabled || !live.tradeApiConfigured) return 'Live Setup';
  return live.dryRun ? 'Live Dry Run' : 'Live Buy';
}

function liveButtonClass() {
  return isLiveReady() ? 'buy-live ready' : 'buy-live';
}

function liveStatusText() {
  const live = latestState?.config?.live || {};
  if (latestState?.config?.mode !== 'live') return 'Set MODE=live to use live broker.';
  if (!live.enabled) return 'Set LIVE_TRADING_ENABLED=true to arm live broker.';
  if (!live.tradeApiConfigured) return 'Add LIVE_TRADE_API_URL and LIVE_TRADE_API_KEY.';
  if (live.dryRun) return 'Live dry-run is enabled. Provider receives dry-run orders only.';
  return 'Live broker configured. Real broadcast depends on your provider.';
}

async function confirmPaperBuy(mint) {
  const token = selectedToken(latestState?.watchedTokens || []);
  const sizeSol = latestState.config.risk.maxPositionSizeSol;
  if (!walletConnected || walletSessionMode !== 'paper') startPaperSession();
  markStep('execStep3', 'active');
  const result = await apiPost('/api/paper/buy', { mint, sizeSol });
  if (!result.ok) {
    toast(result.error || 'Paper buy blocked');
    const step = q('#execStep4');
    if (step) step.querySelector('strong').textContent = result.error || 'Blocked by backend risk engine';
    return;
  }
  swapCount += 1;
  markStep('execStep3', 'done');
  markStep('execStep4', 'done');
  const executionId = result.execution?.id || 'paper-fill';
  const step = q('#execStep4');
  if (step) step.querySelector('strong').textContent = `${executionId} / backend filled`;
  if (token) addWalletActivity('Paper buy filled', `${tokenName(token)} / ${fixed(sizeSol)} SOL / ${executionId}`);
  toast('Paper buy filled');
  await refresh();
}

async function confirmLiveBuy(mint) {
  if (!isLiveReady()) {
    toast(liveStatusText());
    const step = q('#execStep4');
    if (step) step.querySelector('strong').textContent = liveStatusText();
    return;
  }
  if (!walletConnected || walletSessionMode !== 'live' || !walletAddress) {
    toast('Connect a live wallet first');
    openWalletChooser();
    return;
  }
  const token = selectedToken(latestState?.watchedTokens || []);
  const sizeSol = latestState.config.risk.maxPositionSizeSol;
  markStep('execStep3', 'active');
  const result = await apiPost('/api/live/buy', { mint, sizeSol, walletAddress });
  if (!result.ok) {
    toast(result.error || 'Live buy blocked');
    const step = q('#execStep4');
    if (step) step.querySelector('strong').textContent = result.error || 'Blocked by backend live broker';
    return;
  }
  swapCount += 1;
  markStep('execStep3', 'done');
  markStep('execStep4', 'done');
  const executionId = result.execution?.txSignature || result.execution?.id || 'live-fill';
  const step = q('#execStep4');
  if (step) step.querySelector('strong').textContent = `${executionId} / ${result.dryRun ? 'dry run' : 'sent'}`;
  if (token) addWalletActivity(result.dryRun ? 'Live dry-run buy' : 'Live buy sent', `${tokenName(token)} / ${fixed(sizeSol)} SOL / ${executionId}`);
  toast(result.dryRun ? 'Live dry-run completed' : 'Live buy sent');
  await refresh();
}

async function paperSell(mint, pct = 1, reason = 'manual paper sell') {
  const result = await apiPost('/api/paper/sell', { mint, pct, reason });
  if (!result.ok) {
    toast(result.error || 'Paper sell blocked');
    return;
  }
  toast(pct >= 1 ? 'Paper sell filled' : 'Paper partial sell filled');
  await refresh();
}

async function liveSell(mint, pct = 1, reason = 'manual live sell') {
  if (!isLiveReady()) {
    toast(liveStatusText());
    return;
  }
  if (!walletConnected || walletSessionMode !== 'live' || !walletAddress) {
    toast('Connect a live wallet first');
    openWalletChooser();
    return;
  }
  const result = await apiPost('/api/live/sell', { mint, pct, reason, walletAddress });
  if (!result.ok) {
    toast(result.error || 'Live sell blocked');
    return;
  }
  toast(result.dryRun ? 'Live dry-run sell completed' : 'Live sell sent');
  await refresh();
}

async function apiPost(url, body) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = await response.json().catch(() => ({}));
    return response.ok ? payload : { ok: false, error: payload.error || `${url} failed with ${response.status}` };
  } catch (error) {
    return { ok: false, error: error.message || 'backend unavailable' };
  }
}

function markStep(id, state) {
  const step = q(`#${id}`);
  if (!step) return;
  step.classList.remove('active');
  step.classList.add(state);
}

function addWalletActivity(title, detail) {
  const row = document.createElement('div');
  const small = document.createElement('small');
  small.textContent = title;
  const strong = document.createElement('strong');
  strong.textContent = detail;
  row.append(small, strong);
  els.walletActivity.prepend(row);
  while (els.walletActivity.children.length > 8) els.walletActivity.lastChild.remove();
}

function healthScore(state) {
  if (!state.watchedTokens.length) return '--';
  const open = state.openPositions.length;
  const blocked = state.stats.blocked || 0;
  const score = Math.max(72, Math.min(99, 92 - open * 3 + Math.min(6, blocked / 18)));
  return Math.round(score);
}

function q(selector) { return document.querySelector(selector); }
function fixed(n) { return Number(n || 0).toFixed(4); }
function signed(n) { const value = Number(n || 0); return `${value >= 0 ? '+' : ''}${fixed(value)}`; }
function pct(n) { return `${Math.round(Number(n || 0) * 100)}%`; }
function signedPct(n) { const value = Number(n || 0); return `${value >= 0 ? '+' : ''}${pct(value)}`; }
function ratio(n) { return Number(n || 0) > 50 ? '50+' : Number(n || 0).toFixed(1); }
function age(ms) { return `${Math.max(0, Math.round(Number(ms || 0) / 1000))}s`; }
function short(value = '') { return value ? `${String(value).slice(0, 5)}...${String(value).slice(-4)}` : '--'; }
function tokenName(t) { return escapeHtml(t.symbol || t.name || short(t.mint)); }
function tokenIcon(t) {
  const src = safeImageUrl(t.icon);
  if (src) return `<img src="${escapeAttr(src)}" alt="" style="width:18px;height:18px;border-radius:50%;vertical-align:-4px;margin-right:6px;">`;
  return '';
}
function safeImageUrl(value = '') {
  const src = String(value || '').trim();
  if (!src) return '';
  if (/^https?:\/\//i.test(src)) return src;
  if (/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(src)) return src;
  return '';
}
function scoreClass(score, threshold) {
  const value = Number(score || 0);
  if (value >= threshold) return 'score-hot';
  if (value >= threshold - 15) return 'score-mid';
  return 'score-low';
}
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
}
function escapeAttr(value = '') { return escapeHtml(value).replace(/`/g, '&#096;'); }
function safeClass(value = '') { return String(value).replace(/[^a-zA-Z0-9_-]/g, ''); }

function currentMode() {
  return latestState?.config?.mode || 'paper';
}

function renderWalletPrompt(config = {}) {
  if (walletConnected) return;
  const mode = config.mode || 'paper';
  els.walletButton.classList.remove('connected');
  els.walletLabel.textContent = mode === 'live' ? 'Connect Live Wallet' : 'Start Paper';
  els.walletMeta.textContent = mode === 'live' ? liveStatusText() : 'No wallet needed';
  els.walletBalance.textContent = mode === 'live' ? 'wallet required' : 'paper';
  els.walletMenuAddress.textContent = 'Not connected';
  els.walletMode.textContent = mode === 'live' ? 'Live Mode' : 'Paper Mode';
}

function resetWalletSession() {
  walletConnected = false;
  walletAddress = '';
  walletSessionMode = '';
  els.walletButton.classList.remove('connected');
  els.walletMenu.classList.add('hidden');
  els.walletConnectModal.classList.add('hidden');
  els.walletMenuAddress.textContent = 'Not connected';
  els.walletMenuSol.textContent = '--';
  els.walletMenuEquity.textContent = '--';
  els.walletMenuHoldings.textContent = '0';
  els.walletMenuSwaps.textContent = '0';
  renderWalletPrompt(latestState?.config || {});
}

function startPaperSession() {
  walletConnected = true;
  walletAddress = '';
  walletSessionMode = 'paper';
  els.walletButton.classList.add('connected');
  els.walletLabel.textContent = 'Paper Session';
  els.walletMeta.textContent = 'Paper session active';
  els.walletBalance.textContent = 'paper';
  els.walletMenuAddress.textContent = 'Paper session / no wallet';
  els.walletMode.textContent = 'Paper Session';
  els.walletMenuSol.textContent = 'Paper only';
  addWalletActivity('Paper session started', 'No wallet popup and no real funds at risk');
  toast('Paper session started');
}

function solanaWalletProviders() {
  const providers = [];
  const seen = new Set();
  const add = (id, name, provider, detected) => {
    if (!provider || seen.has(id)) return;
    seen.add(id);
    providers.push({ id, name, provider, detected: Boolean(detected) });
  };
  add('phantom', 'Phantom', window.phantom?.solana, Boolean(window.phantom?.solana?.isPhantom));
  add('solflare', 'Solflare', window.solflare, Boolean(window.solflare?.isSolflare));
  add('safepal', 'SafePal', window.safepal?.solana || (window.solana?.isSafePal ? window.solana : null), Boolean(window.safepal?.solana || window.solana?.isSafePal));
  add('backpack', 'Backpack', window.backpack?.solana || (window.solana?.isBackpack ? window.solana : null), Boolean(window.backpack?.solana || window.solana?.isBackpack));
  if (window.solana && !providers.some((item) => item.provider === window.solana)) {
    const name = window.solana.isPhantom ? 'Phantom' : window.solana.isSolflare ? 'Solflare' : window.solana.isSafePal ? 'SafePal' : 'Injected Solana Wallet';
    add('injected', name, window.solana, true);
  }
  return providers.filter((item) => item.provider?.connect);
}

function renderWalletProviderList() {
  const providers = solanaWalletProviders();
  els.walletProviderList.innerHTML = '';
  if (!providers.length) {
    const empty = document.createElement('div');
    empty.className = 'wallet-provider-empty';
    empty.textContent = 'No Solana wallet detected in this browser. Install Phantom/Solflare/SafePal or open this page inside a mobile wallet browser.';
    els.walletProviderList.append(empty);
    return;
  }
  for (const item of providers) {
    const button = document.createElement('button');
    button.className = 'wallet-provider';
    button.dataset.walletProvider = item.id;
    const strong = document.createElement('strong');
    strong.textContent = item.name;
    const small = document.createElement('small');
    small.textContent = item.detected ? 'Detected in this browser' : 'Available provider';
    button.append(strong, small);
    els.walletProviderList.append(button);
  }
}

function openWalletChooser() {
  renderWalletProviderList();
  els.walletConnectModal.classList.remove('hidden');
}

function walletProviderById(id) {
  return solanaWalletProviders().find((item) => item.id === id);
}

async function connectLiveWallet(providerInfo) {
  if (!providerInfo?.provider?.connect) return toast('Wallet provider unavailable');
  try {
    els.walletConnectModal.classList.add('hidden');
    toast(`Opening ${providerInfo.name}`);
    els.walletMeta.textContent = `Awaiting ${providerInfo.name} approval...`;
    const response = await providerInfo.provider.connect();
    walletAddress = String(response.publicKey || providerInfo.provider.publicKey || '');
    if (!walletAddress) throw new Error('wallet address unavailable');
    walletConnected = true;
    walletSessionMode = 'live';
    els.walletButton.classList.add('connected');
    els.walletLabel.textContent = short(walletAddress);
    els.walletMeta.textContent = `${providerInfo.name} connected`;
    els.walletBalance.textContent = 'balance not loaded';
    els.walletMenuAddress.textContent = walletAddress;
    els.walletMode.textContent = 'Live Wallet';
    els.walletMenuSol.textContent = 'Not loaded';
    addWalletActivity(`${providerInfo.name} connected`, short(walletAddress));
    toast('Live wallet connected');
  } catch (error) {
    els.walletMeta.textContent = 'Wallet connection rejected';
    toast(error.message || 'Wallet connection failed');
  }
}

els.walletButton.addEventListener('click', async () => {
  if (walletConnected) {
    els.walletMenu.classList.toggle('hidden');
    return;
  }
  if (currentMode() === 'paper') return startPaperSession();
  openWalletChooser();
});

els.copyWallet.addEventListener('click', (event) => {
  event.stopPropagation();
  if (!walletAddress) return toast('No live wallet address to copy');
  copyText(walletAddress, 'Wallet copied');
});

els.openWalletSolscan.addEventListener('click', (event) => {
  event.stopPropagation();
  if (!walletAddress) return toast('No wallet connected');
  openUrl(`https://solscan.io/account/${encodeURIComponent(walletAddress)}`);
});

els.disconnectWallet.addEventListener('click', () => {
  addWalletActivity(walletSessionMode === 'live' ? 'Wallet disconnected' : 'Paper session ended', walletSessionMode || 'session');
  resetWalletSession();
});

els.closeWalletConnect.addEventListener('click', () => els.walletConnectModal.classList.add('hidden'));
els.walletConnectModal.addEventListener('click', (event) => {
  if (event.target === els.walletConnectModal) els.walletConnectModal.classList.add('hidden');
});
els.walletProviderList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-wallet-provider]');
  if (!button) return;
  connectLiveWallet(walletProviderById(button.dataset.walletProvider));
});

els.emergencyButton.addEventListener('click', async () => {
  const active = !(latestState?.config?.emergencyStop);
  const result = await apiPost('/api/emergency-stop', { active });
  if (!result.ok) return toast(result.error || 'Emergency stop failed');
  toast(result.emergencyStop ? 'Emergency stop enabled' : 'Emergency stop cleared');
  await refresh();
});

els.tokenSearch.addEventListener('input', () => latestState && renderScanner(latestState.watchedTokens || []));
els.statusFilter.addEventListener('change', () => latestState && renderScanner(latestState.watchedTokens || []));
document.querySelectorAll('.scanner-table th[data-sort]').forEach((th) => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (sortKey === key) sortDir *= -1;
    else {
      sortKey = key;
      sortDir = key === 'symbol' || key === 'status' || key === 'ageMs' ? 1 : -1;
    }
    latestState && renderScanner(latestState.watchedTokens || []);
  });
});

document.body.addEventListener('click', (event) => {
  const row = event.target.closest('tr[data-mint]');
  const button = event.target.closest('button[data-action]');
  if (button) {
    const mint = button.dataset.mint;
    selectedMint = mint || selectedMint;
    const token = selectedToken(latestState?.watchedTokens || []);
    renderTokenDetail(token);
    const action = button.dataset.action;
    const label = token ? tokenName(token) : short(mint);
    if (action === 'copy-mint') copyText(mint, 'Mint copied');
    else if (action === 'copy-dev') copyText(button.dataset.wallet || '', 'Dev wallet copied');
    else if (action === 'open-pump') openUrl(`https://pump.fun/${encodeURIComponent(mint)}`);
    else if (action === 'open-dex') openUrl(`https://dexscreener.com/solana/${encodeURIComponent(mint)}`);
    else if (action === 'open-solscan') openUrl(`https://solscan.io/token/${encodeURIComponent(mint)}`);
    else if (action === 'analyze') {
      document.querySelector('.analysis-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    else if (action === 'live-buy') openExecutionModal(token, 'live');
    else if (action === 'paper-buy') openExecutionModal(token, 'paper');
    else if (action === 'confirm-paper-buy') confirmPaperBuy(mint);
    else if (action === 'confirm-live-buy') confirmLiveBuy(mint);
    else if (action === 'cancel-execution') els.executionModal.classList.add('hidden');
    else if (action === 'live-disabled') toast('Live trading is disabled until a secure backend broker is implemented');
    else if (action === 'close' || action === 'emergency-exit') latestState?.config?.mode === 'live' ? liveSell(mint, 1, action === 'emergency-exit' ? 'manual emergency live exit' : 'manual live sell') : paperSell(mint, 1, action === 'emergency-exit' ? 'manual emergency paper exit' : 'manual paper sell');
    else if (action === 'partial-close') latestState?.config?.mode === 'live' ? liveSell(mint, 0.5, 'manual live partial sell') : paperSell(mint, 0.5, 'manual paper partial sell');
    else if (action === 'protect') latestState?.config?.mode === 'live' ? liveSell(mint, 0.25, 'manual protect profit live sell') : paperSell(mint, 0.25, 'manual protect profit paper sell');
    else if (action === 'block-reason') toast((token?.blockReasons || [token?.statusReason || 'No block reason.']).slice(0, 2).join(' | '));
    else toast(`${action.replace('-', ' ')} / ${label}`);
    latestState && renderScanner(latestState.watchedTokens || []);
    return;
  }
  if (row) {
    selectedMint = row.dataset.mint;
    renderScanner(latestState?.watchedTokens || []);
    renderTokenDetail(selectedToken(latestState?.watchedTokens || []));
  }
  const alpha = event.target.closest('.alpha-card[data-mint]');
  if (alpha) {
    selectedMint = alpha.dataset.mint;
    renderScanner(latestState?.watchedTokens || []);
    renderTokenDetail(selectedToken(latestState?.watchedTokens || []));
  }
});

document.addEventListener('pointerdown', (event) => {
  if (!els.walletMenu.classList.contains('hidden') && !els.walletMenu.contains(event.target) && !els.walletButton.contains(event.target)) {
    els.walletMenu.classList.add('hidden');
  }
}, true);

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    els.walletMenu.classList.add('hidden');
    els.walletConnectModal.classList.add('hidden');
    els.executionModal.classList.add('hidden');
  }
});

els.closeExecution.addEventListener('click', () => els.executionModal.classList.add('hidden'));
els.executionModal.addEventListener('click', (event) => {
  if (event.target === els.executionModal) els.executionModal.classList.add('hidden');
});

els.riskPresets.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-preset]');
  if (!button) return;
  riskPreset = button.dataset.preset;
  [...els.riskPresets.querySelectorAll('button')].forEach((b) => b.classList.toggle('active', b === button));
  latestState && renderRiskConsole(latestState.config);
  applyRiskPreset(riskPreset);
});

els.appTabs.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-page]');
  if (!button) return;
  activePage = button.dataset.page;
  renderPage();
});

els.modeSwitch.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-mode-option]');
  if (!button) return;
  const mode = button.dataset.modeOption;
  const result = await apiPost('/api/mode', { mode });
  if (!result.ok) return toast(result.error || 'Mode switch failed');
  resetWalletSession();
  if (mode === 'live') {
    toast(result.live?.dryRun ? 'Live dry-run mode active' : 'Live mode active');
  } else {
    toast('Paper mode active');
  }
  await refresh();
});

document.querySelectorAll('[data-chart]').forEach((button) => {
  button.addEventListener('click', () => {
    chartMode = button.dataset.chart;
    document.querySelectorAll('[data-chart]').forEach((b) => b.classList.toggle('active', b === button));
    latestState && drawChart(latestState.portfolio?.equityCurve || [], latestState.openPositions || []);
  });
});

const source = new EventSource('/stream');
source.onopen = () => {
  if (latestState) setFeed(latestState.config.dataMode === 'mock' ? 'mock-live' : 'connected');
};
source.onmessage = (message) => {
  try {
    addEvent(JSON.parse(message.data));
  } catch (error) {
    setFeedOffline(`bad stream event: ${error.message}`);
  }
};
source.onerror = () => {
  setFeedOffline('event stream reconnecting');
};
refresh();
setInterval(refresh, 1600);
