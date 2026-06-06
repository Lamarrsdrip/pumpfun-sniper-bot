# NairaMeme Launch Roadmap

## Completed Foundation

- Native Expo iOS/Android application structure.
- Naira-first wallet, deposits, withdrawals, discovery, token intelligence, trading review, portfolio, Earn, Network and Auto Sniper screens.
- Working Demo API with mode isolation, sessions, double-entry ledger, fees, trade positions, transaction history and audit records.
- Operational admin workflows for users, KYC, deposits, withdrawals, trades, tokens, providers and audit events.
- Rules-first Runner explanations and a cost-limited Emergent configuration.
- Production fail-closed behavior when credentials or audited adapters are absent.

## Required Before Real Money

1. Replace the development memory store with Supabase PostgreSQL repositories and database transactions.
2. Implement Supabase production auth, refresh rotation, device sessions, password recovery and optional admin phone OTP.
3. Complete Dojah KYC webhooks, consent, document retention and manual-review policies.
4. Implement signed Monnify webhooks, reconciliation and reversal handling. Add Paystack/Flutterwave fallback only after primary payment tests pass.
5. Build audited custody/signing infrastructure. Private keys must never enter the app, admin browser or source repository.
6. Implement Jupiter/Pump execution adapters with quote expiry, slippage, failed fills, network fees, confirmations and reconciliation.
7. Connect Helius, PumpPortal, Birdeye and Solana RPC, then measure latency and source disagreement.
8. Add Redis locks/queues, object storage, observability, backups, incident alerts and disaster recovery.
9. Commission penetration testing, mobile security testing and financial-ledger review.

## Legal And Compliance

- Nigerian legal advice on custody, exchange, automated trading, promotions, bounties and copy trading.
- KYC/AML, sanctions, PEP, transaction monitoring and suspicious-activity procedures.
- Privacy policy, terms, risk disclosure, complaints, refunds/reversals and data-retention policy.
- Banking/payment-provider approvals and a documented source-of-funds process.
- Marketing rules that prohibit guaranteed-return language.

## App Store And Play Store

- Apple and Google developer accounts.
- Final bundle identifiers, signing, store assets and privacy nutrition/data-safety declarations.
- Account deletion, support URL, privacy URL and terms URL.
- Device QA on supported iPhone and Android versions.
- Review notes explaining financial features, Demo Mode, risk controls and jurisdiction availability.

## Immediate Next Steps

1. Run the three local preview commands in the README.
2. Review the Demo mobile flow and admin workflows.
3. Create the Supabase, Monnify and Dojah sandbox accounts first.
4. Hire Nigerian fintech/crypto legal counsel before any Live deposit or trade.
5. Deploy the API and admin staging environment.
6. Replace the memory repository with PostgreSQL and migrate the Demo workflows unchanged.

## Honest Completion Estimate

The product and operational foundation is approximately 35% of a regulated production launch. The customer experience and contracts are tangible, but real-money provider adapters, persistent financial infrastructure, security hardening, compliance approval and store release work remain substantial.
