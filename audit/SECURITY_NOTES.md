# Security Notes

## Existing Controls

- Zod validation on API inputs.
- Fastify security headers, CORS policy, and rate limits.
- Demo/Live mode isolation.
- Production user routes require signed sessions.
- Production admin routes require an authorized role or configured service token.
- Provider credentials are encrypted with AES-256-GCM when the vault is configured.
- Ledger entries must balance.
- Money commands use idempotency keys.
- Demo PIN checks prove the approval flow without claiming production PIN security.
- WhatsApp payment preparation cannot silently move money.
- High-risk, untrusted, large, expired, disabled, or over-limit WhatsApp actions fail closed.

## Required Before Launch

- Store PIN verifiers with a strong password KDF and hardware-backed keys where available.
- Add biometric approval through a signed challenge.
- Add device/session inventory, refresh-token rotation, revocation, and anomaly detection.
- Verify all provider webhook signatures before state changes.
- Use database row locks and serializable transactions for balance updates.
- Add outbox/inbox tables for durable provider commands and webhook idempotency.
- Add KMS/HSM-backed custody and withdrawal policy approvals.
- Add sanctions, wallet-risk, bank-account-risk, velocity, and duplicate-payment controls.
- Redact PII and secrets from application logs.
- Add staff SSO, MFA, least privilege, and dual approval for sensitive admin actions.
- Complete penetration testing, dependency review, mobile binary review, and disaster-recovery exercises.
