# MemeZo Launch Blockers

## Blocks Real-Money Launch

- Production requests are not yet fully persisted through PostgreSQL repositories.
- PostgreSQL, Redis, and worker processes are not deployed and monitored.
- Payment, KYC, OTP, custody, swap, RPC, WhatsApp, email, and monitoring credentials are not connected and sandbox-tested.
- Provider webhook signature adapters and scheduled reconciliation are not running.
- Admin MFA and production identity integration are incomplete.
- No independent penetration test or financial ledger audit has been completed.
- No tested backup, restore, key rotation, incident response, or disaster recovery exercise is recorded.
- Crypto custody, signing policy, withdrawal allow-listing, and chain-risk screening are not operational.
- Treasury funding, liquidity policy, settlement limits, and provider failover have not been approved.

## Blocks App Store Submission

- Production API and privacy-policy URLs
- Final app icon, screenshots, support URL, and release metadata
- Account deletion backend completion
- TestFlight build and review notes
- Privacy nutrition labels and data-retention declarations
- Demonstrable live-provider or clearly restricted preview behavior

## Blocks Google Play Submission

- Production API and privacy-policy URLs
- Final adaptive icon, screenshots, support URL, and listing copy
- Data safety declaration
- Closed/internal testing track
- Account deletion URL and in-app flow
- Signed AAB and production keystore management

## Release Rule

Live execution must remain disabled until all critical infrastructure and custody gates are healthy and a two-person release approval is recorded.
