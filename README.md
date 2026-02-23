# DOJO

Daily check-in dojo on Base. Attest your practice onchain, build streaks, earn tiered $DOJO rewards.

Part of the [Sekigahara](https://github.com/SekigaharaToken) ecosystem.

## How it works

1. **Check in** -- click once per day to create an onchain attestation via [EAS](https://attest.org)
2. **Build streaks** -- the DojoResolver contract tracks consecutive days automatically
3. **Earn rewards** -- weekly Merkle distributions of $DOJO tokens, tiered by streak length

| Tier | Streak | Belt | Weekly Reward |
|------|--------|------|---------------|
| 1 | 7-13 days | White | 100 $DOJO |
| 2 | 14-29 days | Blue | 150 $DOJO |
| 3 | 30-59 days | Purple | 180 $DOJO |
| 4 | 60+ days | Black | 200 $DOJO |

No backend server. No admin keys. If the team disappears, the contracts and IPFS frontend keep working.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| Wallet | wagmi v2 + viem + RainbowKit |
| Auth | Sign In With Farcaster (SIWF) |
| Chain | Base (8453) / Base Sepolia (84532) |
| Attestations | EAS (OP Stack predeploys) |
| Rewards | Mint Club V2 MerkleDistributor |
| Tokens | Mint Club bonding curves ($SEKI, $DOJO) |
| i18n | react-i18next (EN, JA, KR) |
| Contracts | Solidity 0.8.x (Foundry) |

## Setup

```bash
# Install dependencies
npm install

# Copy env and fill in values
cp .env.example .env

# Start dev server
npm run dev

# Run tests
npm test
```

### Environment variables

```
VITE_CHAIN_ID=84532                    # 84532 = Base Sepolia, 8453 = Base Mainnet
VITE_WALLETCONNECT_PROJECT_ID=         # From cloud.walletconnect.com
VITE_DOJO_RESOLVER_ADDRESS=            # DojoResolver contract
VITE_DOJO_SCHEMA_UID=                  # EAS schema UID
VITE_SEKI_TOKEN_ADDRESS=               # $SEKI token
VITE_DOJO_TOKEN_ADDRESS=               # $DOJO token
VITE_PINATA_JWT=                       # Pinata JWT (for weekly distribution script)
```

## Project structure

```
src/
  config/          Chain, contract addresses, ABIs, constants
  components/      React components (layout, dojo, swap, ui)
  hooks/           Custom React hooks
  pages/           Route-level page components
  lib/             Utilities and helpers
  i18n/            Translation config and locale files
  assets/          Static images and fonts
contracts/
  src/             Solidity sources (DojoResolver, DojoFaucet, DemoToken)
scripts/
  weekly-distribution/   Weekly reward pipeline
  e2e-test.sh            End-to-end test on Anvil fork
```

## Contracts

**DojoResolver** -- custom EAS SchemaResolver that enforces one check-in per UTC day and tracks streaks onchain. All state is publicly readable (`currentStreak`, `longestStreak`, `lastCheckIn`). Daily bonus rewards are also handled by the resolver -- on each successful attestation, a streak-scaled bonus is calculated and distributed directly, removing the need for a separate contract.

**Deployed on Base Sepolia:**
- DojoResolver: `0xA046B36f99a434CE30b14BB783310aF16D00009d`
- EAS schema: `0xc3d5fa683150402070fa90f53e23d4921826640823deed57d32cd53db62c6c0e`

## Weekly distribution

The `scripts/weekly-distribution/` pipeline runs as a weekly cron:

1. Discover active wallets from EAS attestation logs
2. Bucket wallets into tiers by streak
3. Build Merkle trees per tier
4. Pin trees to IPFS via Pinata
5. Create distributions on Mint Club MerkleDistributor

```bash
node scripts/weekly-distribution/index.js
```

## E2E testing

The e2e test forks Base Sepolia into a local Anvil node, simulates a full week of check-ins, and runs the entire distribution pipeline:

```bash
./scripts/e2e-test.sh
```

See `contracts/README.md` for the Anvil fork-testing guide.

## License

[MIT](LICENSE)
