# MemeZo Provider Readiness

## Required for Initial Nigerian Launch

| Capability | Preferred Provider | Status |
|---|---|---|
| Virtual accounts and bank transfers | Monnify or Nomba | Adapter contract ready; credentials and sandbox certification required |
| Backup payments | Paystack / Flutterwave | Configuration UI ready; adapter implementation required |
| KYC/KYB | Dojah | Configuration UI ready; workflow adapter required |
| OTP | Termii | Configuration UI ready; adapter required |
| Email | Resend | Configuration UI ready; adapter required |
| WhatsApp | Meta WhatsApp Cloud API | Secure preparation model ready; signed webhook and outbound adapter required |
| Solana RPC | Helius | Configuration UI ready; live RPC adapter required |
| Multi-chain RPC | QuickNode or Alchemy | Configuration UI ready; chain routing required |
| Swap routing | Jupiter | Quote/execution contract ready; signing and settlement required |
| Crypto custody/signing | Turnkey | Configuration UI ready; custody integration and audit required |
| Monitoring | Sentry | Configuration UI ready; SDK initialization required |

## Optional but Recommended

- TRM Labs or Chainalysis for wallet screening
- PostHog for consent-aware product analytics
- Zendesk for support operations
- RevenueCat for mobile subscriptions
- Secondary KYC provider for failover
- Secondary payment provider for failover

## Readiness Rules

- `configured` means credentials are present.
- `tested` means a real provider health request succeeded.
- `connected` must only appear after a successful health test.
- Payment webhooks must be signature-verified and idempotent.
- Provider state must be reconciled against internal state.
- A missing provider must produce a clear unavailable state, never fake success.

## Credential Location

Credentials belong in server environment variables or the encrypted provider vault. They must never be embedded in Expo or admin frontend bundles.
