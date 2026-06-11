# MemeZo Platform Architecture

## Product Boundary

MemeZo is a native mobile product backed by regulated-provider integrations and server-side trading services. The mobile app never stores payment-provider secrets, exchange credentials, custodial wallet keys, or signing material.

## Runtime Topology

```text
Native iOS / Android App
        |
        | HTTPS + WebSocket
        v
API Gateway / Auth / Rate Limits
        |
        +-- Identity + KYC
        +-- Naira Ledger + Payments
        +-- Trading + Portfolio
        +-- Early Runner Intelligence
        +-- Auto Sniper Orchestrator
        +-- Social + Community
        +-- Copy Trading
        +-- Alerts + Campaigns
        +-- WhatsApp Command + Approval Gateway
        +-- Multi-Chain Asset Registry
        +-- Subscriptions + Entitlements
        +-- Admin Control Plane
        |
        +-- PostgreSQL (financial source of truth)
        +-- Redis (locks, queues, live state)
        +-- Object storage (KYC/media/receipts)
        +-- Event bus / job workers
```

## Financial Invariants

1. Wallet balances are derived from immutable double-entry ledger records.
2. Every deposit, withdrawal, trade, fee, reversal, and copy allocation has an idempotency key.
3. Provider webhooks are signature-verified and stored before processing.
4. Balance changes use database transactions and row/version locks.
5. The client cannot specify final prices, fees, balances, or trade outcomes.
6. Financial configuration changes require audit logging and optional second-admin approval.
7. Real money features are disabled until the relevant provider and compliance flags are active.

## Service Domains

### Identity and Compliance

- Phone/email authentication
- Device sessions and refresh-token rotation
- KYC tiers and limits
- Sanctions/PEP/provider screening hooks
- Suspicious activity cases
- Account restriction and deletion workflow

### Naira Ledger and Payments

- Dedicated virtual account assignment
- Signed webhook ingestion
- Pending/confirmed/reversed deposits
- Bank-account resolution
- Withdrawal risk review and approval
- Receipts and reconciliation

### Market Intelligence

- DEX Screener-first multi-chain pair discovery
- Optional high-risk Pump.fun/Solana launch ingestion
- Raw trade/liquidity/holder/social event ingestion
- Time-window feature computation
- Deterministic Runner Score
- Versioned model inference
- Explainable evidence and warnings
- Outcome tracking and model evaluation

### Trading

- Server-generated quotes
- Fee and slippage disclosure
- Idempotent order submission
- Provider execution adapters
- Position and realized/unrealized PnL
- Emergency platform and user stops

### Social and Copy Trading

- Moderated posts, follows, likes, and comments
- Verified trade-proof attachments
- Risk-adjusted leaderboards
- Copy allocation limits and drawdown stops
- No guaranteed-return language

### Admin Control Plane

- Users, KYC, deposits, withdrawals, trades, bots, revenue
- Provider configuration and health
- Masked secret references
- Email/push/in-app campaigns with consent segments
- Feature flags and platform incidents
- Fees, limits, subscriptions, banners, and risk controls
- Immutable audit logs and approval requests

### WhatsApp Assistant

- Meta Cloud API provider adapter and signed webhook boundary
- Number-link verification and connection lifecycle
- Bounded command parser for balance, account, transactions, P2P and support
- Payment and bill preparation only; no silent money movement
- In-app PIN/biometric approval sessions with expiry
- Template, delivery, failure and webhook operations

## Platform Evolution

MemeZo launches with replaceable third-party adapters, but every service boundary is
owned by MemeZo. Raw observations, derived scores, model versions and later outcomes
are stored so the platform can build proprietary Runner, Risk, Whale, Smart Money,
Momentum, Social Sentiment and Holder Growth scores.

The long-term internal service boundary is:

```text
Market Aggregation -> Feature Store -> Versioned Scoring -> Outcome Learning
        |                    |                |
        +-- Consumer App     +-- Admin        +-- Future MemeZo APIs
```

Future commercial APIs can expose discovery, risk, wallet intelligence and scoring
without coupling external clients to the mobile application or provider-specific
payloads.

## Deployment

- Mobile: Expo development builds, then EAS iOS/Android production builds.
- API: containerized Node service behind a managed load balancer.
- PostgreSQL: managed HA database with point-in-time recovery.
- Redis: managed deployment with persistence appropriate to queue use.
- Secrets: AWS Secrets Manager, GCP Secret Manager, Doppler, or equivalent.
- Media: private object storage with short-lived signed URLs.
- Observability: structured logs, traces, metrics, alerts, and incident runbooks.

## Regulatory Release Gates

The codebase can be tested with sandbox providers, but production Naira custody, crypto exchange, copy trading, and automated trading stay disabled until legal counsel confirms the required Nigerian licensing/partnership structure and store-review documentation.
