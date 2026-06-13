# MemeZo Real vs Simulated

## Real Code Paths

- Mobile navigation and UI interactions
- Admin CRUD and audited demo operations
- API validation and authorization gates
- Hashed PIN verification and lockout
- Session issue, resolution, rotation, and revocation
- Double-entry demo ledger calculations
- Idempotency enforcement
- Transfer risk checks
- Provider vault encryption
- PostgreSQL schema and migration
- Database transaction and row-lock helpers
- Redis adapter and distributed-lock helper
- Webhook signature and replay-protection primitives
- Durable queue retry behavior
- Provider contracts and readiness reporting

## Simulated or Demo-Only

- Demo balances and transactions
- Demo bank/virtual account
- Demo bill settlement
- Demo swap prices and fills
- Demo meme market snapshots
- Demo Auto Sniper executions
- Demo WhatsApp verification and replies
- Demo trade execution

## Not Yet Connected

- Real bank deposits and withdrawals
- Real KYC or OTP
- Real crypto custody and withdrawals
- Real Jupiter swaps
- Real DEX/Pump.fun streaming in the mobile API
- Real WhatsApp outbound messages and signed inbound processing
- Real email/push delivery
- Production PostgreSQL repositories and background workers

## Product Rule

Demo screens must show `Demo Mode - Not Real Money`. Live screens must show unavailable/provider-not-connected states until a real backend adapter confirms success.
