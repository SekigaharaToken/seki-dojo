# DOJO Claim Snap — Design Spec

## Problem

The weekly distribution cast notifications embed a link to `mint.club/airdrops/base/{id}`. This link works in browsers but fails to route correctly inside Farcaster — users land on the Mint Club homepage instead of the claim page.

## Solution

A Farcaster Snap that embeds directly in the distribution cast. Users check eligibility and claim rewards without leaving Farcaster. Three components:

1. **Farcaster Snap** — In-feed eligibility checker deployed to Neynar hosting
2. **Claim Page** — New route on the existing Vercel app for executing the onchain claim transaction
3. **Cast Notifier Update** — Embed the snap URL instead of the mint.club link

## Architecture

```
Cast in feed
  → Snap renders: "Check if you qualify for this week's $DOJO airdrop"
  → User taps "Check Eligibility" (submit action → POST to snap server)
  → Server: FID → wallet addresses (Neynar API)
           → latest distribution (EAS attestations on Base RPC)
           → IPFS whitelist fetch
           → merkle proof computation
  → Snap returns result page:
      - Eligible: "{reward} $DOJO" + "Claim" button (open_url → claim page)
      - Not eligible: "You're not eligible this week"
      - Already claimed: "Already claimed ✓"
  → User taps Claim
  → System browser opens claim page with query params
  → Claim page: connect wallet → claim() tx → success
```

---

## Component 1: Farcaster Snap

### Location

`snap/` directory in this repo. Separate build/deploy pipeline from the Vite app.

### Stack

- Hono + `@farcaster/snap-hono` (TypeScript, required by snap SDK)
- Deployed to `host.neynar.app` via Neynar hosting
- Project name: `dojo-claim-snap`
- Production URL: `https://dojo-claim-snap.host.neynar.app/`

### Pages

**Root page (GET `/`)**

Static snap JSON. Returns the initial view:
- Title text: "DOJO Weekly Airdrop" (bold)
- Description: "Check if you qualify for this week's $DOJO reward"
- Button: "Check Eligibility" (primary, action: `submit`, target: `/check`)

**Check page (POST `/check`)**

Receives signed JFS payload containing the user's FID. Server-side flow:

1. Extract FID from the verified payload
2. Resolve FID → verified Ethereum addresses via Neynar API (`GET /v2/farcaster/user/bulk?fids={fid}`)
3. Read latest week's distribution attestations from EAS on Base (same query pattern as `useDistributionAttestations` hook — filter by schema UID, decode attestation data)
4. For each tier in the latest week:
   a. Fetch the IPFS address list from Pinata gateway using the tier's `ipfsCID`
   b. Check if any of the user's addresses appear in the list
5. If match found:
   a. Compute merkle proof for the matching address
   b. Check `isClaimed(distributionId, address)` on MerkleDistributor contract
   c. If already claimed: return "Already claimed" page
   d. If unclaimed: return eligibility page with reward amount and "Claim" button
6. If no match: return "Not eligible this week" page

**Result pages (returned from `/check`):**

Eligible (unclaimed):
- Text: "You qualify!" (bold)
- Text: "{reward} $DOJO — Week {N}, Tier {id}"
- Button: "Claim Now" (primary, action: `open_url`, url: claim page URL with query params)
- Button: "Share" (secondary, action: `compose_cast`, params: text "I qualified for {reward} $DOJO this week! Check if you're eligible too", embeds: [snap URL], channelKey: "hunt")

Already claimed:
- Text: "Already Claimed" (bold)
- Text: "You've already claimed your Week {N} reward"
- Button: "Share" (secondary, action: `compose_cast`, params: text "I claimed my $DOJO reward! Check if you qualify too", embeds: [snap URL], channelKey: "hunt")

Not eligible:
- Text: "Not Eligible" (bold)
- Text: "Your wallet isn't in this week's distribution. Keep checking in at the dojo!"
- Button: "Share" (secondary, action: `compose_cast`, params: text "Check if you qualify for this week's $DOJO airdrop", embeds: [snap URL], channelKey: "hunt")

### Environment Variables

| Variable | Source |
|----------|--------|
| `SNAP_PUBLIC_BASE_URL` | `https://dojo-claim-snap.host.neynar.app` |
| `NEYNAR_API_KEY` | Already in GitHub secrets |

### Snap Constraints

- Max 64 elements, max 7 root children — all pages are well within limits
- Theme color: `green` (matches DOJO branding)
- CORS handled by `@farcaster/snap-hono` automatically

---

## Component 2: Claim Page

### Location

`src/pages/ClaimPage.jsx` — new route in the existing Vite/React app on Vercel.

### URL Format

```
https://dojo.sekigahara.app/claim?id={distributionId}&proof={hex1,hex2,...}&address={0x...}
```

Query parameters:
- `id` — the distributionId (uint256)
- `proof` — comma-separated merkle proof bytes32 hex strings
- `address` — the eligible wallet address

### UI Flow

1. **Parse query params.** If `id`, `proof`, or `address` are missing, show an error state with a message and link back to the dojo.
2. **Wallet not connected:** Show "Connect Wallet" button via RainbowKit. Standard wallet connection flow.
3. **Wrong wallet connected:** If connected address doesn't match the `address` param (case-insensitive), show: "Please switch to {address} to claim this reward."
4. **Already claimed:** Call `isClaimed(id, address)` on MerkleDistributor (view call via `useReadContract`). If true, show "Already claimed" with a checkmark.
5. **Ready to claim:** Show a claim card with the distributionId and a "Claim {reward} $DOJO" button. On click, call `claim(distributionId, merkleProof)` via `useWriteContract`.
6. **Transaction states:** Follow existing patterns from `FrontEndGuidelines.md` — pending spinner, success toast, error with retry.

### Reused Code

- Wallet connection: RainbowKit (already configured in `App.jsx`)
- ABI: `merkleDistributorAbi` from `src/config/abis/merkleDistributor.js`
- Contract address: `MINT_CLUB.MERKLE` from `src/config/contracts.js`
- i18n: Add new translation keys under `claim.*` namespace

### Route Registration

Add `/claim` route to the app's router (in `App.jsx` or wherever routes are defined). Default export for the page component, per project conventions.

---

## Component 3: Cast Notifier Update

### File

`scripts/weekly-distribution/castNotifier.js`

### Change

Replace the per-distribution mint.club URL embed with the static snap URL:

```js
// Before (per-tier, links to mint.club):
const claimUrl = distributionId
  ? `${AIRDROP_BASE_URL}/${distributionId}`
  : null;
if (claimUrl) embeds.push({ url: claimUrl });

// After (static snap URL):
embeds.push({ url: "https://dojo-claim-snap.host.neynar.app/" });
```

The snap URL is the same for every tier and every week — it dynamically reads the latest distribution from EAS at interaction time.

### What Stays the Same

- `useActiveAirdrops.js` keeps the mint.club `AIRDROP_BASE_URL` — the existing dojo web app still links there from the ClaimCard component
- `distributionLog.js` keeps the mint.club links — they're historical records in DISTRIBUTION_LOG.md
- The cast text and Farcaster notification logic remains unchanged

---

## Data Flow Details

### FID → Wallet Addresses

Neynar API: `GET https://api.neynar.com/v2/farcaster/user/bulk?fids={fid}`

Response includes `verified_addresses.eth_addresses[]` — an array of Ethereum addresses the user has verified on Farcaster. Check all of them against the whitelist.

### EAS Distribution Attestations

Query EAS on Base (`0x4200000000000000000000000000000000000021`) for attestations matching the distribution schema UID (`VITE_DOJO_DISTRIBUTION_SCHEMA_UID`). Decode the attestation data to extract: `app`, `week`, `tier`, `distributionId`, `reward`, `ipfsCID`.

Group by week, take the latest week. This is the same query pattern used in `useDistributionAttestations` in the React app — the snap server reimplements it using viem directly.

### Merkle Proof Computation

Fetch the address list from IPFS (`https://gateway.pinata.cloud/ipfs/{cid}`). Build the merkle tree using the same `buildMerkleTree` logic from `src/lib/merkle.js`. Compute the proof for the matched address. Pass the proof as comma-separated hex strings in the claim page URL.

### MerkleDistributor Contract

Address: `0x1349A9DdEe26Fe16D0D44E35B3CB9B0CA18213a4` (MINT_CLUB.MERKLE)

Functions used:
- `isClaimed(uint256 distributionId, address account) → bool` — view call, used by both snap and claim page
- `claim(uint256 distributionId, bytes32[] merkleProof)` — write call, used by claim page only

---

## Deployment

### Snap

Deployed to Neynar hosting via their deployment skill. Archive the `snap/` directory (excluding `node_modules` and dev files), deploy with:
- `framework`: `hono`
- `projectName`: `dojo-claim-snap`
- `env`: `SNAP_PUBLIC_BASE_URL`, `NEYNAR_API_KEY`

### Claim Page

Deployed automatically with the existing Vercel deployment — it's just a new route in the Vite app. No additional config needed.

### Cast Notifier

Already deployed via GitHub Actions. The change to `castNotifier.js` ships with a normal `git push origin main`.
