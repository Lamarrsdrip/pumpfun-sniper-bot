# MemeZo V3 Production Readiness Design

## Objective

Move MemeZo from a broad demo foundation toward a launchable financial platform without expanding the product surface. The work concentrates on durable money movement, security controls, provider truthfulness, operational visibility, and a calmer native mobile experience.

## Product Principles

1. Financial state must survive process restarts and concurrent requests.
2. Provider-backed actions fail closed when credentials, signatures, or reconciliation are unavailable.
3. Demo behavior is explicit and cannot be confused with live money movement.
4. Every sensitive action is attributable, idempotent, observable, and reversible through an audited process.
5. Mobile screens reveal only the information required for the current decision.
6. Admin operations emphasize queues, exceptions, provider health, treasury, and incidents instead of decorative statistics.

## Runtime Architecture

### Durable Data

PostgreSQL is the system of record for users, sessions, wallets, ledger entries, payment requests, provider events, audit events, approvals, jobs, and reconciliation records. Wallet changes run in serializable database transactions and lock affected wallet rows before balances are changed.

The existing in-memory store remains available only for labelled demo/test mode. Production startup reports an unhealthy state when PostgreSQL is not configured.

### Queues and Background Work

Redis is the coordination layer for distributed locks, job wakeups, rate limits, and short-lived caches. Durable job records and an outbox live in PostgreSQL so Redis loss cannot erase financial work. Workers claim jobs with leases, retry with bounded exponential backoff, and move exhausted jobs to a review queue.

### Webhooks and Reconciliation

Every provider webhook is verified before processing, stored by provider event ID, and processed idempotently. A reconciliation worker compares provider status with internal state and raises incidents for mismatches.

### Observability

Structured logs use request and correlation IDs and redact secrets, PINs, account numbers, tokens, and authorization headers. Health endpoints separate app, database, Redis, queue, provider, and reconciliation status. Sentry support is adapter-based and disabled until credentials are present.

## Security Model

- Passwords and transaction PINs use memory-hard salted hashes.
- Sessions rotate and are bound to device metadata.
- Sensitive provider webhooks use constant-time signature verification.
- High-risk admin changes require a second eligible approver.
- Fraud checks evaluate duplicates, amount thresholds, velocity, device trust, and provider confidence.
- Live actions remain blocked unless the necessary provider, custody, database, and security gates are healthy.
- Secrets are accepted only through environment or an encrypted server-side vault.

## Provider Model

Provider families expose stable interfaces for payments, KYC, OTP, RPC, swaps, custody, WhatsApp, email, and observability. Each provider reports:

- configured or missing
- enabled or disabled
- primary or backup
- last test result
- latency
- last error
- capabilities unlocked

No provider card may display connected unless a real health test succeeds.

## Mobile Experience

### Wallet

The wallet presents NGN and major crypto assets with clear network routes. BTC, ETH, USDT, USDC, BNB, SOL, TRX, XRP, and DOGE are visible through a manage-assets model. Deposit, receive, send, and swap actions explain the selected network before confirmation.

### Internal Transfer

Send-by-username becomes a flagship flow:

1. Search, favorite, recent recipient, or QR/deep-link input.
2. Enter amount and narration.
3. Review recipient, fee, balance after transfer, and risk checks.
4. Confirm with transaction PIN or biometric approval.
5. Show durable receipt and status.

### WhatsApp

WhatsApp can read balance, account information, transaction history, savings status, and prepare payments or bills. It never executes a payment silently. Approval remains in-app or within a bounded trusted rule.

## Admin Experience

The admin landing screen becomes Mission Control:

- launch gates and system health
- provider health
- KYC/KYB and payment exception queues
- treasury and liquidity
- webhook reconciliation
- fraud and risk cases
- incidents
- AI and WhatsApp usage

Detailed management remains available through grouped navigation. Normal users never receive admin routes or data.

## Delivery Boundary

This pass implements production-grade primitives, schemas, gates, tests, and UI exposure. Real provider execution still requires credentials, provider onboarding, custody approval, deployed PostgreSQL/Redis, and independent security review. The audit documents must state this plainly.
