# MemeZo Native Finance Audit Implementation Plan

**Goal:** Complete the current MemeZo polish pass with native mobile hierarchy, server-backed multi-asset swaps, internal transfers, bounded WhatsApp approvals, and a reviewer-ready audit package.

**Architecture:** Keep Expo Router as the mobile shell and Fastify as the single trusted transaction boundary. Demo mode executes only against the isolated in-memory double-entry ledger. Live mode continues to fail closed until an upstream provider adapter is configured. Mobile screens consume explicit quote, recipient-resolution, transfer, and WhatsApp-policy endpoints.

**Tech Stack:** Expo SDK 54, React Native 0.81, Expo Router 6, Fastify 5, Zod, Node test runner.

### Task 1: Native finance polish

- Simplify Home hierarchy and visual density.
- Soften shared cards, headers, tab bar, and transactional surfaces.
- Ensure every visible action navigates or executes.

### Task 2: Multi-asset swap

- Add backend asset policy, rate, quote, and Demo execution endpoints.
- Add searchable From/To selectors with network, balance, fee, slippage, route, and receive details.
- Fail closed in Live mode without a swap provider.
- Test quote and execution accounting.

### Task 3: MemeZo internal transfers

- Add user handles and recipient resolution.
- Add double-entry transfer endpoint with PIN, idempotency, receipts, and balance updates.
- Add native transfer flow and recent-recipient entry points.
- Test sender debit, receiver credit, and duplicate protection.

### Task 4: WhatsApp safety controls

- Add user-configurable payments switch, trusted-recipient limit, daily limit, and high-risk escalation threshold.
- Add approval execution endpoint with PIN and channel checks.
- Surface pending approval and safety settings in mobile.
- Test low-risk approval and high-risk in-app escalation.

### Task 5: Audit package and verification

- Create reviewer documents covering architecture, implementation, providers, security, UI, and limitations.
- Run API/mobile typechecks, all tests, Expo Doctor, Expo exports, admin build, and simulation.
- Restart API and Expo LAN preview.
- Commit, push, and create a source archive for external audit.
