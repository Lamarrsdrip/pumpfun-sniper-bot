# MemeZo V3 Production Readiness Plan

## 1. Stabilize Persistence and Operations

- Correct and extend the PostgreSQL schema.
- Add database transaction, wallet row-lock, durable job, outbox, webhook inbox, reconciliation, and provider health models.
- Add runtime configuration and readiness gates for PostgreSQL and Redis.
- Add tested queue, webhook verification, reconciliation, and structured logging primitives.

## 2. Harden Security

- Replace demo PIN string comparisons with salted PIN verification.
- Add session rotation and trusted-device metadata.
- Add fraud decisions for duplicate, velocity, amount, and device risk.
- Add dual-approval primitives for critical admin actions.
- Ensure secret redaction and fail-closed live gates.

## 3. Clarify Provider Readiness

- Expand provider contracts and registry coverage.
- Report configured, tested, degraded, missing, and disabled states accurately.
- Add database, Redis, webhook, queue, custody, and observability status to health APIs.

## 4. Refine Mobile Money Journeys

- Expand wallet assets and network visibility.
- Add recipient recents, favorites, QR/deep-link support, and a transfer review step.
- Extend WhatsApp commands while retaining secure approval boundaries.
- Improve loading, empty, error, and success presentation.

## 5. Redesign Admin Mission Control

- Group navigation around operations rather than feature inventory.
- Surface system gates, queues, treasury, liquidity, fraud, incidents, provider health, jobs, and reconciliation.
- Keep existing operational controls while reducing visual noise.

## 6. Produce Audit Package

- Create the six requested production and audit documents.
- Distinguish implemented, simulated, configured, and externally blocked behavior.
- Document launch blockers and provider credential requirements.

## 7. Verify and Publish

- Run API tests, legacy tests, mobile/admin typechecks, Expo doctor, Prisma validation, and Expo export.
- Review status and diff for accidental changes.
- Push the branch to GitHub.
- Start a remote API tunnel and Expo tunnel and provide the temporary preview instructions.
