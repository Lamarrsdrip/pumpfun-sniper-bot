# UI/UX Notes

## Design Intent

MemeZo is a bank-first financial app with crypto and market intelligence as secondary capabilities. The current direction reduces dashboard noise and emphasizes balance, send, recent activity, pending actions, and clear approval.

## Recent Improvements

- Softer cards and fewer decorative borders.
- Combined account-tier and verification status.
- Recent activity moved above secondary discovery.
- Internal transfer promoted into Home, Wallet, and Pay.
- Payments changed from a dense tile dashboard to a calmer action list.
- WhatsApp entry reduced to a compact utility.
- Multi-asset swap now uses a searchable native sheet and clear quote breakdown.
- WhatsApp safety limits are editable and payment approvals are visible.
- AI Pay exposes funding source and refuses unsupported conversion routes honestly.

## Audit Targets

- Test iPhone SE through Pro Max and small Android devices.
- Confirm Dynamic Type does not overflow actions, receipts, and token rows.
- Confirm keyboard avoidance for amount, PIN, search, and payment forms.
- Confirm VoiceOver/TalkBack labels and logical focus order.
- Verify loading, retry, offline, success, pending, failed, and reversed states.
- Verify tab bar safe-area behavior and modal dismissal.
- Verify all tap targets meet platform size guidance.
- Confirm no Live screen uses Demo balances or success copy.
