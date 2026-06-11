# MemeZo Trust Polish Implementation Plan

**Goal:** Deliver a quieter native finance experience with working internal transfers, complete multi-asset quote UX, bounded WhatsApp approvals, and an external audit package.

**Architecture:** Extend the existing Fastify in-memory development domain with explicit internal-transfer and WhatsApp-policy records. Preserve double-entry accounting and mode isolation. Keep swap execution provider-gated while improving the mobile quote and route model.

**Tech Stack:** Expo SDK 54, React Native, Expo Router, Fastify, TypeScript, Node test runner.

---

### Task 1: Add failing financial workflow tests

**Files:**
- Modify: `services/api/test/workflows.test.ts`

Add tests for recipient resolution, balanced internal transfer, self-transfer rejection, WhatsApp settings, safe PIN approval, and large-payment in-app enforcement. Run the workflow test and verify the new cases fail for missing routes.

### Task 2: Implement domain records and API workflows

**Files:**
- Modify: `services/api/src/domain/types.ts`
- Modify: `services/api/src/domain/store.ts`
- Modify: `services/api/src/domain/seed.ts`
- Modify: `services/api/src/server.ts`

Add user tags, internal transfer receipts, WhatsApp automation settings, store methods, seeded recipient wallets, and the tested endpoints.

### Task 3: Polish shared native UI and Home/Wallet

**Files:**
- Modify: `apps/mobile/src/components.tsx`
- Modify: `apps/mobile/src/theme.ts`
- Modify: `apps/mobile/app/(tabs)/index.tsx`
- Modify: `apps/mobile/app/(tabs)/portfolio.tsx`
- Modify: `apps/mobile/app/(tabs)/pay.tsx`

Reduce visible borders and repeated badges, move recent activity upward, add internal transfer actions, and compress secondary content.

### Task 4: Rebuild swap and transfer experiences

**Files:**
- Modify: `apps/mobile/app/swap.tsx`
- Add: `apps/mobile/app/memezo-transfer.tsx`
- Modify: `apps/mobile/app/_layout.tsx`

Implement searchable full-asset selection, route details, quote states, recipient resolution, PIN review, success receipt, and retry/error states.

### Task 5: Upgrade WhatsApp, AI Pay, Cards, and P2P

**Files:**
- Modify: `apps/mobile/app/whatsapp.tsx`
- Modify: `apps/mobile/app/ai-pay.tsx`
- Modify: `apps/mobile/app/cards.tsx`
- Modify: `apps/mobile/app/p2p.tsx`

Expose bounded safety controls and pending approvals, add funding-source clarity, and simplify merchant/card presentation.

### Task 6: Build audit handoff and verify

**Files:**
- Add: `audit/README_AUDIT.md`
- Add: `audit/ARCHITECTURE.md`
- Add: `audit/FEATURES_IMPLEMENTED.md`
- Add: `audit/KNOWN_LIMITATIONS.md`
- Add: `audit/PROVIDERS_NEEDED.md`
- Add: `audit/SECURITY_NOTES.md`
- Add: `audit/UI_UX_NOTES.md`

Run tests, typechecks, admin build, Expo Doctor, iOS/Android export, simulation, create a clean Git archive, restart Expo, commit, and push.
