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

## Provider Setup Matrix

Enter credentials in **Admin -> Providers & API Keys**. Each provider has its own
fields, setup link, Save, Test, enable/disable, and priority controls. Secrets are
sent to the API and encrypted in the provider vault; they are never returned to
the browser or mobile app.

| Launch need | Primary | Backup / optional | Direct account or key page |
| --- | --- | --- | --- |
| Database and identity | Supabase | - | https://supabase.com/dashboard |
| Naira virtual accounts and transfers | Monnify | Paystack, Flutterwave | https://app.monnify.com/ |
| Payment backup | Paystack | Flutterwave | https://dashboard.paystack.com/ |
| Payment backup | Flutterwave | Paystack | https://app.flutterwave.com/ |
| KYC | Dojah | Smile ID, Prembly | https://app.dojah.io/ |
| Phone OTP | Termii | Sendchamp | https://accounts.termii.com/ |
| Solana RPC and webhooks | Helius | QuickNode, Alchemy | https://dashboard.helius.dev/ |
| Pump launch stream | PumpPortal | Helius stream | https://pumpportal.fun/ |
| Token market enrichment | Birdeye | DexScreener | https://bds.birdeye.so/ |
| Quotes and swaps | Jupiter | PumpSwap adapter | https://portal.jup.ag/ |
| Server-side wallet custody | Turnkey | separately audited alternative | https://app.turnkey.com/ |
| Transaction screening | TRM Labs | Chainalysis | https://www.trmlabs.com/ |
| Email | Resend | SendGrid, SES | https://resend.com/api-keys |
| Push | Expo Push | Firebase and APNs | https://expo.dev/accounts |
| AI explanations | Emergent | another OpenAI-compatible provider | https://app.emergent.sh/ |
| Crash monitoring | Sentry | - | https://sentry.io/ |
| Product analytics | PostHog | - | https://app.posthog.com/ |
| Mobile subscriptions | RevenueCat | native store billing | https://app.revenuecat.com/ |
| Customer support | Zendesk | another ticket provider | https://www.zendesk.com/register/ |

### Recommended Activation Order

1. Supabase production project, schema migrations, Row Level Security and backups.
2. Monnify sandbox webhooks, reconciliation, duplicate delivery and reversal tests.
3. Dojah sandbox KYC plus manual-review and data-retention workflows.
4. Helius, PumpPortal and Birdeye feeds with disagreement and stale-data alarms.
5. Jupiter quote adapter, then audited custody/signing and transaction screening.
6. Resend and Expo Push, followed by Sentry alerting.
7. Paystack and Flutterwave only after the primary money path reconciles correctly.

## What Credential Setup Does Today

- The admin validates required fields and encrypts credentials at rest.
- Save, enable/disable, priority, audit history and structural test controls work.
- A provider remains `DEGRADED` until a real provider-specific network adapter
  completes an upstream authenticated health check.
- Adding a key alone does not enable deposits, withdrawals, swaps or live trading.
  Those operations remain fail-closed until the corresponding signed webhook,
  reconciliation, quote, execution and custody adapters are implemented and tested.

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

1. Create Supabase, Monnify, Dojah and Helius sandbox accounts.
2. Configure a long `FIELD_ENCRYPTION_KEY` and persistent `PROVIDER_SECRETS_PATH`.
3. Open Admin -> Providers & API Keys, save the sandbox credentials and run tests.
4. Deploy the API and admin to a private staging environment with HTTPS and MFA.
5. Replace the memory repository with PostgreSQL and migrate the existing workflows.
6. Implement and test provider adapters in the activation order above.
7. Complete independent security, ledger, reconciliation and mobile release reviews.

## Honest Completion Estimate

The product and operational foundation is approximately 45% of a real-money
production launch. Native screens, API contracts, audited Demo workflows,
role-gated administration, encrypted credential intake, provider inventory and
release gates are tangible. Persistent financial infrastructure, provider network
adapters, custody, transaction monitoring, reconciliation, security review and
signed store releases remain substantial.
