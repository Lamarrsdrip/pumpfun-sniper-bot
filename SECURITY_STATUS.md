# MemeZo Security Status

Date: 2026-06-13

## Added in V3

- Scrypt transaction PIN hashing with salt and server pepper support
- Failed PIN attempt tracking and temporary lockout
- Session token hashing, session rotation, expiry, revocation, and device metadata
- Trusted-device storage model
- Constant-time HMAC webhook signature verification helper
- Provider-event replay protection and idempotent webhook inbox
- Duplicate, velocity, high-value, and untrusted-device transfer checks
- Two-person approval primitive for critical administrative actions
- PostgreSQL serializable transaction and wallet row-lock helpers
- Redis distributed lock helper
- Secret, token, PIN, and account-number redaction for structured logs
- Durable audit, fraud case, provider health, incident, reconciliation, and MFA models
- Fail-closed provider and live-execution behavior

## Still Required

- Production identity provider and admin MFA enrollment
- Hardware-backed or managed key storage
- Secret-manager integration and rotation ceremony
- Full repository migration from memory to PostgreSQL
- Provider-specific webhook verification implementations
- Rate limits backed by Redis across multiple API instances
- WAF, bot protection, IP reputation, and abuse controls
- Formal RBAC permission matrix and deny-by-default authorization tests
- Dependency remediation review for remaining audit findings
- SAST, DAST, mobile binary review, penetration test, and custody audit
- Database encryption, backup encryption, restore tests, and retention policy

## Dependency Audit

`npm audit --omit=dev` currently reports 17 advisories: 2 high and 15 moderate.

- The high findings are in Vite's transitive `esbuild` version. The suggested automated remediation upgrades Vite across a major version and must be tested separately before adoption.
- The moderate findings are Expo SDK 54 transitive `postcss` and `uuid` dependencies. The suggested automated remediation upgrades Expo across major SDK versions.
- The direct API `esbuild` dependency is pinned to the patched `0.28.1`; the remaining high finding is the admin Vite dependency tree.

Do not run `npm audit fix --force` blindly. Schedule a Vite 8 admin migration and an Expo SDK upgrade as controlled, separately tested security changes before production release.

## Current Security Claim

The codebase has improved security controls and production schemas, but it has not passed an independent security audit. It must not be represented as independently certified or safe for unrestricted public money movement.
