# MemeZo Finance Experience Design

## Product Position

MemeZo is a Nigerian financial super app with crypto intelligence and controlled
automation. The visual hierarchy starts with money, account health and everyday
actions. Crypto discovery, AI Pay, P2P automation and Auto Sniper remain important
but never make the primary wallet feel like a Web3 dashboard.

## Navigation

The five primary tabs remain Home, Discover, Wallet, Pay and Sniper.

- Home answers balance, recent money movement, pending attention and quick actions.
- Discover aggregates multi-chain DEX opportunities and optional early Solana launches.
- Wallet owns fiat, crypto assets, receive/send, networks and transaction history.
- Pay owns AI Pay, WhatsApp Assistant, bills, cards and P2P merchant tools.
- Sniper owns automation modes, market-source modes, risk and explainable activity.

Profile, notifications, rewards, savings, business onboarding, security, support,
asset management and receipts are secondary stack routes.

## Visual System

The default dark theme uses deep green-black foundations, raised graphite surfaces,
soft emerald highlights and restrained amber/red risk states. Cards use subtle depth,
continuous corners and compact financial typography. A light palette is exposed in
preferences and can be adopted incrementally by screens through shared tokens.

Every financial screen provides:

- explicit Demo or Live state;
- provider status where execution depends on an external service;
- loading, disabled, success and failure states;
- tabular numeric alignment;
- a single primary action;
- no fake success when a provider is absent.

## Wallet And Money

The wallet shows one Naira-first total plus enabled assets. Demo mode includes clearly
labelled simulated balances for BTC, ETH, USDT, USDC, SOL, BNB, TRX, POL and TON.
Receive and send flows require both asset and network selection. A selected network
controls address copy, warning copy and fee preview. Live addresses are never invented.

Transactions share one visual model across Home, Wallet and History: type, counterparty,
amount, timestamp, status and receipt availability.

## WhatsApp Assistant

WhatsApp is a financial-assistant channel, not an execution bypass. A connection has
verification state and provider health. Incoming commands can request balance, account
details, transactions, support, payment preparation, bill preparation and merchant
status. Payment commands create approval sessions and deep-link back to MemeZo.

Sensitive actions require in-app PIN/biometric approval or an active, bounded trusted
rule. The backend stores connections, messages, webhook events, command logs, approval
sessions and templates. Webhooks verify provider signatures before processing.

## Multi-Chain Intelligence

DEX Screener is the primary discovery source for liquid DEX pairs. Optional providers
enrich holder, wallet and social data. Pump.fun/PumpPortal remains an explicitly
high-risk Early Solana source.

Source modes:

1. DEX Mode: multi-chain, already-liquid pairs.
2. Early Solana: high-risk launch stream.
3. Watchlist: user-selected contracts.

Supported chain metadata includes Solana, Ethereum, Base, BNB Chain, Polygon, Arbitrum,
Optimism and Tron where a configured provider supports it.

## Administration

The separate web admin adds WhatsApp operations, asset/network policy, reward policy and
provider health. WhatsApp credentials stay in the existing encrypted provider vault.
Normal mobile users never receive admin navigation or credentials.

## Honest Readiness

Demo records demonstrate complete journeys and are always marked simulated. Live mode
returns unavailable or degraded states until provider adapters, signatures, custody and
reconciliation are configured. UI completion is not represented as financial-provider
completion.
