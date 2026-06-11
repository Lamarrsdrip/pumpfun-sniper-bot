# MemeZo Foundation Audit

Audit date: 2026-06-05

## Verified and Fixed

- Expo configuration and native package compatibility pass all Expo Doctor checks.
- Mobile login and KYC no longer advance without backend provider confirmation.
- Mobile market status no longer says live when market providers are missing.
- Unsupported mobile actions are disabled and clearly labelled.
- Admin provider tests, campaign drafts, navigation, and emergency pause requests call real API routes.
- Admin API CORS is restricted to configured origins.
- Production admin routes fail closed without a valid admin token.
- Provider secrets are rejected until a server-side secret manager adapter exists.
- Campaign email drafts fail clearly when email delivery is unavailable.
- API validation errors return HTTP 400 rather than HTTP 500.
- API startup uses a dedicated executable entry point and was verified on port 8790.
- Prisma schema validates and now includes user ownership relations for previously orphanable records.
- Ledger entries belong to idempotent ledger transactions instead of free-form transaction groups.
- Legacy static-file routing blocks sibling-prefix traversal and malformed encoded paths.
- Legacy JSON request bodies are bounded.
- API-fed HTML values identified in the legacy terminal are escaped.
- Synthetic equity and token charts were removed; missing data now renders an honest empty state.
- Repository secret, build, log, database, certificate, and environment files are ignored.

## Verification Evidence

- `npm test`
- `npm run simulate`
- `npm run platform:typecheck`
- `npm run admin:build`
- `npx expo-doctor apps/mobile`
- `npx prisma validate --schema prisma/schema.prisma`
- API `/health`, `/v1/mobile/home`, and provider-gated authentication checked against a running process.
- Admin desktop actions and 390px mobile layout checked in the in-app browser.

## Release Blockers

This repository is a production-oriented foundation, not a deployable custodial exchange yet.

- No regulated Naira payment adapter, signed webhook processor, reconciliation worker, or withdrawal processor is implemented.
- No production authentication, OTP, KYC, sanctions, device-risk, or account-recovery provider is connected.
- No custodial wallet, MPC/HSM signer, audited swap router, or real-money execution adapter is implemented.
- No PostgreSQL migrations, transactional ledger-posting service, or reconciliation jobs have been run against a managed database.
- Campaigns are provider-gated drafts; recipient selection, consent queries, persistence, approval, and delivery workers remain to be implemented.
- Social posting, copy trading, subscriptions, push delivery, and Auto Sniper execution are represented in the model/UI but remain disabled.
- Admin API authentication currently supports a fail-closed server token for direct API/bootstrap operations only; it is not exposed to the Vite client. Production portal access requires SSO/OIDC, role claims, short-lived sessions, MFA, and server-side audit identity.
- App Store assets, privacy manifests, policies, legal terms, support URLs, store metadata, Apple/Google accounts, and Nigerian regulatory approvals remain required.
- Real-market profitability is unproven. The simulator verifies mechanics only and is not evidence of future returns.

## Dependency Advisory Note

`npm audit` currently reports moderate advisories in the current Expo 56 and Prisma 7 toolchains. npm's suggested automatic fixes are incompatible major downgrades. No high or critical advisories were reported. Recheck and upgrade when patched SDK-compatible releases are available; do not use `npm audit fix --force`.
