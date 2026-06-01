# Audit Handoff

## Scope

This project is a paper-first Pump.fun/Solana sniper terminal. Live trading is intentionally disabled in the broker layer. The current system is intended for code audit, forward paper testing, and strategy validation before any production wallet integration.

## What To Review First

- `src/scanner-service.js`: source orchestration, real-market feeds, optional simulator handling.
- `src/scoring.js`: 0-100 sniper score and hard block reasons.
- `src/risk.js`: max loss, cooldown, position limits, and exposure controls.
- `src/trade-manager.js`: exits, take-profit stages, trailing stop, emergency logic.
- `src/broker.js`: paper execution and disabled live broker guard.
- `src/enrichment.js`: Solana RPC, Birdeye, and Helius enrichment adapters.
- `public/app.js`: wallet UX, execution modal, scanner, token detail, logs, and settings UI.

## Safety Notes

- No private key or seed phrase should ever be placed in the frontend.
- Live execution currently throws by design.
- `.env` is ignored and must not be committed.
- `data/history.jsonl` is ignored because it can contain runtime trading logs.
- Default config disables mock fallback so the app does not silently create fake markets.

## Verification Commands

```bash
npm test
npm run simulate
npm start
```

Open the terminal at:

```text
http://127.0.0.1:8787
```

## Real Data Requirements

The app can use public DexScreener/Solana RPC data without secrets, but production-grade behavior needs dedicated API keys and rate limits:

- `PUMPPORTAL_API_KEY`
- `HELIUS_API_KEY`
- `BIRDEYE_API_KEY`
- `SOLANA_RPC_URL`

Keep `MODE=paper` until forward tests prove the strategy works under real latency, slippage, failed fills, RPC errors, API rate limits, and adverse market conditions.
