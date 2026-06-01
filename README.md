# Pump.fun Sniper Terminal

Professional paper-first Pump.fun meme-coin sniper MVP. It is built for fast opportunity detection, strict capital protection, explainable entries/exits, and real-market paper testing. It does not promise profit.

## Architecture

- `src/scanner-service.js`: PumpPortal, DexScreener, Solana RPC, holder, and dev-wallet feed orchestration.
- `src/scoring.js`: 0-100 sniper score and hard block gates.
- `src/risk.js`: max risk, daily loss, cooldown, open-position, and drawdown controls.
- `src/broker.js`: paper execution model with fees and slippage. Live broker is disabled.
- `src/trade-manager.js`: staged profit-taking, hard stop, emergency exit, trailing stop.
- `src/portfolio-manager.js`: equity curve, trade stats, risk alerts.
- `src/dashboard.js`: dashboard API, SSE event stream, static terminal UI.
- `src/logger.js`: append-only JSONL action/history logs.

## Install

```bash
cd /Users/libertyelectronics/pumpfun-sniper-bot
cp .env.example .env
```

No package install is needed for the current MVP; it uses Node's built-in runtime APIs.

## Run Paper Terminal

```bash
npm start
```

Open:

```text
http://localhost:8787
```

Health/status endpoints:

```text
http://localhost:8787/health
http://localhost:8787/api/status
```

Default mode is `paper` with `hybrid` real-market sources. Mock fallback is disabled by default so the terminal does not silently invent markets.

## Local UI Verification

1. Start the app:

```bash
cd /Users/libertyelectronics/pumpfun-sniper-bot
npm start
```

2. Open the app in your browser:

```text
http://127.0.0.1:8787
```

3. Open status in a second tab:

```text
http://127.0.0.1:8787/api/status
```

4. Optional mock-only visual test, if you need tokens immediately without waiting for real sources:

```bash
DATA_MODE=mock MOCK_FEED_ENABLED=true MODE=paper npm start
```

Mock mode is only for UI and replay testing. Real paper trading should use real market sources.

## UI Verification Checklist

- Mobile layout: resize browser to phone width and confirm cards stack, scanner scrolls horizontally, and no text escapes the screen.
- Wallet section: click Connect Wallet, confirm the compact badge appears, dropdown opens only on click, closes on outside click and Escape.
- Scanner status: confirm source cards show PumpPortal, DexScreener, Solana RPC, holders, dev monitor, and execution status.
- Paper buy/sell flow: click Paper Buy on a token, confirm the modal opens, then Confirm Paper Buy calls backend paper execution. Use Paper Sell/Close on an open position.
- Blocked-trade memory panel: open Advanced opportunity queue and missed-run learning, then verify "Blocked trades that later ran" has either entries or a clear empty state.
- Missed-run panel: verify "Missed runs" has entries or a clear empty state.
- Advanced tabs: open and close Advanced account metrics, market intelligence, opportunity queue, execution logs, and protection sections.
- Source health warning: remove API keys or run without `.env`; PumpPortal should show missing key/public-only, holders should show limited/missing Birdeye, dev monitor should show missing Helius.
- Empty states: with no live tokens, panels should show instructions instead of blank content.
- No broken text/overflow: inspect wallet menu, scanner rows, token detail, execution modal, and position cards at desktop and mobile widths.

## Run Historical Simulation

```bash
npm run simulate
```

The bundled sample shows one controlled paper entry/exit and blocks a rug-risk token. This is not proof of profitability; it is only a functional test path.

## Configure Thresholds

Edit:

```text
config/default.json
```

Important controls:

- `strictScoreThreshold`: entry score threshold, default `80`.
- `risk.maxRiskPerTradeSol`: fixed risk cap per trade.
- `risk.maxPositionSizeSol`: absolute position cap.
- `risk.maxSlippagePct`: maximum allowed slippage.
- `risk.maxDailyLossSol`: daily loss stop.
- `risk.maxOpenTrades`: portfolio exposure cap.
- `management.takeProfits`: staged sell levels.
- `management.trailingDistancePct`: trailing-stop distance.
- `watch.*`: scanner filters for age, market cap, holders, whale concentration, dev selling, bonding curve, fake volume, liquidity quality, and price extension.

## Data Modes

Optional simulator mode:

```env
DATA_MODE=mock
MODE=paper
MOCK_FEED_ENABLED=true
```

Real-market paper mode:

```env
DATA_MODE=hybrid
MODE=paper
PUMPPORTAL_API_KEY=your_key_here
HELIUS_API_KEY=optional_key_here
BIRDEYE_API_KEY=optional_key_here
```

PumpPortal, DexScreener, Solana RPC, Helius, and Birdeye availability depends on public limits and your API keys. Keep `MODE=paper` until your own forward tests and historical tests prove a real edge after fees, slippage, latency, failed exits, and bad fills.

Holder/dev/mint warnings:

- Without `BIRDEYE_API_KEY`, holder distribution is limited to RPC-derived signals where available.
- Without `HELIUS_API_KEY`, dev wallet transaction monitoring is unavailable.
- Mint/freeze authority checks are shown as unverified until mint-account enrichment is implemented.
- The UI must show these as unavailable or limited, never as confirmed safe.

## Live Trading

Live trading is intentionally disabled. `DisabledLiveBroker` throws if selected. A live broker should only be added behind a secure backend-only wallet setup, never in the frontend, and only after:

- Hardware or encrypted key handling is designed.
- Wallet/private key never touches browser code.
- Kill switch exists.
- Max loss, max slippage, max position, and emergency exits are enforced server-side.
- Paper logs prove the strategy behaves acceptably in bad conditions.

## Safety Position

This bot avoids manipulation features entirely: no spam buying, fake volume, wash trading, artificial bundling, or market manipulation. It is designed to skip dangerous tokens and miss trades rather than gamble.
