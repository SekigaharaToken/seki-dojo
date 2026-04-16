# DOJO Claim Snap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Farcaster Snap that lets users check airdrop eligibility in-feed and claim rewards via a dedicated claim page, replacing the broken mint.club embed links.

**Architecture:** Three components — (1) a Hono/TypeScript snap server deployed to Neynar hosting that resolves FID → wallet addresses → EAS attestations → IPFS whitelist → merkle proof, (2) a React claim page (`/claim` route) on the existing Vercel app that executes the `claim()` contract call, and (3) a one-line update to the cast notifier to embed the snap URL instead of mint.club.

**Tech Stack:** Hono + `@farcaster/snap` (TypeScript), React + wagmi + viem (JavaScript), Neynar API, EAS on Base, MerkleDistributor contract

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `snap/package.json` | Create | Snap project dependencies and scripts |
| `snap/tsconfig.json` | Create | TypeScript config for snap |
| `snap/src/index.ts` | Create | Snap server — routes, eligibility check logic, UI pages |
| `snap/src/distributionReader.ts` | Create | Read latest distribution from EAS attestations on Base |
| `snap/src/eligibilityChecker.ts` | Create | FID → addresses → whitelist check → merkle proof |
| `snap/src/types.ts` | Create | Shared type definitions |
| `src/pages/ClaimPage.jsx` | Create | Claim page — wallet connect, claim tx, feedback |
| `src/App.jsx` | Modify | Add `/claim` route |
| `src/i18n/locales/app.en.json` | Modify | Add claim page translation keys |
| `src/i18n/locales/app.ja.json` | Modify | Add claim page translation keys |
| `src/i18n/locales/app.kr.json` | Modify | Add claim page translation keys |
| `scripts/weekly-distribution/castNotifier.js` | Modify | Replace mint.club embed with snap URL |

---

### Task 1: Scaffold the snap project

**Files:**
- Create: `snap/package.json`
- Create: `snap/tsconfig.json`
- Create: `snap/src/types.ts`

- [ ] **Step 1: Create `snap/package.json`**

```json
{
  "name": "dojo-claim-snap",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "SKIP_JFS_VERIFICATION=true tsx watch src/index.ts",
    "build": "tsc --noEmit",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@farcaster/snap": "^2.0.1",
    "@farcaster/snap-hono": "^2.0.1",
    "hono": "^4.0.0",
    "@hono/node-server": "^1.0.0",
    "viem": "^2.46.3",
    "merkletreejs": "^0.4.0",
    "zod": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: Create `snap/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "rootDir": "src",
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create `snap/src/types.ts`**

```typescript
export interface TierEntry {
  app: string;
  week: number;
  tier: number;
  distributionId: number;
  reward: number;
  ipfsCID: string;
}

export interface WeekDistribution {
  week: number;
  tiers: TierEntry[];
}

export interface EligibilityResult {
  eligible: boolean;
  alreadyClaimed: boolean;
  address: string;
  distributionId: number;
  reward: number;
  week: number;
  tierId: number;
  proof: string[];
}
```

- [ ] **Step 4: Install dependencies**

```bash
cd snap && npm install
```

- [ ] **Step 5: Commit**

```bash
git add snap/
git commit -m "feat: scaffold dojo-claim-snap project"
```

---

### Task 2: Implement distribution reader (EAS attestation query)

**Files:**
- Create: `snap/src/distributionReader.ts`

This module queries EAS on Base for the latest week's distribution attestations — the same pattern as `src/hooks/useDistributionAttestations.js` but in plain viem (no React hooks).

- [ ] **Step 1: Create `snap/src/distributionReader.ts`**

```typescript
import {
  createPublicClient,
  http,
  fallback,
  parseAbiItem,
  decodeAbiParameters,
  parseAbiParameters,
  type PublicClient,
} from "viem";
import { base } from "viem/chains";
import type { WeekDistribution, TierEntry } from "./types.js";

const EAS_ADDRESS = "0x4200000000000000000000000000000000000021" as const;
const DEPLOY_BLOCK = 42_263_066n;
const MAX_BLOCK_RANGE = 2_000n;

// Distribution schema UID — must match VITE_DOJO_DISTRIBUTION_SCHEMA_UID
const DISTRIBUTION_SCHEMA_UID = (
  process.env.DISTRIBUTION_SCHEMA_UID ?? ""
).toLowerCase() as `0x${string}`;

const MERKLE_DISTRIBUTOR = (
  process.env.MERKLE_DISTRIBUTOR ?? "0x1349A9DdEe26Fe16D0D44E35B3CB9B0CA18213a4"
).toLowerCase() as `0x${string}`;

const transport = fallback([
  http("https://mainnet.base.org"),
  http("https://base-rpc.publicnode.com"),
  http("https://base.drpc.org"),
]);

const client: PublicClient = createPublicClient({
  chain: base,
  transport,
});

const attestedEvent = parseAbiItem(
  "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
);

const distSchemaParams = parseAbiParameters(
  "string app, uint16 week, uint8 tier, uint256 distributionId, uint16 reward, string ipfsCID",
);

const easGetAttestationAbi = [
  {
    name: "getAttestation",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "uid", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "uid", type: "bytes32" },
          { name: "schema", type: "bytes32" },
          { name: "time", type: "uint64" },
          { name: "expirationTime", type: "uint64" },
          { name: "revocationTime", type: "uint64" },
          { name: "refUID", type: "bytes32" },
          { name: "recipient", type: "address" },
          { name: "attester", type: "address" },
          { name: "revocable", type: "bool" },
          { name: "data", type: "bytes" },
        ],
      },
    ],
  },
] as const;

const isClaimedAbi = [
  {
    name: "isClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "distributionId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

async function getLogsPaginated(fromBlock: bigint): Promise<any[]> {
  const latest = await client.getBlockNumber();
  const allLogs: any[] = [];
  let cursor = fromBlock;

  while (cursor <= latest) {
    const end =
      cursor + MAX_BLOCK_RANGE - 1n > latest
        ? latest
        : cursor + MAX_BLOCK_RANGE - 1n;

    const logs = await client.getLogs({
      address: EAS_ADDRESS,
      event: attestedEvent,
      args: { schemaUID: DISTRIBUTION_SCHEMA_UID },
      fromBlock: cursor,
      toBlock: end,
    });

    allLogs.push(...logs);
    cursor = end + 1n;
  }

  return allLogs;
}

/**
 * Read the latest week's distribution from EAS attestations on Base.
 * Returns null if no attestations are found.
 */
export async function getLatestDistribution(): Promise<WeekDistribution | null> {
  if (!DISTRIBUTION_SCHEMA_UID) return null;

  const logs = await getLogsPaginated(DEPLOY_BLOCK);
  if (logs.length === 0) return null;

  const entries: TierEntry[] = await Promise.all(
    logs.map(async (log: any) => {
      const uid = log.args.uid;
      const attestation = await client.readContract({
        address: EAS_ADDRESS,
        abi: easGetAttestationAbi,
        functionName: "getAttestation",
        args: [uid],
      });

      const [app, week, tier, distributionId, reward, ipfsCID] =
        decodeAbiParameters(distSchemaParams, (attestation as any).data);

      return {
        app,
        week: Number(week),
        tier: Number(tier),
        distributionId: Number(distributionId),
        reward: Number(reward),
        ipfsCID,
      };
    }),
  );

  // Group by week, take the latest
  const byWeek = new Map<number, TierEntry[]>();
  for (const entry of entries) {
    if (!byWeek.has(entry.week)) byWeek.set(entry.week, []);
    byWeek.get(entry.week)!.push(entry);
  }

  const latestWeek = Math.max(...byWeek.keys());
  const tiers = byWeek.get(latestWeek)!.sort((a, b) => a.tier - b.tier);

  return { week: latestWeek, tiers };
}

/**
 * Check if a given address has already claimed a distribution.
 */
export async function checkIsClaimed(
  distributionId: number,
  address: string,
): Promise<boolean> {
  return (await client.readContract({
    address: MERKLE_DISTRIBUTOR,
    abi: isClaimedAbi,
    functionName: "isClaimed",
    args: [BigInt(distributionId), address as `0x${string}`],
  })) as boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add snap/src/distributionReader.ts
git commit -m "feat(snap): add EAS distribution reader for Base chain"
```

---

### Task 3: Implement eligibility checker (FID → addresses → whitelist → proof)

**Files:**
- Create: `snap/src/eligibilityChecker.ts`

- [ ] **Step 1: Create `snap/src/eligibilityChecker.ts`**

```typescript
import { keccak256, toHex } from "viem";
import MerkleTree from "merkletreejs";
import { getLatestDistribution, checkIsClaimed } from "./distributionReader.js";
import type { EligibilityResult } from "./types.js";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY ?? "";
const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs";

/**
 * Resolve a Farcaster FID to verified Ethereum addresses via Neynar API.
 */
async function resolveAddresses(fid: number): Promise<string[]> {
  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
    { headers: { "x-api-key": NEYNAR_API_KEY } },
  );

  if (!res.ok) return [];
  const data = await res.json();
  const user = data.users?.[0];
  if (!user) return [];

  return (user.verified_addresses?.eth_addresses ?? []).map((a: string) =>
    a.toLowerCase(),
  );
}

/**
 * Fetch the address whitelist from IPFS for a given CID.
 */
async function fetchAddressList(ipfsCID: string): Promise<string[] | null> {
  if (!ipfsCID) return null;
  const res = await fetch(`${IPFS_GATEWAY}/${ipfsCID}`);
  if (!res.ok) return null;
  return res.json();
}

/**
 * Hash function matching the main app's merkle.js — keccak256 for both
 * hex strings and Buffer/Uint8Array (merkletreejs intermediate nodes).
 */
function hashFn(data: string | Buffer | Uint8Array): string {
  if (typeof data === "string") return keccak256(data as `0x${string}`);
  return keccak256(toHex(data));
}

/**
 * Build a merkle tree from an address list and compute the proof for a target address.
 */
function computeMerkleProof(
  addresses: string[],
  targetAddress: string,
): string[] {
  const leaves = addresses.map((addr) => hashFn(addr));
  const tree = new MerkleTree(leaves, hashFn, { sortPairs: true });
  const leaf = hashFn(targetAddress);
  return tree.getHexProof(leaf);
}

/**
 * Check if a Farcaster user (by FID) is eligible for the current week's distribution.
 * Returns eligibility details including merkle proof for claiming.
 */
export async function checkEligibility(
  fid: number,
): Promise<EligibilityResult | null> {
  // 1. Get latest distribution from EAS
  const distribution = await getLatestDistribution();
  if (!distribution) return null;

  // 2. Resolve FID to wallet addresses
  const userAddresses = await resolveAddresses(fid);
  if (userAddresses.length === 0) return null;

  // 3. Check each tier for a matching address
  for (const tier of distribution.tiers) {
    const whitelist = await fetchAddressList(tier.ipfsCID);
    if (!whitelist) continue;

    const lowerWhitelist = whitelist.map((a) => a.toLowerCase());

    for (const addr of userAddresses) {
      const idx = lowerWhitelist.indexOf(addr);
      if (idx === -1) continue;

      // Found a match — compute proof and check claimed status
      const proof = computeMerkleProof(lowerWhitelist, addr);
      const alreadyClaimed = await checkIsClaimed(
        tier.distributionId,
        addr,
      );

      return {
        eligible: true,
        alreadyClaimed,
        address: addr,
        distributionId: tier.distributionId,
        reward: tier.reward,
        week: distribution.week,
        tierId: tier.tier,
        proof,
      };
    }
  }

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add snap/src/eligibilityChecker.ts
git commit -m "feat(snap): add eligibility checker with FID resolution and merkle proof"
```

---

### Task 4: Implement the snap server (Hono routes + UI pages)

**Files:**
- Create: `snap/src/index.ts`

- [ ] **Step 1: Create `snap/src/index.ts`**

```typescript
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import {
  registerSnapHandler,
  snapBaseUrlFromRequest,
  SPEC_VERSION,
  type SnapFunction,
} from "@farcaster/snap-hono";
import { checkEligibility } from "./eligibilityChecker.js";

const CLAIM_BASE_URL =
  process.env.CLAIM_BASE_URL ?? "https://dojo.sekigahara.app";

const app = new Hono();

const snap: SnapFunction = async (ctx) => {
  const base = snapBaseUrlFromRequest(ctx.req);

  // If this is a POST to /check, process the eligibility check
  if (ctx.action?.target?.endsWith("/check")) {
    const fid = ctx.action.fid;
    if (!fid) {
      return errorPage(base, "Could not identify your Farcaster account.");
    }

    try {
      const result = await checkEligibility(fid);

      if (!result) {
        return notEligiblePage(base);
      }

      if (result.alreadyClaimed) {
        return alreadyClaimedPage(base, result.week);
      }

      return eligiblePage(base, result);
    } catch (err) {
      console.error("Eligibility check failed:", err);
      return errorPage(base, "Something went wrong. Please try again.");
    }
  }

  // Default: root page
  return rootPage(base);
};

function rootPage(base: string) {
  return {
    version: SPEC_VERSION,
    theme: { accent: "green" },
    ui: {
      root: "root",
      elements: {
        root: {
          type: "stack" as const,
          children: ["title", "desc", "checkBtn"],
        },
        title: {
          type: "text" as const,
          props: { content: "DOJO Weekly Airdrop", weight: "bold" as const },
        },
        desc: {
          type: "text" as const,
          props: {
            content:
              "Check if you qualify for this week's $DOJO reward",
          },
        },
        checkBtn: {
          type: "button" as const,
          props: { content: "Check Eligibility", variant: "primary" as const },
          on: {
            press: {
              action: "submit" as const,
              params: { target: `${base}/check` },
            },
          },
        },
      },
    },
  };
}

function eligiblePage(
  base: string,
  result: {
    reward: number;
    week: number;
    tierId: number;
    distributionId: number;
    proof: string[];
    address: string;
  },
) {
  const proofParam = result.proof.join(",");
  const claimUrl = `${CLAIM_BASE_URL}/claim?id=${result.distributionId}&proof=${proofParam}&address=${result.address}`;
  const snapUrl = process.env.SNAP_PUBLIC_BASE_URL ?? base;

  return {
    version: SPEC_VERSION,
    theme: { accent: "green" },
    ui: {
      root: "root",
      elements: {
        root: {
          type: "stack" as const,
          children: ["title", "detail", "claimBtn", "shareBtn"],
        },
        title: {
          type: "text" as const,
          props: { content: "You qualify!", weight: "bold" as const },
        },
        detail: {
          type: "text" as const,
          props: {
            content: `${result.reward} $DOJO — Week ${result.week}, Tier ${result.tierId}`,
          },
        },
        claimBtn: {
          type: "button" as const,
          props: { content: "Claim Now", variant: "primary" as const },
          on: {
            press: {
              action: "open_url" as const,
              params: { url: claimUrl },
            },
          },
        },
        shareBtn: {
          type: "button" as const,
          props: { content: "Share", variant: "secondary" as const },
          on: {
            press: {
              action: "compose_cast" as const,
              params: {
                text: `I qualified for ${result.reward} $DOJO this week! Check if you're eligible too`,
                embeds: [snapUrl] as [string],
                channelKey: "hunt",
              },
            },
          },
        },
      },
    },
  };
}

function alreadyClaimedPage(base: string, week: number) {
  const snapUrl = process.env.SNAP_PUBLIC_BASE_URL ?? base;

  return {
    version: SPEC_VERSION,
    theme: { accent: "green" },
    ui: {
      root: "root",
      elements: {
        root: {
          type: "stack" as const,
          children: ["title", "detail", "shareBtn"],
        },
        title: {
          type: "text" as const,
          props: { content: "Already Claimed", weight: "bold" as const },
        },
        detail: {
          type: "text" as const,
          props: {
            content: `You've already claimed your Week ${week} reward`,
          },
        },
        shareBtn: {
          type: "button" as const,
          props: { content: "Share", variant: "secondary" as const },
          on: {
            press: {
              action: "compose_cast" as const,
              params: {
                text: "I claimed my $DOJO reward! Check if you qualify too",
                embeds: [snapUrl] as [string],
                channelKey: "hunt",
              },
            },
          },
        },
      },
    },
  };
}

function notEligiblePage(base: string) {
  const snapUrl = process.env.SNAP_PUBLIC_BASE_URL ?? base;

  return {
    version: SPEC_VERSION,
    theme: { accent: "green" },
    ui: {
      root: "root",
      elements: {
        root: {
          type: "stack" as const,
          children: ["title", "detail", "shareBtn"],
        },
        title: {
          type: "text" as const,
          props: { content: "Not Eligible", weight: "bold" as const },
        },
        detail: {
          type: "text" as const,
          props: {
            content:
              "Your wallet isn't in this week's distribution. Keep checking in at the dojo!",
          },
        },
        shareBtn: {
          type: "button" as const,
          props: { content: "Share", variant: "secondary" as const },
          on: {
            press: {
              action: "compose_cast" as const,
              params: {
                text: "Check if you qualify for this week's $DOJO airdrop",
                embeds: [snapUrl] as [string],
                channelKey: "hunt",
              },
            },
          },
        },
      },
    },
  };
}

function errorPage(base: string, message: string) {
  return {
    version: SPEC_VERSION,
    theme: { accent: "green" },
    ui: {
      root: "root",
      elements: {
        root: {
          type: "stack" as const,
          children: ["title", "detail", "retryBtn"],
        },
        title: {
          type: "text" as const,
          props: { content: "Error", weight: "bold" as const },
        },
        detail: {
          type: "text" as const,
          props: { content: message },
        },
        retryBtn: {
          type: "button" as const,
          props: { content: "Try Again", variant: "primary" as const },
          on: {
            press: {
              action: "submit" as const,
              params: { target: `${base}/check` },
            },
          },
        },
      },
    },
  };
}

registerSnapHandler(app, snap);

const port = parseInt(process.env.PORT ?? "3003", 10);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Snap server running on http://localhost:${port}`);
});

export default app;
```

- [ ] **Step 2: Verify the snap runs locally**

```bash
cd snap && npm run dev
```

In another terminal:
```bash
curl -sS -H 'Accept: application/vnd.farcaster.snap+json' http://localhost:3003/
```

Expected: JSON response with `version`, `theme`, `ui` containing the root page elements.

- [ ] **Step 3: Commit**

```bash
git add snap/src/index.ts
git commit -m "feat(snap): implement snap server with eligibility check and share buttons"
```

---

### Task 5: Create the claim page

**Files:**
- Create: `src/pages/ClaimPage.jsx`
- Modify: `src/App.jsx`
- Modify: `src/i18n/locales/app.en.json`
- Modify: `src/i18n/locales/app.ja.json`
- Modify: `src/i18n/locales/app.kr.json`

- [ ] **Step 1: Add i18n keys for the claim page**

Add the following keys to the `"claim"` namespace in each locale file.

In `src/i18n/locales/app.en.json`, add after the last feature namespace:

```json
"claim": {
  "title": "Claim Your $DOJO",
  "connectWallet": "Connect your wallet to claim",
  "wrongWallet": "Please switch to {{address}} to claim this reward",
  "alreadyClaimed": "Already Claimed",
  "alreadyClaimedDesc": "This reward has already been collected",
  "claimButton": "Claim {{reward}} $DOJO",
  "claiming": "Claiming...",
  "success": "Successfully claimed your $DOJO reward!",
  "error": "Claim failed",
  "invalidParams": "Invalid claim link. Missing required parameters.",
  "backToDojo": "Back to Dojo"
}
```

In `src/i18n/locales/app.ja.json`:

```json
"claim": {
  "title": "$DOJOを受け取る",
  "connectWallet": "ウォレットを接続して受け取る",
  "wrongWallet": "{{address}}に切り替えてください",
  "alreadyClaimed": "受取済み",
  "alreadyClaimedDesc": "この報酬はすでに受け取りました",
  "claimButton": "{{reward}} $DOJOを受け取る",
  "claiming": "受取中...",
  "success": "$DOJOの報酬を受け取りました！",
  "error": "受取に失敗しました",
  "invalidParams": "無効なリンクです。必要なパラメータがありません。",
  "backToDojo": "道場に戻る"
}
```

In `src/i18n/locales/app.kr.json`:

```json
"claim": {
  "title": "$DOJO 받기",
  "connectWallet": "지갑을 연결하여 받기",
  "wrongWallet": "{{address}}로 전환해주세요",
  "alreadyClaimed": "이미 수령함",
  "alreadyClaimedDesc": "이 보상은 이미 수령했습니다",
  "claimButton": "{{reward}} $DOJO 받기",
  "claiming": "수령 중...",
  "success": "$DOJO 보상을 성공적으로 받았습니다!",
  "error": "수령 실패",
  "invalidParams": "잘못된 링크입니다. 필수 매개변수가 없습니다.",
  "backToDojo": "도장으로 돌아가기"
}
```

- [ ] **Step 2: Create `src/pages/ClaimPage.jsx`**

```jsx
import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@sekigahara/engine";
import { merkleDistributorAbi } from "@/config/abis/merkleDistributor.js";
import { MINT_CLUB } from "@/config/contracts.js";

export default function ClaimPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const distributionId = searchParams.get("id");
  const proofParam = searchParams.get("proof");
  const eligibleAddress = searchParams.get("address");

  // Parse proof from comma-separated hex strings
  const proof = proofParam ? proofParam.split(",") : [];

  // Validate required params
  if (!distributionId || !proofParam || !eligibleAddress) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-lg font-semibold">{t("claim.invalidParams")}</p>
        <Link to="/">
          <Button variant="outline">{t("claim.backToDojo")}</Button>
        </Link>
      </div>
    );
  }

  // Check if already claimed
  const { data: alreadyClaimed, isLoading: checkingClaimed } = useReadContract({
    address: MINT_CLUB.MERKLE,
    abi: merkleDistributorAbi,
    functionName: "isClaimed",
    args: [BigInt(distributionId), eligibleAddress],
  });

  const { writeContractAsync } = useWriteContract();

  const connectedLower = address?.toLowerCase();
  const eligibleLower = eligibleAddress.toLowerCase();
  const isWrongWallet = isConnected && connectedLower !== eligibleLower;

  async function handleClaim() {
    setIsClaiming(true);
    try {
      await writeContractAsync({
        address: MINT_CLUB.MERKLE,
        abi: merkleDistributorAbi,
        functionName: "claim",
        args: [BigInt(distributionId), proof],
      });
      setClaimSuccess(true);
    } catch (err) {
      console.error("Claim failed:", err);
    } finally {
      setIsClaiming(false);
    }
  }

  // Already claimed (from onchain check or after successful claim)
  if (alreadyClaimed || claimSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <CheckCircle className="h-12 w-12 text-green-500" />
        <h1 className="text-2xl font-bold">{t("claim.alreadyClaimed")}</h1>
        <p className="text-muted-foreground">{claimSuccess ? t("claim.success") : t("claim.alreadyClaimedDesc")}</p>
        <Link to="/">
          <Button variant="outline">{t("claim.backToDojo")}</Button>
        </Link>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-bold">{t("claim.title")}</h1>
        <p className="text-muted-foreground">{t("claim.connectWallet")}</p>
        <Button variant="primary" onClick={openConnectModal}>
          {t("claim.connectWallet")}
        </Button>
      </div>
    );
  }

  // Wrong wallet
  if (isWrongWallet) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500" />
        <h1 className="text-2xl font-bold">{t("claim.title")}</h1>
        <p className="text-muted-foreground">
          {t("claim.wrongWallet", {
            address: `${eligibleAddress.slice(0, 6)}...${eligibleAddress.slice(-4)}`,
          })}
        </p>
      </div>
    );
  }

  // Ready to claim
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">{t("claim.title")}</h1>
      <Button
        variant="primary"
        onClick={handleClaim}
        disabled={isClaiming || checkingClaimed}
      >
        {isClaiming ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("claim.claiming")}
          </>
        ) : (
          t("claim.claimButton", { reward: "" })
        )}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Add the `/claim` route to `App.jsx`**

Add the lazy import at the top of `App.jsx` with the other lazy imports:

```jsx
const ClaimPage = lazy(() => import("./pages/ClaimPage.jsx"));
```

Add the route inside the `<Routes>` block, after the existing routes:

```jsx
<Route path="/claim" element={
  <Suspense fallback={<Skeleton className="h-64 w-full" />}>
    <ClaimPage />
  </Suspense>
} />
```

- [ ] **Step 4: Verify the claim page renders locally**

```bash
npm run dev
```

Open `http://localhost:5173/claim` — should show the "Invalid claim link" error state (no query params).
Open `http://localhost:5173/claim?id=5848&proof=0xabc&address=0x1234` — should show the "Connect Wallet" state.

- [ ] **Step 5: Commit**

```bash
git add src/pages/ClaimPage.jsx src/App.jsx src/i18n/locales/app.en.json src/i18n/locales/app.ja.json src/i18n/locales/app.kr.json
git commit -m "feat: add /claim page for snap-initiated airdrop claiming"
```

---

### Task 6: Update cast notifier to embed snap URL

**Files:**
- Modify: `scripts/weekly-distribution/castNotifier.js`

- [ ] **Step 1: Replace the mint.club embed with the snap URL**

In `scripts/weekly-distribution/castNotifier.js`, change the `AIRDROP_BASE_URL` constant (line 12):

```js
// Before:
const AIRDROP_BASE_URL = "https://mint.club/airdrops/base";

// After:
const SNAP_URL = "https://dojo-claim-snap.host.neynar.app/";
```

In the `postTierNotification` function (around line 158-165), change:

```js
// Before:
const claimUrl = distributionId
  ? `${AIRDROP_BASE_URL}/${distributionId}`
  : null;

for (const cast of casts) {
  const embeds = [];
  if (cast.isParent) {
    if (claimUrl) embeds.push({ url: claimUrl });
    if (SEKI_EMBED_URL) embeds.push({ url: SEKI_EMBED_URL });
  }
```

to:

```js
for (const cast of casts) {
  const embeds = [];
  if (cast.isParent) {
    embeds.push({ url: SNAP_URL });
    if (SEKI_EMBED_URL) embeds.push({ url: SEKI_EMBED_URL });
  }
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: All distribution tests pass. The cast notifier doesn't have unit tests — the change is a string replacement.

- [ ] **Step 3: Commit**

```bash
git add scripts/weekly-distribution/castNotifier.js
git commit -m "feat: embed snap URL in distribution cast notifications

Replace the mint.club airdrop link with the dojo-claim-snap URL.
The snap renders in-feed, letting users check eligibility and claim
directly from Farcaster."
```

---

### Task 7: Deploy the snap to Neynar hosting

**Files:** None (operational)

- [ ] **Step 1: Build and archive the snap**

```bash
cd snap && npm run build
cd .. && tar czf /tmp/dojo-claim-snap.tar.gz -C snap --exclude=node_modules --exclude=src/server.ts .
```

- [ ] **Step 2: Deploy to Neynar**

```bash
curl -X POST https://api.host.neynar.app/v1/deploy \
  -F "files=@/tmp/dojo-claim-snap.tar.gz" \
  -F "projectName=dojo-claim-snap" \
  -F "framework=hono" \
  -F "env={\"SNAP_PUBLIC_BASE_URL\":\"https://dojo-claim-snap.host.neynar.app\",\"NEYNAR_API_KEY\":\"$NEYNAR_API_KEY\",\"DISTRIBUTION_SCHEMA_UID\":\"$VITE_DOJO_DISTRIBUTION_SCHEMA_UID\",\"MERKLE_DISTRIBUTOR\":\"0x1349A9DdEe26Fe16D0D44E35B3CB9B0CA18213a4\",\"CLAIM_BASE_URL\":\"https://dojo.sekigahara.app\"}"
```

Save the returned API key for future deployments.

- [ ] **Step 3: Verify the deployment**

```bash
curl -fsSL -H 'Accept: application/vnd.farcaster.snap+json' \
  'https://dojo-claim-snap.host.neynar.app/'
```

Expected: HTTP 200 with content-type `application/vnd.farcaster.snap+json` and the root page JSON.

- [ ] **Step 4: Test in Farcaster**

Cast the URL `https://dojo-claim-snap.host.neynar.app/` on Farcaster. The snap should render in-feed with the "Check Eligibility" button.

- [ ] **Step 5: Deploy claim page to Vercel**

```bash
vercel deploy --prod --force
```

- [ ] **Step 6: Push all changes**

```bash
git push origin main
```

---

## Verification Checklist

1. **Snap root page** renders in Farcaster with "Check Eligibility" button
2. **Eligible user** sees reward amount + "Claim Now" + "Share" buttons
3. **Not eligible user** sees "Not Eligible" message + "Share" button
4. **Already claimed user** sees "Already Claimed" message + "Share" button
5. **Claim button** opens system browser to `/claim` page with correct query params
6. **Claim page** connects wallet, executes `claim()` tx, shows success
7. **Wrong wallet** on claim page shows switch message
8. **Share buttons** compose casts to `/hunt` channel with snap URL embedded
9. **Weekly distribution cast** embeds the snap URL (not mint.club)
10. **Next Sunday's distribution** automatically casts with snap embed
