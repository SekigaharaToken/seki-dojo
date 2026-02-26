# CLAUDE.md — Project Sekigahara

## Project Overview

Sekigahara is a multi-app ecosystem on the Hunt Town Co-op (Base chain). Hub-and-spoke token model: `$SEKI` (HUNT-backed parent) → child tokens (starting with `$DOJO`). The first app is a daily check-in dojo with onchain streak tracking via EAS attestations and a custom resolver, plus weekly Merkle-based reward distribution.

Companion docs:

- `ProjectRequirementsDoc.md` — Full app spec, backend ops, resolver contract
- `DataSchema.md` — EAS schema, Mint Club contract data, IPFS structures
- `FrontEndGuidelines.md` — UI/UX, shadcn theming, i18n rules

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Production build (vite build)
npm test             # Run tests (vitest run)
npm run test:watch   # Run tests in watch mode

# Deploy (always use --force to skip Vercel build cache after engine updates)
vercel deploy --prod --force

# Weekly distribution (automated via GitHub Actions, or manual)
node scripts/weekly-distribution/manual-run.js --dry-run   # Preview
node scripts/weekly-distribution/manual-run.js              # Execute

# Foundry (contracts/)
forge build          # Compile contracts
forge test           # Run contract tests
```

## Tech Stack

| Layer           | Technology                                                 |
| --------------- | ---------------------------------------------------------- |
| Framework       | React 19 + Vite 7                                          |
| Language        | JavaScript (not TypeScript unless consuming TS packages)   |
| Styling         | Tailwind CSS + shadcn/ui                                   |
| Wallet          | wagmi v2 + viem                                            |
| Wallet UI       | RainbowKit (custom SIWF modal, reused from SecondOrder)    |
| Chain           | Base (Chain ID: 8453)                                      |
| Token Ops       | Mint Club V2 SDK (`mint.club-v2-sdk`)                      |
| State           | TanStack Query (`@tanstack/react-query`) for onchain reads |
| i18n            | `react-i18next` + `i18next`                                |
| Hosting (dev)   | Vercel                                                     |
| Hosting (prod)  | IPFS (Pinata) + ENS + eth.limo                             |
| Smart Contracts | Solidity 0.8.x (Foundry toolchain)                         |

## Chain & Contract Addresses

```text
Base Mainnet (8453)

# EAS (OP Stack Predeploys)
EAS:              0x4200000000000000000000000000000000000021
SchemaRegistry:   0x4200000000000000000000000000000000000020

# Mint Club V2
BOND:             0xc5a076cad94176c2996B32d8466Be1cE757FAa27
ERC20:            0xAa70bC79fD1cB4a6FBA717018351F0C3c64B79Df
ERC1155:          0x6c61918eECcC306D35247338FDcf025af0f6120A
ZAP:              0x91523b39813F3F4E406ECe406D0bEAaA9dE251fa
LOCKER:           0xA3dCf3Ca587D9929d540868c924f208726DC9aB6
MERKLE:           0x1349A9DdEe26Fe16D0D44E35B3CB9B0CA18213a4
STAKE:            0x9Ab05EcA10d087f23a1B22A44A714cdbBA76E802

# Custom (deployed by us — addresses loaded from env vars)
DojoResolver:     VITE_DOJO_RESOLVER_ADDRESS
DojoFaucet:       VITE_DOJO_FAUCET_ADDRESS

# Project Tokens (created via Mint Club UI — addresses loaded from env vars)
$SEKI:            VITE_SEKI_TOKEN_ADDRESS
$DOJO:            VITE_DOJO_TOKEN_ADDRESS
```

## Coding Standards

### General

- JavaScript, not TypeScript (unless the package requires it).
- ES modules only (`import`/`export`). Never CommonJS.
- `const` over `let`. Never `var`.
- Arrow functions for callbacks. Named functions for top-level declarations.
- Named exports for components and hooks. Default exports only for pages.
- No `console.log` in committed code. Use a logger utility or strip in build.

### React

- Functional components only.
- One component per file. Filename matches component name (PascalCase).
- Hooks go in `src/hooks/`, prefixed with `use`.
- Components stay under 150 lines. Extract logic into hooks, UI into sub-components.
- TanStack Query for all onchain/async data. No `useEffect` for data fetching.
- Destructure props in function signatures.

### Styling

- Tailwind utility classes only. No inline styles, CSS modules, or styled-components.
- shadcn/ui for all standard UI elements.
- Theme tokens in `tailwind.config.js`. Never hardcode hex values in JSX.
- Light and dark modes required. Use CSS variables via shadcn theming.

### File Structure

```zsh
src/
├── main.jsx
├── App.jsx
├── config/           # Chain, addresses, ABIs, constants
│   ├── chains.js
│   ├── contracts.js
│   ├── constants.js
│   └── abis/
├── hooks/            # Custom React hooks (useCheckIn, useStreak, useResolverEvents, etc.)
├── components/
│   └── dojo/         # Check-in, streak, rewards, claim, onboarding
├── pages/            # Route-level components (default exports)
├── lib/              # Utilities, formatters, helpers
├── test/             # Test utilities (TestWrapper)
├── i18n/             # Translation config and locale files
│   ├── index.js
│   └── locales/
│       ├── app.en.json
│       ├── app.ja.json
│       └── app.kr.json
└── assets/           # Static images, fonts, textures
contracts/            # Foundry project (DojoResolver, DojoFaucet)
scripts/
└── weekly-distribution/  # CDP Server Wallet distribution + Farcaster notifications
```

> **Note:** Layout components (Header, Footer, BackSekiLink), swap UI, and shared UI primitives live in the `@sekigahara/engine` package, not in this repo.

### Contract Interaction

- `viem` for all contract reads/writes. Do not use `ethers.js`.
- ABI files in `src/config/abis/` as named JS exports.
- `useReadContract` / `useWriteContract` from wagmi for React integration.
- Mint Club V2 SDK for bonding curve operations (buy, sell, price).
- EAS interactions via direct viem calls to the OP Stack predeploy addresses.
- **Normalize hex at the config boundary** — Addresses and bytes32 values from env vars must be lowercased when loaded in `src/config/contracts.js`. Base RPCs do case-sensitive hex comparison on topic filters; viem lowercases addresses but NOT bytes32 values. Storing everything lowercase prevents silent mismatches in `getLogs`, event filters, and contract calls.

### Solidity (DojoResolver)

- Solidity `^0.8.24`. No floating pragma.
- Foundry for compile, test, deploy.
- Inherit from EAS `SchemaResolver`.
- Under 100 lines. Single responsibility: rate-limit (one check-in per UTC day) + streak tracking.
- All state publicly readable: `lastCheckIn`, `currentStreak`, `longestStreak` as public mappings.
- `onAttest()` returns `false` to reject duplicate same-day attestations (tx reverts).
- `onRevoke()` returns `false` always (no revocations allowed).

### i18n

- ALL user-facing strings use translation keys via `react-i18next`.
- Zero hardcoded strings in JSX. No exceptions.
- JSON locale files, organized by feature namespace.
- `en` is primary. `ja` is secondary, `kr` tertiary

### Git

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Branch naming: `feat/feature-name`, `fix/bug-name`.
- Never commit `.env`. Provide `.env.example`.

### Semantic Versioning

Update `package.json` version following semver:

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (0.x.0): New features, backward compatible
- **PATCH** (0.0.x): Bug fixes, backward compatible

### Farcaster SIWF (Sign In With Farcaster)

- **SIWE nonces must be alphanumeric** — SIWE (ERC-4361) nonces require `[a-zA-Z0-9]{8,}`. Use `crypto.randomUUID().replaceAll('-', '')` instead of raw `crypto.randomUUID()`. UUID hyphens cause Warpcast to fail silently when building the SIWE message.
- **SIWF domain must match** — Backend `verifySignInMessage` must use the domain from the signed SIWE message, not a hardcoded value. Use `SIWF_ALLOWED_DOMAINS` env var with wildcard support (e.g., `*.vercel.app`) for preview deployments.
- **`@farcaster/auth-kit` versioning** — Keep up to date. The Farcaster relay protocol changes between versions. Old versions (< 0.8.x) may fail silently with the current relay server.
- **Reference implementation** — SecondOrder repo commit `87e0d786` contains the SIWF pattern to reuse: `FarcasterProvider`, `useFarcasterSignIn`, `LoginModal` with QR code flow. See: `https://github.com/SecondOrder-fun/sof-alpha/commit/87e0d786644da12c36234b597abca26b2c434757`

### Environment Variables

See `.env.example` for the full list. Key groups:

```text
# Chain & frontend
VITE_CHAIN_ID=                     # 84532 (Sepolia) or 8453 (Mainnet)
VITE_WALLETCONNECT_PROJECT_ID=
VITE_ALCHEMY_API_KEY=              # Optional premium RPC
VITE_DOJO_SCHEMA_UID=              # EAS schema UID
VITE_DOJO_RESOLVER_ADDRESS=        # DojoResolver contract
VITE_SEKI_TOKEN_ADDRESS=           # $SEKI token
VITE_DOJO_TOKEN_ADDRESS=           # $DOJO token
VITE_DOJO_FAUCET_ADDRESS=          # DojoFaucet contract
VITE_FAUCET_SECRET=                # Shared secret for faucet proofs

# Build scripts only
VITE_PINATA_JWT=                   # IPFS pinning

# Weekly distribution (CDP Server Wallet)
CDP_API_KEY_ID=
CDP_API_KEY_SECRET=
CDP_WALLET_SECRET=

# Farcaster notifications
NEYNAR_API_KEY=
NEYNAR_SIGNER_UUID=
```

## Hard Rules

- Do NOT use `ethers.js`. Use `viem`.
- Do NOT create CSS files. Use Tailwind.
- Do NOT hardcode colors. Use theme tokens.
- Do NOT fetch data in `useEffect`. Use TanStack Query.
- Do NOT use `localStorage` for critical state. Onchain is truth.
- Do NOT build anything requiring a persistent backend server. Static builds only.
- Do NOT skip i18n. Every user-facing string goes through translations.
- Do NOT deploy anything that fails the walkaway test. If we disappear, contracts and IPFS frontend must keep working.
- Do NOT use hex values without lowercasing first. Normalize all addresses and bytes32 at the config boundary (`src/config/contracts.js`).
