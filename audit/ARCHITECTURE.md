# Architecture

## Applications

- `apps/mobile`: Expo SDK 54 React Native customer app.
- `apps/admin`: internal operations web portal.
- `services/api`: Fastify API and domain workflows.
- `packages/contracts`: shared validation and API contracts.
- `prisma`: target PostgreSQL schema.
- `src`: legacy Pump.fun scanner and paper broker retained for migration.

## Current Runtime

Development uses an in-memory store seeded with isolated Demo records. The API ledger is double-entry and transaction commands use idempotency keys. Production configuration starts from an empty store and must move to PostgreSQL before launch.

## Domain Boundaries

- Identity and sessions
- Wallet and double-entry ledger
- Deposits, withdrawals, internal transfers
- AI Pay and bills
- Multi-asset swap
- P2P merchant orders
- Token intelligence and trading
- WhatsApp connection, commands, policies, and approvals
- Provider configuration and encrypted credentials
- Admin operations and audit events

## Provider Interfaces

The intended provider layer exposes:

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

No Live route should bypass these adapters.

## Data Flow

1. Mobile sends a validated command with a signed session and mode.
2. API resolves the user and enforces Demo/Live isolation.
3. Risk and provider readiness checks run.
4. Money commands post a balanced, idempotent ledger transaction.
5. External provider status is reconciled by a signed webhook or polling adapter.
6. Receipt and audit records are exposed to the user/admin.

## Scale Direction

Replace the memory store with PostgreSQL, add Redis for locks/rate limits/jobs, use a durable queue for webhooks and settlements, use object storage for documents, and move secrets to a managed KMS-backed secret manager.
