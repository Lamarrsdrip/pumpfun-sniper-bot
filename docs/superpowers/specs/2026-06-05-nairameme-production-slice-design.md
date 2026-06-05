# NairaMeme First Production Slice Design

## Purpose

NairaMeme is a Nigerian-first mobile crypto ecosystem for Naira deposits, crypto and meme-coin trading, market discovery, AI-assisted research, automated trading, bounties, communities, and Naira withdrawals.

This specification defines the first production slice. It is not a promise that the entire regulated financial platform can launch from one implementation cycle. The slice establishes the real identity, wallet, KYC, provider-control, audit, and Demo/Live foundations on which later payments and trading slices depend.

## Approved Product Decisions

- Build in vertical production slices.
- Expo React Native is the iOS and Android client.
- Supabase provides PostgreSQL, authentication, sessions, and storage.
- Email/password authentication is always available.
- Phone OTP is optional and controlled from admin.
- Termii is the first active SMS adapter; Sendchamp is a disabled fallback adapter.
- Users may enter the app immediately after registration.
- Live deposits, withdrawals, trading, Auto Sniper, and copy trading remain locked until KYC approval and provider readiness.
- Dojah is the first active KYC provider.
- KYC uses an adapter architecture with admin-managed priority and enablement.
- NairaMeme Wallet is the default experience.
- External wallets are hidden under Settings > Advanced Features.
- Custody is hybrid: a managed NairaMeme experience with optional external-wallet connections.
- Monnify is the primary Naira payment adapter.
- Paystack and Flutterwave are ordered backup adapters.
- Trading uses provider routing across Jupiter and Pump.fun/PumpSwap-compatible adapters.
- Market data uses Helius, PumpPortal, Birdeye, and DexScreener.
- Resend is the primary email provider.
- Amazon SES and Google Workspace SMTP relay are supported fallbacks.
- Expo Push is the initial push provider, with Firebase and APNs production adapters.
- Emergent Universal Key is the configurable LLM gateway.
- Deterministic rules, not an LLM, authorize trading and risk decisions.
- Demo Mode is clearly labelled and isolated from Live Mode.
- Live Mode never falls back to fabricated balances, prices, transactions, or provider states.

## System Architecture

### Mobile Client

The Expo application owns presentation, local interaction state, secure session storage, navigation, and user confirmations. It does not hold provider secrets, custody keys, authoritative balances, final quotes, or transaction outcomes.

The primary mobile navigation is:

1. Home
2. Discover
3. Portfolio
4. Earn
5. Network
6. Auto Sniper

NairaMeme Wallet is the default wallet surface. NGN is the primary display currency, and all supported asset balances include an NGN equivalent.

### NairaMeme API

The API owns:

- authorization and role enforcement;
- account and profile workflows;
- KYC eligibility and restrictions;
- wallet account provisioning;
- financial ledger commands;
- provider routing;
- provider webhook ingestion;
- admin operations;
- audit records;
- Demo/Live environment isolation;
- market intelligence and trading orchestration.

### Supabase

Supabase provides:

- email/password registration and login;
- email verification;
- password reset;
- refreshable user sessions;
- PostgreSQL data storage;
- storage for KYC and receipt documents;
- row-level access policies where appropriate.

Supabase Auth identity is mapped to a NairaMeme user record. Business authorization remains server-controlled rather than trusting client metadata.

### Provider Adapter Layer

Each provider family exposes a stable internal interface:

- identity and OTP;
- KYC;
- payments;
- market data;
- Solana RPC;
- trading;
- email;
- push notifications;
- AI.

The admin portal can configure, enable, disable, test, and prioritize already implemented adapters without a code deployment. Supporting a provider whose API has not been implemented still requires a backend adapter release.

Provider credentials are encrypted or stored through a secret manager. APIs return only masked credential status.

## Demo And Live Isolation

Every environment-scoped business record includes an explicit `mode` value: `DEMO` or `LIVE`.

Demo Mode:

- contains seeded users, balances, tokens, positions, transactions, alerts, bounties, and provider simulations;
- exercises the same API commands and validation stages used by Live Mode;
- uses a simulation ledger and simulated provider adapters;
- displays “Demo Mode - Not Real Money” persistently;
- never writes to Live ledgers or provider credentials.

Live Mode:

- requires real provider configuration and health;
- contains no generated market, balance, deposit, withdrawal, or trade records;
- fails closed when a required provider is unavailable;
- requires KYC and applicable limits before regulated actions;
- cannot silently switch to Demo Mode.

An account may access both modes, but balances, transactions, positions, limits, and reports remain separate.

## Authentication And Session Flow

### Registration

1. User chooses email/password or optional phone OTP.
2. Supabase creates and verifies the authentication identity.
3. The API creates a NairaMeme profile and assigns the default user role.
4. The API provisions Demo wallet accounts immediately.
5. The API provisions empty Live wallet accounts without adding funds.
6. The app opens with KYC status visible and restricted Live actions labelled.

### Email Authentication

- Registration
- Email verification
- Login
- Password reset
- Password change
- Logout
- Session revocation
- Friendly duplicate-account and invalid-credential errors

### Optional Phone OTP

- Controlled by an admin feature switch.
- Termii is the active default adapter.
- Sendchamp can be configured as fallback.
- OTPs are short-lived, rate-limited, attempt-limited, and never logged in plaintext.
- Provider failover must not send duplicate messages after a successful response.
- Email authentication remains available when SMS is disabled or degraded.

### Session Security

- Supabase access tokens are verified by the API.
- Refresh tokens remain in platform-secure storage.
- Sensitive account changes require recent authentication.
- Admin sessions require separate admin role claims and stronger controls.
- Production admin access requires MFA before release.

## KYC And Access Control

Users can browse Demo Mode and non-sensitive Live content immediately after registration.

KYC statuses:

- `NOT_STARTED`
- `IN_PROGRESS`
- `PENDING_REVIEW`
- `APPROVED`
- `REJECTED`
- `MORE_INFORMATION_REQUIRED`
- `EXPIRED`

Restricted actions include Live deposits, withdrawals, trading, Auto Sniper, copy trading, and increased limits.

Dojah is the first active provider. Provider responses are stored as normalized results and linked to immutable raw webhook/event records. Admins can approve, reject, request information, or escalate a case. Every manual decision requires a reason and generates an audit event.

## NairaMeme Wallet And Ledger

New users receive wallet accounts for:

- NGN
- USDT
- USDC
- SOL
- ETH
- BTC
- supported meme-coin assets when positions are created

Balances are derived from immutable double-entry ledger transactions. A mutable balance column is not the financial source of truth.

Every ledger transaction includes:

- mode;
- currency or asset;
- debit and credit entries;
- source command;
- idempotency key;
- provider reference where applicable;
- fee entries;
- timestamp;
- reversal relationship when applicable.

Demo seed balances are created through ledger entries, not direct balance mutation.

## Payment Provider Design

The first production slice builds configuration and adapter contracts. Live movement of money remains disabled until each adapter, webhook verification, reconciliation process, and operational approval flow passes testing.

Provider order:

1. Monnify
2. Paystack
3. Flutterwave

Admin capabilities:

- configure credentials through secret references;
- select the primary provider;
- prioritize fallbacks;
- enable or disable providers;
- test health;
- view latency and latest error;
- inspect webhook status;
- manually approve a payment after review;
- require a reason for manual credit or rejection.

Duplicate prevention uses platform idempotency keys, provider references, signed webhook event IDs, and ledger uniqueness constraints.

Automatic fallback occurs only before a provider has accepted the operation. Ambiguous withdrawals are reconciled before retrying.

## Market Data And Trading Design

Market data priority:

1. Helius for Solana RPC and blockchain events
2. PumpPortal for Pump.fun launches and trade streams
3. Birdeye for enriched market and holder data
4. DexScreener for fallback and cross-checking

Every market value carries source, observation time, receive time, and freshness status.

Trading routing compares eligible Jupiter and Pump.fun/PumpSwap-compatible routes for:

- executable price;
- liquidity;
- slippage;
- fees;
- expected output;
- route health;
- transaction confidence.

Live trade execution remains unavailable until a secure custody/signing solution, reconciliation, risk controls, and legal release approval exist.

## Runner AI And Emergent Cost Controls

Runner scoring remains deterministic and explainable. Rules process market events continuously without invoking an LLM.

Emergent is used for:

- plain-language summaries of shortlisted tokens;
- explanation of unusual risk combinations;
- post-trade and missed-opportunity reviews;
- admin-assisted incident summaries;
- content moderation assistance where approved.

Emergent does not approve or initiate a trade.

Cost controls:

- minimum deterministic score before an AI request;
- material-change threshold before regenerating analysis;
- cached analysis by token, feature version, and market snapshot;
- cheap default model;
- optional review model for exceptional cases;
- short structured prompts;
- strict input and output token limits;
- per-minute, hourly, and daily request limits;
- daily credit budget;
- per-user entitlement budget;
- timeout and retry limit;
- rules-only fallback when unavailable or over budget;
- usage and cache-hit reporting.

Admin configuration includes API base URL, encrypted Universal Key reference, model IDs, routing policy, budget limits, cache lifetime, token limits, timeouts, test connection, health, and emergency disable.

## Admin Portal

The portal is an operations application, not a status page.

### Navigation

- Overview
- Users and KYC
- Deposits
- Withdrawals
- Trades
- Tokens and Runner AI
- Auto Sniper
- Copy Trading
- Bounties and Campaigns
- Providers
- Fees and Limits
- Notifications
- Audit Log
- Incidents
- Staff and Roles

### First-Slice Working Modules

#### Overview

Shows users, active users, KYC queue, Demo and Live wallet counts, pending approvals, provider health, risk alerts, and system status. Values come from API queries rather than static UI constants.

#### Users And KYC

- Search by name, email, phone, or user ID.
- View profile, mode-specific wallets, session state, KYC history, notes, and restrictions.
- Approve, reject, or request KYC information.
- Suspend and unsuspend accounts.
- Add internal notes.
- Display every related audit event.

#### Providers

- Provider family and adapter.
- Enabled status and priority.
- Credential/setup fields.
- Plain instructions and account-registration links.
- Masked secret state.
- Test connection.
- Latest health, latency, error, and test time.
- Save, disable, reprioritize, and emergency-stop actions.

#### Audit Log

Records:

- actor;
- action;
- target type and ID;
- old value;
- new value;
- reason;
- timestamp;
- IP and device metadata when available;
- request correlation ID.

Audit records are append-only to normal admin roles.

### Honest Incomplete Modules

Modules scheduled for later production slices use complete navigable layouts and setup guidance but do not expose inert action buttons. Any unavailable operation explains the exact missing adapter, permission, approval, or release gate.

## Roles And Permissions

Initial roles:

- `SUPER_ADMIN`
- `OPERATIONS`
- `COMPLIANCE`
- `FINANCE`
- `SUPPORT`
- `RISK`
- `MARKETING`
- `READ_ONLY`

Permissions are checked by the API per action. Hiding a control in the frontend is not authorization.

High-risk actions can require a second approval:

- manual Live credit;
- withdrawal approval above threshold;
- provider credential change;
- fee change;
- global trading or bot enablement;
- incident emergency actions.

## UX Direction

### Mobile

- Premium Nigerian fintech character.
- NGN-first amounts and language.
- Dark and light themes.
- Clear hierarchy and simple primary actions.
- Persistent Demo/Live indicator.
- No external-wallet interruption during onboarding.
- External wallets under Settings > Advanced Features.
- Loading, success, error, restricted, and retry states.
- No blank pages.

### Admin

- Dense but calm operational layout.
- Tables for entities, drawers for detail, modals for focused actions.
- Global search and an attention queue.
- Clear button hierarchy.
- No repeated “release gate not ready” cards.
- Every empty state explains the next operational action.
- Setup pages explain where to obtain required accounts and credentials.

## Error Handling

- APIs return stable error codes and beginner-readable messages.
- Provider errors are normalized but raw diagnostic details remain available to authorized staff.
- Financial commands are idempotent.
- Network retries never duplicate financial actions.
- Failed workflows expose retry, cancel, or support paths.
- Live provider failures do not trigger synthetic success states.

## Testing And Audit

### Automated Tests

- registration and login;
- optional OTP and rate limits;
- session verification and revocation;
- Demo/Live data isolation;
- wallet provisioning;
- ledger balancing and idempotency;
- KYC restrictions and transitions;
- admin permission checks;
- provider configuration masking;
- provider priority and failover decisions;
- audit log creation;
- AI budget, cache, and rules-only fallback;
- API validation and error shape.

### Application Verification

- iOS Expo bundle and device preview;
- Android Expo bundle and emulator/device preview;
- mobile layouts and accessibility;
- all navigation routes;
- every visible button;
- loading, success, error, and restricted states;
- admin desktop and narrow viewport;
- API typechecking and tests;
- dependency and secret scanning.

### Security Review

- authorization bypass;
- broken object-level authorization;
- secret leakage;
- webhook forgery;
- duplicate financial operations;
- ledger imbalance;
- session fixation and token misuse;
- unsafe admin actions;
- audit-log tampering;
- Demo/Live crossover.

No audit can prove software has no bugs. Completion means all reproducible defects found by the agreed verification are fixed or recorded with severity, impact, and a release decision.

## Delivery Boundaries

This first slice is complete when:

- real Supabase authentication works;
- optional Termii OTP is admin-controlled;
- users enter immediately and see correct restrictions;
- Dojah KYC workflow and admin decisions work;
- Demo and Live wallet accounts are provisioned;
- Demo data is seeded through real service contracts;
- admin user/KYC/provider/audit workflows are functional;
- Expo iOS and Android builds pass;
- tests and documented manual checks pass.

This slice does not claim production readiness for:

- live custody;
- live Naira settlement;
- live crypto execution;
- withdrawals;
- copy trading;
- Auto Sniper execution;
- regulated launch.

Those require later vertical slices, provider credentials, security reviews, reconciliation testing, operating procedures, and legal approval.

## Implementation Order

1. Supabase schema, migrations, environment model, and local development setup.
2. Authentication and session middleware.
3. User profile, role, KYC, wallet, ledger, provider, and audit domains.
4. Demo seed system and strict mode isolation.
5. Mobile onboarding, authentication, KYC status, wallet, and mode experience.
6. Admin users, KYC, providers, and audit modules.
7. Termii and Dojah adapters with safe disabled states until configured.
8. Test coverage, Expo verification, security review, and defect repair.
9. Plain-language setup and launch documentation.
