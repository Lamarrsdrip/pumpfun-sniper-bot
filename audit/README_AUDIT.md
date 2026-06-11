# MemeZo External Audit Brief

## Scope

This package contains the MemeZo mobile app, operations portal, API, shared contracts, database schema, and legacy Pump.fun scanner. Review the current commit, not screenshots alone.

## Run

```bash
npm install
npm run api
npm run admin
```

In another terminal:

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://YOUR_MAC_LAN_IP:8790 npx expo start --lan --clear
```

Use **Explore Demo Mode**. Demo PIN: `1234`.

## What Is Real

- Expo Router mobile navigation and working screen flows.
- Fastify API validation, mode isolation, rate limiting, security headers, and error responses.
- Double-entry development ledger with idempotency enforcement.
- Demo deposits, withdrawals, internal transfers, bills, AI Pay, swaps, token trades, P2P decisions, and receipts.
- Encrypted local provider credential vault for development/staging.
- Role-protected admin API in production mode.
- Provider health, asset policy, fees, limits, rewards, campaigns, incidents, and audit records.
- Multi-asset swap quote/execute lifecycle against an isolated Demo rate book.
- WhatsApp linking simulation, command parsing, bounded safety settings, and approval sessions.

## What Is Simulated

- All balances and transactions in Demo Mode.
- Demo asset prices, token intelligence, charts, P2P orders, and market activity.
- WhatsApp delivery and verification.
- Swap liquidity and settlement.
- Bank transfers, cards, bills, crypto custody, and blockchain execution.

## What Requires Providers

Live money movement is deliberately unavailable until the required provider adapter, database, signing, webhook, reconciliation, and operational controls are connected. See `PROVIDERS_NEEDED.md`.

## Readiness Assessment

- Product/UI foundation: 78%
- Demo functional coverage: 86%
- Backend domain foundation: 68%
- Production infrastructure: 35%
- Real-money launch readiness: 42%

The largest gaps are persistent infrastructure, production identity, provider adapters, custody/signing, reconciliation, fraud tooling, observability, and independent security review.

## High-Priority Review Questions

1. Can any request cross Demo and Live boundaries?
2. Are all money-changing endpoints idempotent and balanced?
3. Can admin credentials or provider secrets reach a client response?
4. Are production provider webhooks authenticated before state changes?
5. Does every Live action fail closed while its adapter is absent?
6. Are WhatsApp actions bounded and independently approved?
7. Is the proposed custody model acceptable for Nigerian and target-chain operations?
