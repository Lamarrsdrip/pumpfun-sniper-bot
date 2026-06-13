# MemeZo Platform

MemeZo is a Naira-first native iOS/Android money, crypto, automation, and multi-chain meme-intelligence platform. It combines daily payments, AI Pay, WhatsApp payment preparation, P2P merchant tools, a multi-currency wallet, DEX/Pump.fun discovery, optional Auto Sniper automation, and an admin control plane.

The original Pump.fun scanner remains in `src/` as a migration source and internal paper-testing terminal. It is not the customer mobile application.

## Fastest Local Preview

Open three Terminal windows in the project folder.

Terminal 1, API:

```bash
npm run api
```

Terminal 2, admin portal:

```bash
npm run admin
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). Select **Demo** to operate sample users, KYC, deposits, withdrawals, trades, tokens, providers and audit logs.

Terminal 3, phone app:

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://YOUR_MAC_LAN_IP:8790 npx expo start --lan --clear
```

Keep the Mac and phone on the same Wi-Fi, update Expo Go, then scan the QR code. On the welcome screen tap **Explore Demo Mode**. Demo Mode is always labelled and never moves real money.

To find the Mac LAN IP:

```bash
ipconfig getifaddr en0
```

If that prints nothing, try:

```bash
ipconfig getifaddr en1
```

The API health page is [http://127.0.0.1:8790/api/status](http://127.0.0.1:8790/api/status).

## Remote Expo Preview

For a reviewer outside your Wi-Fi, use temporary tunnels:

```bash
# Terminal 1: API
API_PORT=3000 npm run dev --workspace @nairameme/api

# Terminal 2: public API tunnel
cloudflared tunnel --url http://127.0.0.1:3000 --no-autoupdate

# Terminal 3: replace URL with the cloudflared HTTPS address
cd apps/mobile
EXPO_PUBLIC_API_URL=https://YOUR-TUNNEL.trycloudflare.com npx expo start --tunnel --clear
```

Send the reviewer the `exp://...exp.direct` URL or Expo QR code. The tunnel works only while all three Terminal processes and the Mac remain online. Do not use this temporary tunnel for production money movement.

## New Platform Structure

```text
apps/mobile       Expo/React Native iOS and Android app
apps/admin        Internal operations and admin portal
services/api      Secure mobile/admin API and provider gates
packages/contracts Shared validation and API contracts
prisma            PostgreSQL ledger and platform schema
docs              Architecture and release requirements
src               Existing scanner/risk/paper engine
```

## Install

```bash
cp .env.example .env
npm install
```

## Run Mobile

Start the platform API:

```bash
npm run api
```

In another terminal:

```bash
npm run mobile
```

The default command opens in Expo Go for the fastest native preview. Use `npm run start:dev-client --workspace @nairameme/mobile` after installing a custom development build for production-like push, signing, and native integration testing. `127.0.0.1` only works for an iOS simulator on the same Mac. For a physical phone, set `EXPO_PUBLIC_API_URL` to your Mac's LAN address or a secured development URL.

## Run Admin Portal

```bash
npm run admin
```

The portal reads `VITE_API_URL`, defaulting to `http://127.0.0.1:8790`. Development admin routes are local-only. Production requires `ADMIN_API_TOKEN`, an allowed admin origin, and ultimately SSO/OIDC with MFA before staff access.

## Native Build Profiles

The mobile app includes EAS development, preview, and production profiles:

```bash
cd apps/mobile
npx eas-cli@latest init
npx eas-cli@latest build --profile development
```

Do not submit production builds until the provider, legal, security, privacy, store-asset, and device-test gates in [docs/AUDIT.md](docs/AUDIT.md) are closed.

## Production Gates

The following remain disabled until configured and approved:

- Naira deposits and withdrawals
- Real token execution
- Auto Sniper live mode
- Copy trading
- Bulk email/push delivery

The V3 production schema, migration, row-lock helpers, queue/reconciliation models, PIN hashing, session rotation, webhook verification, Redis adapter, and Mission Control readiness API are implemented. Existing product flows still need to be migrated from the in-memory demo repository to PostgreSQL before real-money launch. Read [PRODUCTION_GAP_ANALYSIS.md](PRODUCTION_GAP_ANALYSIS.md) and [LAUNCH_BLOCKERS.md](LAUNCH_BLOCKERS.md).

## What Works In This Slice

- Explicitly isolated Demo and Live modes.
- Demo email-style session with secure token storage on device.
- Double-entry Naira wallet accounting and idempotent credits.
- Deposit references, withdrawal requests, fees and admin decisions.
- Real backend quote/execute lifecycle for Demo buys and sells.
- Fee-aware portfolio, positions and trade history.
- Newest-first token discovery, full contract display and copy.
- DEX-first multi-chain discovery for Solana, Ethereum, Base, BNB Chain, Polygon, Arbitrum and Optimism, with Pump.fun isolated as high-risk Early Solana mode.
- Runner/risk intelligence with rules-first AI explanations.
- Multi-asset wallet UX, network-aware receive/send flows, receipts, notifications, rewards, savings foundations and manage-assets controls.
- WhatsApp Assistant link, verification, command parsing and secure in-app payment approval sessions.
- Configurable Demo Auto Sniper limits; Live activation fails closed.
- Admin user search, KYC/money decisions, WhatsApp operations/templates, asset/network policy, rewards policy, provider priority/credentials, token monitor and audit trail.
- Emergent Universal LLM configuration with caching, low request rate and a daily credit ceiling. LLM output cannot authorize a trade.

## Provider Accounts Needed For Live

1. Supabase: authentication, PostgreSQL and storage.
2. Monnify: primary virtual accounts and bank transfers.
3. Paystack and Flutterwave: payment fallback adapters.
4. Dojah: first KYC provider.
5. DEX Screener, Birdeye and production multi-chain RPC providers; Helius and PumpPortal add Solana launch intelligence.
6. Chain-aware quote/execution adapters plus audited custody/signing infrastructure.
7. Resend: primary email. AWS SES and Google Workspace may be fallbacks.
8. Expo Push, then Firebase/APNs credentials for production notifications.
9. Emergent Universal LLM only for cached beginner explanations, never trade permission.
10. Meta WhatsApp Business Cloud API for linked chat alerts and payment preparation.

See [docs/LAUNCH_ROADMAP.md](docs/LAUNCH_ROADMAP.md) for the exact production blockers.

Provider secrets belong in a secret manager or backend environment. They are never returned to the mobile/admin clients.

For local and single-server staging, set `FIELD_ENCRYPTION_KEY` to a long random value. The admin then stores provider credentials in the AES-256-GCM encrypted file configured by `PROVIDER_SECRETS_PATH` (default `data/provider-secrets.enc`, ignored by Git). Production deployments should mount that file on encrypted persistent storage or replace the vault with a managed KMS/secret manager.

The MemeZo admin operations center includes working user/KYC decisions, virtual-account visibility, deposit and withdrawal decisions, AI payment and P2P records, bill-payment records, token moderation, per-user bot controls, copy-trader eligibility, campaign drafts/approval, fees and limits, incidents, provider credential forms/tests, audit history, and launch readiness. Provider status remains `DEGRADED` after credential validation until its network adapter completes a real upstream health check.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before implementing provider adapters or enabling money movement.
Read [docs/AUDIT.md](docs/AUDIT.md) for verified fixes and remaining release blockers.

---

# Legacy Pump.fun Sniper Terminal

Professional paper-first Pump.fun meme-coin sniper MVP. It is built for fast opportunity detection, strict capital protection, explainable entries/exits, and real-market paper testing. It does not promise profit.

## Architecture

- `src/scanner-service.js`: PumpPortal, DexScreener, Solana RPC, holder, and dev-wallet feed orchestration.
- `src/scoring.js`: 0-100 sniper score and hard block gates.
- `src/risk.js`: max risk, daily loss, cooldown, open-position, and drawdown controls.
- `src/broker.js`: paper execution model with fees and slippage, plus a gated external live-broker adapter.
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

Live trading is gated behind explicit backend configuration. The frontend never receives private keys.

Live modes:

```env
MODE=live
LIVE_TRADING_ENABLED=true
LIVE_DRY_RUN=true
LIVE_AUTO_TRADE_ENABLED=false
LIVE_TRADE_API_URL=https://your-secure-broker.example/trade
LIVE_TRADE_API_KEY=your_provider_key
```

- `LIVE_DRY_RUN=true`: sends dry-run orders to the configured backend broker provider.
- `LIVE_DRY_RUN=false`: allows the configured backend broker provider to broadcast real transactions.
- `LIVE_AUTO_TRADE_ENABLED=false`: live entries require manual button confirmation.
- `LIVE_AUTO_TRADE_ENABLED=true`: scanner-qualified entries can auto-execute through the broker. Use only after audit and small-size forward testing.

The app expects `LIVE_TRADE_API_URL` to accept:

```json
{
  "side": "buy",
  "mint": "token mint",
  "symbol": "TOKEN",
  "name": "Token Name",
  "sizeSol": 0.1,
  "pct": 1,
  "maxSlippagePct": 0.08,
  "reason": "strict score 85",
  "dryRun": true,
  "requestedAt": "2026-06-01T00:00:00.000Z"
}
```

Expected response:

```json
{
  "ok": true,
  "provider": "your-broker",
  "txSignature": "optional-solana-signature"
}
```

A live broker should only be used behind secure backend-only wallet custody, never in the frontend, and only after:

- Hardware or encrypted key handling is designed.
- Wallet/private key never touches browser code.
- Kill switch exists.
- Max loss, max slippage, max position, and emergency exits are enforced server-side.
- Paper and dry-run logs prove the strategy behaves acceptably in bad conditions.

## Safety Position

This bot avoids manipulation features entirely: no spam buying, fake volume, wash trading, artificial bundling, or market manipulation. It is designed to skip dangerous tokens and miss trades rather than gamble.

## Hosting

This is a Node.js backend app that serves the frontend, API routes, SSE stream, scanner service, and paper broker. Do not host it as a static-only site unless you separate the frontend from the backend first.

### Recommended: Render Web Service

1. Push the repo to GitHub.
2. In Render, create a new **Web Service** from the GitHub repo.
3. Use:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
Node version: 22+
```

4. Set environment variables:

```env
MODE=paper
DATA_MODE=hybrid
PORT=8787
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PUMPPORTAL_API_KEY=optional_key_here
HELIUS_API_KEY=optional_key_here
BIRDEYE_API_KEY=optional_key_here
MOCK_FEED_ENABLED=false
```

5. After deploy, check:

```text
https://your-render-app.onrender.com/health
```

### Railway

1. Create a Railway project from GitHub.
2. Set the same environment variables above.
3. Use `npm start` as the start command.
4. Make sure Railway exposes the `PORT` environment variable. If Railway provides its own `PORT`, use that instead of hardcoding `8787`.

### VPS

```bash
git clone https://github.com/Lamarrsdrip/pumpfun-sniper-bot.git
cd pumpfun-sniper-bot
npm install
MODE=paper DATA_MODE=hybrid PORT=8787 npm start
```

For production VPS use, run behind a process manager and HTTPS reverse proxy. Keep private keys out of this app. Real live execution must go through a separate audited broker service configured with `LIVE_TRADE_API_URL` and `LIVE_TRADE_API_KEY`.

## MemeZo Launch Configuration

The admin portal now reads provider-specific field definitions from the API. Open **Providers & API Keys**, choose a provider, select **Configure**, enter its fields, save, and run **Test**. Secrets are accepted only by the backend configuration endpoint and must be backed by an audited secret manager in production.

Required launch groups:

- Naira payments: Monnify primary, Paystack and Flutterwave fallback.
- Authentication/database: Supabase plus Termii or Sendchamp when phone OTP is enabled.
- KYC: one active provider from Dojah, Smile ID, or Prembly.
- Solana data: Helius, QuickNode, or Alchemy plus PumpPortal/Birdeye/DexScreener.
- Trading: Jupiter quote/swap routes and an audited custody signer such as Turnkey.
- Messaging: Resend or SendGrid, Expo Push and Firebase/APNs.
- Operations: Sentry, immutable audit storage, backups, reconciliation, and alerting.

Admin roles are `ADMIN`, `SUPER_ADMIN`, `COMPLIANCE_ADMIN`, and `SUPPORT_ADMIN`. Users with role `USER` do not receive the mobile Admin Mode entry and are redirected away from the admin route.

The **Campaign Center** creates consent-aware email, push, and in-app drafts. The **Launch Checklist** reports connected and missing providers alongside App Store and Play Store release evidence.
