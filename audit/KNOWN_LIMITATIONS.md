# Known Limitations

## Production Blockers

- The runtime store is in memory. Restarting the API loses non-seeded state.
- Prisma describes the target database but the API is not yet using PostgreSQL transactions.
- Real authentication, OTP, password recovery, session rotation, and device binding need production providers.
- No real Nigerian payment, name-enquiry, virtual-account, or transfer adapter is active.
- No custody/signing infrastructure is active.
- No real multi-chain deposit monitoring, withdrawal broadcasting, or confirmation service is active.
- No live swap execution adapter is active.
- No real card, bill, WhatsApp, email, push, or KYC delivery adapter is active.
- Provider tests currently validate credentials structurally; most do not call upstream APIs.
- Market discovery is Demo data until DEX/RPC adapters are connected.
- Auto Sniper Live execution is disabled.

## Product Limitations

- Theme preference is stored only in local state.
- Accessibility, localization, low-end Android, and poor-network testing need a dedicated pass.
- Biometric prompts and secure transaction signing need a development build, not only Expo Go.
- Cards and savings are foundations, not provider-backed financial products.
- WhatsApp trusted-recipient management is minimal and should have a dedicated recipient screen.

## Security Limitations

- Independent penetration testing has not been completed.
- Production key rotation, HSM/KMS policy, incident response, and disaster recovery are not implemented.
- Fraud scoring and blockchain transaction screening are provider placeholders.
- Admin production access should move from service-token fallback to staff SSO with MFA and scoped roles.
