# Providers Needed

## Required For First Real-Money Launch

| Capability | Primary option | Account |
|---|---|---|
| PostgreSQL/Auth/Storage | Supabase | https://supabase.com/dashboard |
| Virtual accounts/transfers | Monnify or Nomba | https://app.monnify.com/ / https://dashboard.nomba.com/ |
| Payment fallback | Paystack, Flutterwave | https://dashboard.paystack.com/ / https://app.flutterwave.com/ |
| KYC | Dojah | https://app.dojah.io/ |
| OTP | Termii or Sendchamp | https://accounts.termii.com/ / https://my.sendchamp.com/ |
| Solana RPC | Helius | https://dashboard.helius.dev/ |
| EVM RPC | QuickNode or Alchemy | https://dashboard.quicknode.com/ / https://dashboard.alchemy.com/ |
| DEX discovery | DEX Screener, Birdeye | https://dexscreener.com/ / https://bds.birdeye.so/ |
| Solana launch feed | PumpPortal | https://pumpportal.fun/ |
| Solana swaps | Jupiter | https://portal.jup.ag/ |
| Custody/signing | Turnkey or audited equivalent | https://app.turnkey.com/ |
| Email | Resend | https://resend.com/api-keys |
| Push | Expo, Firebase, APNs | https://expo.dev/accounts / https://console.firebase.google.com/ |
| WhatsApp | Meta WhatsApp Cloud API | https://developers.facebook.com/apps/ |
| Observability | Sentry | https://sentry.io/ |

## Optional Product Providers

- VTPass for bills: https://www.vtpass.com/register
- Sudo for cards: https://app.sudo.africa/
- TRM Labs or Chainalysis for transaction screening.
- PostHog for product analytics.
- RevenueCat for mobile subscriptions.
- Zendesk for support operations.
- Emergent Universal LLM for cached explanations only.

## Credential Entry

Development/staging provider credentials are entered in the admin portal under **Providers**. Secrets are encrypted into the configured provider vault and are never returned to clients. Production should replace the local encrypted file with a managed secret manager.
