# MemeZo Finance Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild MemeZo into a trusted daily-use finance experience with multi-chain crypto intelligence and secure WhatsApp assistance.

**Architecture:** Shared Expo UI primitives and deterministic Demo records power consistent mobile screens. Provider-dependent Live actions remain server-gated. The API adds explicit WhatsApp and multi-chain domain records while the separate admin exposes configuration and operational visibility.

**Tech Stack:** Expo SDK 54, Expo Router, React Native, TypeScript, Zustand, Fastify, Zod, React/Vite admin.

---

### Task 1: Shared Finance Design System

**Files:**
- Modify: `apps/mobile/src/theme.ts`
- Modify: `apps/mobile/src/components.tsx`
- Modify: `apps/mobile/src/store.ts`

- [ ] Add dark/light finance palettes, typography, depth and reusable status colors.
- [ ] Add headers, balance visibility, trust/status pills, transaction rows and provider notices.
- [ ] Add persisted in-memory preferences for theme and visible balances.
- [ ] Run `npm run mobile:typecheck`.

### Task 2: Trusted Home And Wallet

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/app/(tabs)/portfolio.tsx`
- Modify: `apps/mobile/src/demo.ts`
- Create: `apps/mobile/app/manage-assets.tsx`
- Create: `apps/mobile/app/notifications.tsx`
- Create: `apps/mobile/app/rewards.tsx`
- Create: `apps/mobile/app/savings.tsx`

- [ ] Add financial account context, recent transactions, recipients and attention states.
- [ ] Add major assets, supported networks and asset visibility controls.
- [ ] Add professional notifications, rewards and future-ready savings journeys.
- [ ] Verify every route has explicit Demo/provider state.

### Task 3: Crypto Receive And Send

**Files:**
- Modify: `apps/mobile/app/crypto-deposit.tsx`
- Modify: `apps/mobile/app/crypto-withdraw.tsx`

- [ ] Require coin and network selection.
- [ ] Show network-specific warnings, copyable Demo addresses and fee/total previews.
- [ ] Keep Live addresses and execution unavailable until custody passes health checks.

### Task 4: Payments And Merchant Experience

**Files:**
- Modify: `apps/mobile/app/(tabs)/pay.tsx`
- Modify: `apps/mobile/app/ai-pay.tsx`
- Modify: `apps/mobile/app/bills.tsx`
- Modify: `apps/mobile/app/cards.tsx`
- Modify: `apps/mobile/app/p2p.tsx`

- [ ] Redesign each route around one primary job.
- [ ] Add verification, balance-after-payment and provider-status clarity.
- [ ] Add bill categories, favorites, card controls and P2P operational tabs.
- [ ] Preserve fail-closed provider behavior.

### Task 5: Account Experience

**Files:**
- Modify: `apps/mobile/app/profile.tsx`
- Modify: `apps/mobile/app/business.tsx`
- Modify: `apps/mobile/app/security.tsx`
- Modify: `apps/mobile/app/transactions.tsx`

- [ ] Add account tiers, limits, devices, privacy, statements and support routes.
- [ ] Convert business onboarding to a five-step KYB journey.
- [ ] Render status-rich transaction records with receipt actions.

### Task 6: WhatsApp Assistant

**Files:**
- Create: `apps/mobile/app/whatsapp.tsx`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `services/api/src/domain/types.ts`
- Modify: `services/api/src/domain/store.ts`
- Modify: `services/api/src/domain/seed.ts`
- Modify: `services/api/src/server.ts`
- Modify: `services/api/test/workflows.test.ts`

- [ ] Add connection, command, message, webhook, approval and template records.
- [ ] Add link/status/command/approval endpoints with Live provider gating.
- [ ] Add secure payment-preparation deep links and merchant alert examples.
- [ ] Test Demo linking, command parsing and payment approval creation.

### Task 7: Multi-Chain Discovery And Sniper

**Files:**
- Modify: `apps/mobile/app/(tabs)/discover.tsx`
- Modify: `apps/mobile/app/(tabs)/bot.tsx`
- Modify: `apps/mobile/app/token/[mint].tsx`
- Modify: `services/api/src/domain/types.ts`
- Modify: `services/api/src/domain/seed.ts`
- Modify: `services/api/src/server.ts`

- [ ] Add chain, DEX/source, age, buy pressure and contract-warning metadata.
- [ ] Add DEX, Early Solana and Watchlist source modes.
- [ ] Clearly label high-risk early-launch data and simulated scanner activity.

### Task 8: Admin Operations

**Files:**
- Modify: `apps/admin/src/main.tsx`
- Modify: `services/api/src/server.ts`

- [ ] Add WhatsApp Assistant, assets/networks and rewards navigation.
- [ ] Expose connection/message/webhook records and provider setup health.
- [ ] Keep credentials in the provider-vault workflow.

### Task 9: Verification

**Files:**
- Modify: `docs/AUDIT.md`
- Modify: `docs/LAUNCH_ROADMAP.md`

- [ ] Run `npm test`.
- [ ] Run `npm run platform:typecheck`.
- [ ] Run `npm run admin:build`.
- [ ] Run `npx expo-doctor@latest`.
- [ ] Export iOS and Android bundles.
- [ ] Run `git diff --check` and scan for secrets and stale branding.
