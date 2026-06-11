# MemeZo Trust Polish Design

## Goal

Make MemeZo feel like a native daily-use financial app while deepening the financial actions that currently feel shallow. This pass prioritizes trust, clarity, and honest execution over adding more dashboard content.

## Product Direction

- Home behaves like a bank account first: balance, send, recent activity, pending actions, then secondary market content.
- Cards use softer surfaces and fewer visible borders. Status pills are reserved for states that change a decision.
- Advanced details appear only after the user requests them.
- Demo and provider states remain explicit. No unavailable provider action may return a fake success.

## Core Flows

### Multi-asset swap

- Users can select any enabled wallet asset as the source or destination.
- The selector shows symbol, name, balance, Naira value, networks, and route availability.
- A quote explains rate, route, liquidity source, fees, price impact, slippage, and estimated receive.
- Demo quotes are calculations only. Live execution remains blocked until a custody and swap adapter is connected.

### MemeZo internal transfer

- A user can resolve another MemeZo user by tag, phone number, email, or user ID.
- A verified recipient preview appears before amount entry.
- Demo transfers require the Demo PIN, use an idempotency key, and post a balanced double-entry ledger transaction.
- Self-transfers, unknown recipients, invalid PINs, duplicates with altered payloads, and insufficient funds are rejected.
- The response includes a receipt and both parties' resulting balances.

### WhatsApp safety controls

- Each user controls whether payment preparation is enabled, the per-transaction limit, daily limit, trusted recipients, and the amount above which in-app approval is mandatory.
- WhatsApp continues to prepare payments. It never bypasses account verification or risk flags.
- A safe Demo payment can be approved with the Demo PIN when it is within saved limits.
- Large, risky, expired, or disabled WhatsApp approvals fail closed and direct the user to MemeZo.

### AI Pay funding source

- The review screen lets users choose NGN or an enabled crypto asset.
- NGN executes through the existing Demo ledger.
- Crypto sources clearly require a conversion quote and remain disabled until a swap/custody provider is connected.

## Mobile Information Architecture

- Home: balance, five quick actions, send again, recent activity, one attention item, small WhatsApp entry, compact market watch.
- Wallet: total value, internal send, deposit/withdraw/swap/receive, Naira account, assets, recent transactions.
- Swap: focused form with asset selection and expandable quote details.
- WhatsApp: connection, controls, pending approvals, command testing, recent activity.
- P2P and Cards: operational information first; unavailable provider capabilities remain visibly disabled.

## Verification

- API tests cover internal transfer accounting and WhatsApp approval limits.
- Typecheck validates mobile/API contracts.
- Expo Doctor and native exports validate Expo Go compatibility and bundle integrity.
- The audit package documents what is real, simulated, provider-dependent, and blocked for production.
