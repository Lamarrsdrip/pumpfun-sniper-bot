# MemeZo Product Migration Design

## Product Boundary

MemeZo is a Naira-first financial and crypto utility with five primary mobile
surfaces: Home, Discover, Wallet, Pay, and Sniper. P2P merchant automation,
bills, cards, business onboarding, security, support, and transaction details
are focused secondary journeys. The operations portal remains a separate web
application and is never advertised inside a normal user profile.

## Runtime Foundation

- Expo SDK 54, React 19.1 and React Native 0.81 use Expo Router's standard entry.
- `app.json` is the single native configuration source.
- Expo Go is the first development target; custom builds are reserved for native
  capabilities that Expo Go cannot provide.
- API errors must terminate loading states and provide retry actions.
- Live mode never invents balances, provider status, market data, or success.

## Money Model

Each user sees one MemeZo balance backed by ledger accounts for NGN and supported
assets. Virtual accounts are deposit instructions, not a second balance.

Default fees:

- Naira deposit: 0.5%.
- Naira withdrawal: 0.5%.
- Crypto deposit: no MemeZo platform fee.
- Crypto withdrawal quote: network cost plus a 0.1% margin included in the total
  displayed withdrawal cost. The customer sees one complete fee, while the
  operations portal records network cost and margin revenue separately.
- Swap rates and spreads are controlled by authorized administrators.

## Payment Automation

AI Pay creates a payment draft from typed instructions or an uploaded image.
Extraction never transfers money. The server verifies the account, checks
duplicates, evaluates risk and returns a review object. PIN or biometric approval
is required before execution. Trusted automation rules are versioned, limited and
revocable. WhatsApp is represented as a provider interface and cannot execute
until webhook identity and approval controls are implemented.

## P2P Manager

P2P orders use Manual, Hybrid, or Full Auto policies. Every order passes balance,
account verification, duplicate, daily-limit, per-order, seller and bank rules.
Full Auto means pre-authorized rule execution, not bypassing the risk engine.
Provider/API sync is optional; manual order entry remains available.

## Market And Sniper

Live discovery accepts only provider-sourced Pump.fun/Solana records. Demo data is
explicitly labelled. Token intelligence includes source health, runner and risk
scores, contract warnings, holder/dev risk and copyable mints. Sniper decisions
are explainable and support Simulation, Manual, Semi-auto and Full Auto modes.
Live execution remains fail-closed until custody and execution adapters pass
authenticated health and reconciliation tests.

## Administration

The web operations portal owns users, KYC/KYB, wallets, virtual accounts, money
movement, crypto, rates, fees, revenue, P2P, AI payments, cards, bills, tokens,
sniper controls, broadcasts, support, audits, providers, webhooks and
reconciliation. Sensitive actions require role permission, reason, idempotency
and an immutable audit event.

## Provider Interfaces

Providers are replaceable behind server interfaces:

- `createVirtualAccount`
- `verifyDeposit`
- `initiateBankTransfer`
- `verifyAccountName`
- `getTransactionStatus`
- `createCryptoDepositAddress`
- `sendCrypto`
- `getSwapQuote`
- `executeSwap`
- `streamMemeTokens`
- `executeSniperTrade`
- `parsePaymentInstruction`
- `purchaseBill`
- `createVirtualCard`

## Release Standard

The repository must pass Expo Doctor, TypeScript, automated tests, iOS/Android
exports and route-level interaction checks. The final report distinguishes
working Demo workflows, production-ready code paths awaiting credentials, and
provider adapters that are not implemented.
