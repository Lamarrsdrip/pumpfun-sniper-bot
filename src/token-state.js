import { safeRatio, sum } from './math.js';

export class TokenState {
  constructor(token) {
    this.mint = token.mint || token.ca || token.token || token.address;
    this.name = cleanTokenText(token.name, '');
    this.symbol = cleanTokenText(token.symbol, '');
    this.uri = token.uri || token.metadataUri || '';
    this.icon = token.icon || '';
    this.source = token.source || 'unknown';
    this.createdAt = Number(token.createdAt || token.timestamp || Date.now());
    this.devWallet = token.devWallet || token.traderPublicKey || token.creator || '';
    this.launchMarketCapSol = Number(token.marketCapSol || token.vSolInBondingCurve || 0);
    this.firstPrice = Number(token.priceSol || token.price || token.marketCapSol || 0);
    this.lastPrice = this.firstPrice;
    this.highPrice = this.firstPrice;
    this.lowPrice = this.firstPrice || Number.POSITIVE_INFINITY;
    this.marketCapSol = this.launchMarketCapSol;
    this.liquiditySol = Number(token.liquiditySol || token.vSolInBondingCurve || 0);
    this.bondingCurveProgress = Number(token.bondingCurveProgress || token.progress || 0);
    this.trades = [];
    this.priceHistory = [];
    this.buyVolumeSol = 0;
    this.sellVolumeSol = 0;
    this.buyCount = 0;
    this.sellCount = 0;
    this.walletBuys = new Map();
    this.walletSells = new Map();
    this.holders = new Map();
    this.devSoldSol = 0;
    this.devBoughtSol = 0;
    this.externalHolderStats = null;
    this.externalDevActivity = null;
    this.status = 'WATCHING';
    this.statusReason = 'new launch detected';
    this.lastScore = null;
    this.blockReasons = [];
    this.lastTradeAt = this.createdAt;
    this.social = {
      twitter: token.twitter || '',
      telegram: token.telegram || '',
      website: token.website || ''
    };
    if (this.lastPrice > 0) this.priceHistory.push({ at: this.createdAt, price: this.lastPrice, volumeSol: 0, side: 'launch' });
  }

  ingestTrade(raw) {
    const side = normalizeSide(raw);
    const wallet = raw.traderPublicKey || raw.wallet || raw.account || raw.user || '';
    const solAmount = Number(raw.solAmount || raw.amountSol || raw.vSol || raw.quoteAmount || 0);
    const tokenAmount = Number(raw.tokenAmount || raw.amountTokens || raw.baseAmount || 0);
    const price = Number(raw.priceSol || raw.price || safeRatio(solAmount, tokenAmount, this.lastPrice));
    const marketCapSol = Number(raw.marketCapSol || raw.marketCap || 0);
    const timestamp = Number(raw.timestamp || raw.createdAt || Date.now());

    if (Number.isFinite(price) && price > 0) {
      if (this.firstPrice > 1 && price < 1) {
        this.firstPrice = price;
        this.lowPrice = price;
      }
      this.lastPrice = price;
      this.highPrice = Math.max(this.highPrice || price, price);
      this.lowPrice = Math.min(this.lowPrice, price);
      this.priceHistory.push({ at: timestamp, price, volumeSol: solAmount, side });
      if (this.priceHistory.length > 180) this.priceHistory.shift();
    }
    if (marketCapSol > 0) this.marketCapSol = marketCapSol;
    if (Number.isFinite(raw.liquiditySol)) this.liquiditySol = Number(raw.liquiditySol);
    if (Number.isFinite(raw.bondingCurveProgress)) this.bondingCurveProgress = Number(raw.bondingCurveProgress);
    if (Number.isFinite(raw.progress)) this.bondingCurveProgress = Number(raw.progress);

    this.trades.push({ side, wallet, solAmount, tokenAmount, price: this.lastPrice, timestamp });
    if (this.trades.length > 500) this.trades.shift();
    this.lastTradeAt = timestamp;

    if (side === 'buy') {
      this.buyVolumeSol += solAmount;
      this.buyCount += 1;
      this.walletBuys.set(wallet, (this.walletBuys.get(wallet) || 0) + solAmount);
      this.holders.set(wallet, (this.holders.get(wallet) || 0) + tokenAmount);
      if (wallet && wallet === this.devWallet) this.devBoughtSol += solAmount;
    } else if (side === 'sell') {
      this.sellVolumeSol += solAmount;
      this.sellCount += 1;
      this.walletSells.set(wallet, (this.walletSells.get(wallet) || 0) + solAmount);
      this.holders.set(wallet, Math.max(0, (this.holders.get(wallet) || 0) - tokenAmount));
      if (wallet && wallet === this.devWallet) this.devSoldSol += solAmount;
    }
  }

  ingestMarketSnapshot(raw) {
    const timestamp = Number(raw.timestamp || Date.now());
    const price = Number(raw.priceSol || raw.price || this.lastPrice || this.firstPrice || 0);
    const marketCapSol = Number(raw.marketCapSol || raw.marketCap || this.marketCapSol || 0);
    const liquiditySol = Number(raw.liquiditySol || this.liquiditySol || 0);
    const volumeSol = Number(raw.volumeSol || raw.volume24hSol || 0);
    const buys = Number(raw.buys || 0);
    const sells = Number(raw.sells || 0);
    const holders = Number(raw.holders || raw.holderCount || 0);
    const name = cleanTokenText(raw.name, this.name);
    const symbol = cleanTokenText(raw.symbol, this.symbol);
    if (name) this.name = name;
    if (symbol) this.symbol = symbol;

    if (price > 0) {
      this.lastPrice = price;
      this.highPrice = Math.max(this.highPrice || price, price);
      this.lowPrice = Math.min(this.lowPrice, price);
      this.priceHistory.push({ at: timestamp, price, volumeSol, side: buys >= sells ? 'buy' : 'sell' });
      if (this.priceHistory.length > 180) this.priceHistory.shift();
    }
    if (marketCapSol > 0) this.marketCapSol = marketCapSol;
    if (liquiditySol > 0) this.liquiditySol = liquiditySol;
    if (Number.isFinite(raw.bondingCurveProgress)) this.bondingCurveProgress = Number(raw.bondingCurveProgress);
    if (Number.isFinite(raw.topHolderPct) || Number.isFinite(raw.top5HolderPct) || Array.isArray(raw.holderDistribution)) {
      this.externalHolderStats = {
        source: raw.holderSource || raw.source || 'holder-enrichment',
        holderCount: Number.isFinite(raw.holderCount) ? Number(raw.holderCount) : this.externalHolderStats?.holderCount,
        topHolderPct: Number.isFinite(raw.topHolderPct) ? Number(raw.topHolderPct) : this.externalHolderStats?.topHolderPct,
        top5HolderPct: Number.isFinite(raw.top5HolderPct) ? Number(raw.top5HolderPct) : this.externalHolderStats?.top5HolderPct,
        holderDistribution: Array.isArray(raw.holderDistribution) ? raw.holderDistribution : this.externalHolderStats?.holderDistribution
      };
    }
    if (raw.devActivity) this.externalDevActivity = raw.devActivity;
    if (holders > this.holders.size) {
      for (let i = this.holders.size; i < holders; i += 1) {
        this.holders.set(`real-holder-${i}`, 1);
      }
    }
    const buyDelta = Math.max(0, buys - this.buyCount);
    const sellDelta = Math.max(0, sells - this.sellCount);
    if (buyDelta || sellDelta || volumeSol) {
      const avgTrade = volumeSol > 0 ? Math.max(0.01, volumeSol / Math.max(1, buyDelta + sellDelta)) : 0.02;
      for (let i = 0; i < buyDelta; i += 1) {
        this.ingestTrade({ txType: 'buy', traderPublicKey: raw.wallet || `dex-buy-${timestamp}-${i}`, solAmount: avgTrade, tokenAmount: price > 0 ? avgTrade / price : 0, priceSol: price, marketCapSol, liquiditySol, timestamp: timestamp - i });
      }
      for (let i = 0; i < sellDelta; i += 1) {
        this.ingestTrade({ txType: 'sell', traderPublicKey: raw.wallet || `dex-sell-${timestamp}-${i}`, solAmount: avgTrade, tokenAmount: price > 0 ? avgTrade / price : 0, priceSol: price, marketCapSol, liquiditySol, timestamp: timestamp - i });
      }
      if (!buyDelta && !sellDelta) this.lastTradeAt = timestamp;
    }
  }

  snapshot(at = Date.now()) {
    const holderBalances = [...this.holders.values()].filter((value) => value > 0).sort((a, b) => b - a);
    const totalHeld = sum(holderBalances);
    const topHolderPct = this.externalHolderStats?.topHolderPct ?? (totalHeld > 0 ? holderBalances[0] / totalHeld : 0);
    const top5HolderPct = this.externalHolderStats?.top5HolderPct ?? (totalHeld > 0 ? sum(holderBalances.slice(0, 5)) / totalHeld : 0);
    const uniqueBuyers = [...this.walletBuys.keys()].filter(Boolean).length;
    const uniqueSellers = [...this.walletSells.keys()].filter(Boolean).length;
    const insiderWalletPct = estimateInsiderPct(this.walletBuys);
    const recent = this.recentTrades(15000, at);
    const prior = this.trades.filter((trade) => trade.timestamp < at - 15000 && trade.timestamp >= at - 45000);
    const recentVolume = sum(recent.map((trade) => trade.solAmount));
    const priorVolume = sum(prior.map((trade) => trade.solAmount));
    const buySellRatio = safeRatio(this.buyVolumeSol, this.sellVolumeSol || 0.000001, this.buyVolumeSol > 0 ? 99 : 0);
    const recentBuyVolume = sum(recent.filter((trade) => trade.side === 'buy').map((trade) => trade.solAmount));
    const recentSellVolume = sum(recent.filter((trade) => trade.side === 'sell').map((trade) => trade.solAmount));

    return {
      mint: this.mint,
      name: this.name,
      symbol: this.symbol,
      createdAt: this.createdAt,
      ageMs: at - this.createdAt,
      devWallet: this.devWallet,
      marketCapSol: this.marketCapSol,
      liquiditySol: this.liquiditySol,
      bondingCurveProgress: this.bondingCurveProgress,
      tradeCount: this.trades.length,
      buyCount: this.buyCount,
      sellCount: this.sellCount,
      buyVolumeSol: this.buyVolumeSol,
      sellVolumeSol: this.sellVolumeSol,
      buySellRatio,
      recentBuySellRatio: safeRatio(recentBuyVolume, recentSellVolume || 0.000001, recentBuyVolume > 0 ? 99 : 0),
      uniqueBuyers,
      uniqueSellers,
      holderCount: this.externalHolderStats?.holderCount ?? holderBalances.length,
      topHolderPct,
      top5HolderPct,
      insiderWalletPct,
      devSoldPct: safeRatio(this.devSoldSol, this.devBoughtSol + this.buyVolumeSol, 0),
      price: this.lastPrice || this.marketCapSol,
      priceFromLaunchPct: this.firstPrice > 0 ? (this.lastPrice - this.firstPrice) / this.firstPrice : 0,
      drawdownFromHighPct: this.highPrice > 0 ? (this.highPrice - this.lastPrice) / this.highPrice : 0,
      volumeSpike: safeRatio(recentVolume, priorVolume || 0.000001, recentVolume > 0 ? 99 : 0),
      recentVolumeSol: recentVolume,
      sparkline: this.priceHistory.slice(-42).map((point) => [point.at, point.price, point.volumeSol, point.side]),
      candles: buildCandles(this.priceHistory, 5000).slice(-32),
      recentTrades: this.trades.slice(-18).map((trade) => ({
        side: trade.side,
        wallet: trade.wallet,
        solAmount: trade.solAmount,
        price: trade.price,
        timestamp: trade.timestamp
      })),
      holderDistribution: this.externalHolderStats?.holderDistribution ?? holderBalances.slice(0, 8).map((balance, index) => ({
        rank: index + 1,
        pct: totalHeld > 0 ? balance / totalHeld : 0
      })),
      liquidityQuality: estimateLiquidityQuality(this),
      fakeVolumeScore: estimateFakeVolumeScore(this),
      momentumScore: estimateMomentumScore(this, recentBuyVolume, recentSellVolume),
      rugRiskScore: estimateRugRiskScore(this, topHolderPct, top5HolderPct, insiderWalletPct),
      status: this.status,
      statusReason: this.statusReason,
      lastScore: this.lastScore,
      blockReasons: this.blockReasons,
      lastTradeAgeMs: at - this.lastTradeAt,
      social: this.social,
      icon: this.icon,
      source: this.source,
      holderSource: this.externalHolderStats?.source || '',
      devActivity: this.externalDevActivity,
      raw: this
    };
  }

  recentTrades(windowMs, at = Date.now()) {
    return this.trades.filter((trade) => trade.timestamp >= at - windowMs);
  }
}

function cleanTokenText(value, fallback = '') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  if (looksLikeMint(text)) return fallback;
  return text.slice(0, 64);
}

function looksLikeMint(text) {
  const compact = text.replace(/\s+/g, '');
  return compact.length >= 32 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(compact);
}

function buildCandles(history, bucketMs) {
  const buckets = new Map();
  for (const point of history) {
    const bucket = Math.floor(point.at / bucketMs) * bucketMs;
    if (!buckets.has(bucket)) {
      buckets.set(bucket, {
        at: bucket,
        open: point.price,
        high: point.price,
        low: point.price,
        close: point.price,
        volumeSol: 0
      });
    }
    const candle = buckets.get(bucket);
    candle.high = Math.max(candle.high, point.price);
    candle.low = Math.min(candle.low, point.price);
    candle.close = point.price;
    candle.volumeSol += point.volumeSol || 0;
  }
  return [...buckets.values()].sort((a, b) => a.at - b.at);
}

function estimateLiquidityQuality(token) {
  const liquidity = Number(token.liquiditySol || 0);
  const marketCap = Number(token.marketCapSol || 0);
  if (liquidity <= 0 || marketCap <= 0) return 25;
  const ratio = Math.min(1, liquidity / Math.max(1, marketCap * 0.18));
  const curveBonus = Math.min(1, Number(token.bondingCurveProgress || 0) / 0.4);
  return Math.round(Math.max(0, Math.min(100, ratio * 72 + curveBonus * 28)));
}

function estimateFakeVolumeScore(token) {
  const totalVolume = token.buyVolumeSol + token.sellVolumeSol;
  const uniqueWallets = new Set([...token.walletBuys.keys(), ...token.walletSells.keys()].filter(Boolean)).size;
  if (totalVolume <= 0) return 0;
  const repeatTradePenalty = Math.max(0, token.trades.length - uniqueWallets) * 4;
  const concentration = estimateInsiderPct(token.walletBuys) * 70;
  const tinyHolderPenalty = uniqueWallets < 5 && totalVolume > 1 ? 28 : 0;
  return Math.round(Math.max(0, Math.min(100, repeatTradePenalty + concentration + tinyHolderPenalty)));
}

function estimateMomentumScore(token, recentBuyVolume, recentSellVolume) {
  const ratio = safeRatio(recentBuyVolume, recentSellVolume || 0.000001, recentBuyVolume > 0 ? 99 : 0);
  const curve = Math.min(100, Number(token.bondingCurveProgress || 0) * 160);
  const priceImpulse = token.firstPrice > 0 ? Math.max(0, Math.min(100, ((token.lastPrice - token.firstPrice) / token.firstPrice) * 80)) : 35;
  return Math.round(Math.max(0, Math.min(100, ratio * 14 + curve * 0.28 + priceImpulse * 0.4)));
}

function estimateRugRiskScore(token, topHolderPct, top5HolderPct, insiderWalletPct) {
  const devRisk = safeRatio(token.devSoldSol, token.devBoughtSol + token.buyVolumeSol, 0) * 250;
  const whaleRisk = topHolderPct * 95 + top5HolderPct * 42;
  const fakeRisk = estimateFakeVolumeScore(token) * 0.4;
  const insiderRisk = insiderWalletPct * 55;
  return Math.round(Math.max(0, Math.min(100, devRisk + whaleRisk + fakeRisk + insiderRisk)));
}

function normalizeSide(raw) {
  const value = String(raw.txType || raw.side || raw.type || raw.action || '').toLowerCase();
  if (value.includes('sell')) return 'sell';
  return 'buy';
}

function estimateInsiderPct(walletBuys) {
  const buys = [...walletBuys.values()].sort((a, b) => b - a);
  const total = sum(buys);
  if (total <= 0) return 0;
  const raw = sum(buys.slice(0, 3)) / total;
  const diversificationCredit = Math.min(0.28, buys.length * 0.018);
  return Math.max(0, raw - diversificationCredit);
}
