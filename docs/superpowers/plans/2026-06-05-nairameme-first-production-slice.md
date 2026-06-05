# NairaMeme First Production Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a testable NairaMeme production foundation with honest Demo/Live isolation, Supabase-ready authentication, wallet and ledger accounting, KYC restrictions, provider controls, audit logs, usable mobile flows, and a real operations admin portal.

**Architecture:** The Fastify API owns business authorization and financial state. A repository abstraction provides deterministic local development storage and a Supabase/PostgreSQL-ready boundary without putting secrets in clients. The Expo app and React admin portal consume typed JSON APIs; provider adapters fail closed in Live Mode and simulated adapters operate only in clearly labelled Demo Mode.

**Tech Stack:** TypeScript, Fastify, Zod, Node test runner, Expo Router, React Native, Zustand, React/Vite, Supabase-compatible PostgreSQL schema, secure environment variables.

---

## File Structure

### API

- `services/api/src/domain/types.ts`: shared business enums and entity types.
- `services/api/src/domain/store.ts`: repository interface and in-memory development implementation.
- `services/api/src/domain/seed.ts`: deterministic Demo Mode seed records.
- `services/api/src/domain/ledger.ts`: balanced ledger posting and wallet summaries.
- `services/api/src/domain/audit.ts`: append-only audit command helpers.
- `services/api/src/auth/service.ts`: registration, login, session, logout, and OTP policy.
- `services/api/src/auth/middleware.ts`: user/admin session authorization.
- `services/api/src/kyc/service.ts`: KYC state transitions and Live feature restrictions.
- `services/api/src/providers/catalog.ts`: implemented provider definitions and setup guidance.
- `services/api/src/providers/service.ts`: provider configuration, prioritization, masking, testing, and health.
- `services/api/src/routes/mobile.ts`: mobile profile, home, wallet, auth, KYC, and mode endpoints.
- `services/api/src/routes/admin.ts`: overview, users, KYC, providers, and audit endpoints.
- `services/api/src/server.ts`: Fastify composition and shared error handling only.
- `services/api/supabase/migrations/0001_foundation.sql`: production PostgreSQL schema and constraints.
- `services/api/test/*.test.ts`: domain and route integration coverage.

### Mobile

- `apps/mobile/src/session.ts`: persisted session and mode state.
- `apps/mobile/src/types.ts`: API response types.
- `apps/mobile/src/components/*`: reusable buttons, fields, banners, rows, cards, and states.
- `apps/mobile/app/auth.tsx`: sign-in and registration.
- `apps/mobile/app/verify.tsx`: email/OTP verification.
- `apps/mobile/app/kyc.tsx`: KYC status and submission.
- `apps/mobile/app/(tabs)/*`: Home, Discover, Portfolio, Earn, Network, and Auto Sniper.
- `apps/mobile/app/settings.tsx`: logout, mode, and Advanced Features.
- `apps/mobile/app/deposit.tsx`, `withdraw.tsx`, and trade routes: Demo workflows and honest Live restrictions.

### Admin

- `apps/admin/src/api.ts`: typed API client and error normalization.
- `apps/admin/src/types.ts`: admin entity types.
- `apps/admin/src/components/*`: shell, tables, filters, forms, status, drawer, and confirmation dialog.
- `apps/admin/src/pages/*`: Overview, Users/KYC, Providers, Audit, and operational setup pages.
- `apps/admin/src/main.tsx`: application routing and composition.
- `apps/admin/src/styles.css`: responsive fintech operations design system.

### Documentation

- `.env.example`: all external accounts and variables with safe examples.
- `docs/SETUP.md`: local setup, Supabase, providers, test users, and preview.
- `docs/LAUNCH-ROADMAP.md`: production blockers and exact next steps.

---

### Task 1: Domain Store, Demo Seed, And Demo/Live Isolation

**Files:**
- Create: `services/api/src/domain/types.ts`
- Create: `services/api/src/domain/store.ts`
- Create: `services/api/src/domain/seed.ts`
- Create: `services/api/test/store.test.ts`

- [ ] **Step 1: Write failing isolation and seed tests**

Test that:

```ts
const store = createMemoryStore(seedDemoData());
const demo = await store.listUsers({ mode: 'DEMO' });
const live = await store.listUsers({ mode: 'LIVE' });
assert.ok(demo.length >= 3);
assert.equal(live.every((user) => user.mode === 'LIVE'), true);
assert.equal(demo.some((user) => live.some((item) => item.id === user.id)), false);
```

Also verify seeded tokens, alerts, bounties, wallets, and transactions use realistic names and deterministic IDs.

- [ ] **Step 2: Run test and verify failure**

Run: `npm test --workspace @nairameme/api -- store.test.ts`

Expected: FAIL because the domain store does not exist.

- [ ] **Step 3: Implement focused entity types and repository**

Define `Mode`, `User`, `WalletAccount`, `LedgerTransaction`, `KycCase`, `ProviderConfig`, `AuditEvent`, `TokenSnapshot`, `Bounty`, and query filters. Implement a memory store with cloned inputs, stable ordering, and explicit mode filters.

- [ ] **Step 4: Add deterministic Demo seed**

Seed realistic Nigerian profiles, NGN wallet balances, supported crypto assets, meme tokens, transaction history, Runner AI scores, alerts, bounties, and one pending KYC case. Seed Live Mode with empty financial accounts only.

- [ ] **Step 5: Run tests**

Run: `npm test --workspace @nairameme/api`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add services/api/src/domain services/api/test/store.test.ts
git commit -m "Build isolated demo and live domain store"
```

### Task 2: Ledger, Wallet Provisioning, And Financial Invariants

**Files:**
- Create: `services/api/src/domain/ledger.ts`
- Create: `services/api/test/ledger.test.ts`
- Create: `services/api/supabase/migrations/0001_foundation.sql`

- [ ] **Step 1: Write failing ledger tests**

Cover:

```ts
await provisionWallets(store, userId, 'DEMO');
await postLedgerTransaction(store, {
  mode: 'DEMO',
  idempotencyKey: 'seed-credit-user-1',
  entries: [
    { accountId: 'platform-demo-funding-ngn', side: 'DEBIT', amount: '500000.00' },
    { accountId: 'user-1-ngn', side: 'CREDIT', amount: '500000.00' }
  ]
});
assert.equal(await walletBalance(store, 'user-1-ngn'), '500000.00');
await assert.rejects(() => postLedgerTransaction(store, unbalancedTransaction));
```

Verify idempotent replay returns the original transaction and does not duplicate balances.

- [ ] **Step 2: Run test and verify failure**

Run: `npm test --workspace @nairameme/api -- ledger.test.ts`

- [ ] **Step 3: Implement decimal-safe ledger operations**

Use integer minor units internally. Reject cross-mode entries, negative amounts, unknown accounts, unbalanced transactions, and reused idempotency keys with different payloads.

- [ ] **Step 4: Add PostgreSQL migration**

Create tables and constraints for profiles, roles, sessions, KYC cases, wallet accounts, ledger transactions, ledger entries, providers, audit events, tokens, bounties, and mode separation. Include unique idempotency and provider-event constraints.

- [ ] **Step 5: Run tests and SQL static checks**

Run:

```bash
npm test --workspace @nairameme/api
rg -n "idempotency_key|CHECK|mode|audit_events" services/api/supabase/migrations/0001_foundation.sql
```

- [ ] **Step 6: Commit**

```bash
git add services/api/src/domain/ledger.ts services/api/test/ledger.test.ts services/api/supabase
git commit -m "Add wallet ledger and financial constraints"
```

### Task 3: Authentication, Sessions, OTP Policy, And KYC

**Files:**
- Create: `services/api/src/auth/service.ts`
- Create: `services/api/src/auth/middleware.ts`
- Create: `services/api/src/kyc/service.ts`
- Create: `services/api/src/domain/audit.ts`
- Create: `services/api/test/auth-kyc.test.ts`

- [ ] **Step 1: Write failing authentication and KYC tests**

Verify:

- email registration creates profile and both mode wallet sets;
- password login creates a short-lived development session;
- logout revokes the session;
- OTP is rejected when admin policy disables it;
- OTP attempts and resend frequency are limited;
- unapproved users can enter but cannot use Live financial commands;
- KYC transitions require valid state changes;
- manual admin decisions create audit events.

- [ ] **Step 2: Run test and verify failure**

Run: `npm test --workspace @nairameme/api -- auth-kyc.test.ts`

- [ ] **Step 3: Implement development and Supabase-ready auth boundary**

Define an `IdentityAdapter`. The local adapter hashes development passwords and produces opaque sessions. The Supabase adapter configuration validates URL and keys and returns `PROVIDER_NOT_CONFIGURED` until credentials exist. Never expose service-role keys.

- [ ] **Step 4: Implement KYC policy**

Create allowed transitions, Live action guards, Dojah provider state, manual review actions, and audit helpers.

- [ ] **Step 5: Run tests**

Run: `npm test --workspace @nairameme/api`

- [ ] **Step 6: Commit**

```bash
git add services/api/src/auth services/api/src/kyc services/api/src/domain/audit.ts services/api/test/auth-kyc.test.ts
git commit -m "Add authentication sessions and KYC controls"
```

### Task 4: Provider Catalog, Health, Emergent Budgeting, And Admin APIs

**Files:**
- Create: `services/api/src/providers/catalog.ts`
- Create: `services/api/src/providers/service.ts`
- Create: `services/api/src/ai/budget.ts`
- Create: `services/api/src/routes/admin.ts`
- Create: `services/api/test/admin-operations.test.ts`
- Modify: `services/api/src/server.ts`
- Modify: `services/api/src/config.ts`

- [ ] **Step 1: Write failing admin API tests**

Cover:

- overview returns real seeded counts;
- user search supports name, email, phone, and ID;
- KYC approval changes status and records audit;
- suspension and notes persist;
- provider list includes Monnify, Paystack, Flutterwave, Dojah, Termii, Sendchamp, Resend, SES, Google Workspace, Helius, PumpPortal, Birdeye, DexScreener, Jupiter, PumpSwap, Expo Push, Firebase, APNs, Supabase, and Emergent;
- priority and enabled changes work;
- secrets are always masked;
- provider tests return health and clear configuration errors;
- Emergent requests stop at budget and use cache.

- [ ] **Step 2: Run test and verify failure**

Run: `npm test --workspace @nairameme/api -- admin-operations.test.ts`

- [ ] **Step 3: Implement provider catalog and service**

Each catalog entry includes family, display name, setup URL, required fields, secret fields, default priority, supported capabilities, and health-test strategy.

- [ ] **Step 4: Implement AI budget policy**

Add deterministic eligibility, cache keying, material-change checks, request and token caps, daily credit budget, and rules-only fallback. No LLM path may authorize trades.

- [ ] **Step 5: Implement admin routes**

Add overview, users, user detail, notes, suspension, KYC decisions, providers, provider updates, tests, audit list, and system status.

- [ ] **Step 6: Run API test and typecheck**

Run:

```bash
npm test --workspace @nairameme/api
npm run typecheck --workspace @nairameme/api
```

- [ ] **Step 7: Commit**

```bash
git add services/api/src services/api/test
git commit -m "Build provider controls and admin operations API"
```

### Task 5: Mobile Authentication, Mode, Wallet, And KYC Experience

**Files:**
- Create: `apps/mobile/src/types.ts`
- Create: `apps/mobile/src/session.ts`
- Create: `apps/mobile/src/components/app-shell.tsx`
- Create: `apps/mobile/src/components/mode-banner.tsx`
- Create: `apps/mobile/src/components/form-field.tsx`
- Create: `apps/mobile/src/components/status-state.tsx`
- Modify: `apps/mobile/src/api.ts`
- Modify: `apps/mobile/app/auth.tsx`
- Create: `apps/mobile/app/verify.tsx`
- Modify: `apps/mobile/app/kyc.tsx`
- Modify: `apps/mobile/app/(tabs)/_layout.tsx`
- Modify: all mobile tab routes
- Create: `apps/mobile/app/settings.tsx`

- [ ] **Step 1: Add session and API behavior tests where practical**

Extract pure session/mode parsing and response helpers into testable functions. Verify tokens persist, logout clears credentials, mode headers are sent, and API errors remain readable.

- [ ] **Step 2: Implement authentication screens**

Provide sign in, create account, password reset request, optional phone OTP when enabled, loading, error, verification, and successful session states. Add a clearly labelled Demo access route for local development.

- [ ] **Step 3: Implement mode and KYC experience**

Persist Demo/Live selection. Display a persistent Demo banner. In Live Mode, disabled actions open a restriction sheet explaining KYC or provider requirements.

- [ ] **Step 4: Build active Home and Portfolio surfaces**

Use seeded API data for balance, quick actions, trending memes, Runner AI, alerts, holdings, PnL, and history. Every button navigates or invokes a real API command.

- [ ] **Step 5: Build Discover, Earn, Network, and Auto Sniper preview workflows**

Use Demo API data and functional filtering/navigation. Live unavailable actions explain requirements instead of pretending to execute.

- [ ] **Step 6: Verify mobile**

Run:

```bash
npm run mobile:typecheck
EXPO_PUBLIC_API_URL=http://127.0.0.1:8790 npx expo export --platform ios --clear
EXPO_PUBLIC_API_URL=http://127.0.0.1:8790 npx expo export --platform android --clear
```

- [ ] **Step 7: Commit**

```bash
git add apps/mobile
git commit -m "Build NairaMeme mobile account and wallet experience"
```

### Task 6: Real Operations Admin Portal

**Files:**
- Create: `apps/admin/src/api.ts`
- Create: `apps/admin/src/types.ts`
- Create: `apps/admin/src/components/*`
- Create: `apps/admin/src/pages/overview.tsx`
- Create: `apps/admin/src/pages/users.tsx`
- Create: `apps/admin/src/pages/providers.tsx`
- Create: `apps/admin/src/pages/audit.tsx`
- Create: `apps/admin/src/pages/operations.tsx`
- Modify: `apps/admin/src/main.tsx`
- Modify: `apps/admin/src/styles.css`

- [ ] **Step 1: Split the monolithic admin component**

Create a shell with grouped navigation, global search, environment status, attention count, notices, and responsive mobile navigation.

- [ ] **Step 2: Build Overview**

Render total/active users, deposits, withdrawals, trading volume, fees, bot revenue, approvals, risk alerts, provider health, and system status from API responses. Include an attention queue and operational timeline.

- [ ] **Step 3: Build Users And KYC**

Add search, filters, paginated table, user detail drawer, wallets, activity, KYC decision form, suspension control, and internal notes.

- [ ] **Step 4: Build Providers**

Add provider family filters, priority controls, enable/disable, required setup fields, masked secrets, setup links, save, test, health, errors, and Emergent budget controls.

- [ ] **Step 5: Build Audit And Operations**

Add searchable audit table and honest operational pages for deposits, withdrawals, trades, Runner AI, Auto Sniper, bounties, fees, notifications, and incidents. Expose only API-backed actions; otherwise provide setup action links without inert buttons.

- [ ] **Step 6: Build and responsive-test**

Run:

```bash
npm run admin:build
```

Check 1440px, 1024px, and 390px layouts in the in-app browser.

- [ ] **Step 7: Commit**

```bash
git add apps/admin
git commit -m "Rebuild admin as operations control plane"
```

### Task 7: Documentation, Full Audit, And Release Verification

**Files:**
- Create or modify: `.env.example`
- Create: `docs/SETUP.md`
- Create: `docs/LAUNCH-ROADMAP.md`
- Modify: `README.md`
- Modify: `docs/AUDIT.md`

- [ ] **Step 1: Document every account and variable**

Cover Supabase, Termii, Sendchamp, Dojah, Monnify, Paystack, Flutterwave, Resend, SES, Google Workspace, Expo, Firebase, APNs, Helius, PumpPortal, Birdeye, DexScreener, Jupiter, PumpSwap, Emergent, secret manager, and deployment.

- [ ] **Step 2: Add click-by-click local setup**

Include install, environment setup, seed, API, mobile QR, admin, test credentials, Demo/Live behavior, troubleshooting, and reset instructions.

- [ ] **Step 3: Run complete verification**

Run:

```bash
npm test
npm run simulate
npm run platform:typecheck
npm run admin:build
npx expo-doctor@latest
EXPO_PUBLIC_API_URL=http://127.0.0.1:8790 npx expo export --platform ios --clear
EXPO_PUBLIC_API_URL=http://127.0.0.1:8790 npx expo export --platform android --clear
npm audit --omit=dev
git diff --check
```

- [ ] **Step 4: Perform security and workflow audit**

Review authorization, object ownership, secret exposure, Demo/Live crossover, ledger balance, idempotency, KYC bypass, unsafe admin actions, provider masking, broken buttons, mobile overflow, and error states. Fix every reproducible defect.

- [ ] **Step 5: Update audit and launch roadmap**

List completed work, remaining providers, API keys, accounts, legal work, testing, production blockers, App Store blockers, Google Play blockers, immediate next steps, and honest completion percentage.

- [ ] **Step 6: Commit**

```bash
git add .env.example README.md docs
git commit -m "Document NairaMeme setup audit and launch roadmap"
```
