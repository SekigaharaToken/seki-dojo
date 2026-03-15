/**
 * Distribution Log Writer
 *
 * Appends a markdown summary of each weekly distribution to
 * DISTRIBUTION_LOG.md. Designed to be committed back to the repo
 * by GitHub Actions after a successful run.
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAbiItem, decodeAbiParameters, parseAbiParameters } from "viem";
import { EAS_ADDRESS, DOJO_DISTRIBUTION_SCHEMA_UID } from "../../src/config/contracts.js";
import { DEPLOY_BLOCK } from "../../src/config/constants.js";
import { client, getLogsPaginated } from "./rpcClient.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const LOG_PATH = resolve(__dirname, "DISTRIBUTION_LOG.md");
const JSON_PATH = resolve(REPO_ROOT, "public/data/distributions.json");
const AIRDROP_BASE_URL = "https://mint.club/airdrops/base";

// Scan last ~7 days for distribution attestations (weekly events).
const SCAN_WINDOW_BLOCKS = 7n * 43_200n; // ~302,400 blocks

/**
 * Format and append a distribution run to the log file.
 *
 * @param {{ weekNumber: number, tierData: object[], fidMap: Map<string, { fid: number, username: string }> }} params
 */
export async function writeDistributionLog({ weekNumber, tierData, fidMap }) {
  const date = new Date().toISOString().split("T")[0];

  const lines = [`## Week ${weekNumber} — ${date}\n`];

  for (const { tier, addresses, txHash, distributionId } of tierData) {
    lines.push(`### Tier ${tier.id} (${tier.reward} $DOJO each)\n`);

    if (txHash) {
      lines.push(`- **TX:** \`${txHash}\``);
    }
    if (distributionId) {
      lines.push(
        `- **Distribution:** [${distributionId}](${AIRDROP_BASE_URL}/${distributionId})`,
      );
    }

    lines.push(`- **Wallets (${addresses.length}):**\n`);
    lines.push("| Address | Farcaster |");
    lines.push("|---------|-----------|");

    for (const addr of addresses) {
      const fc = fidMap.get(addr.toLowerCase());
      const fcName = fc ? `@${fc.username}` : "—";
      lines.push(`| \`${addr}\` | ${fcName} |`);
    }

    lines.push("");
  }

  lines.push("---\n");

  // Read existing log or start fresh
  let existing = "";
  try {
    existing = await readFile(LOG_PATH, "utf-8");
  } catch {
    // File doesn't exist yet — create with header
    existing = "# DOJO Distribution Log\n\n";
  }

  // Append new entry after the header
  const headerEnd = existing.indexOf("\n\n");
  const header = headerEnd > -1 ? existing.slice(0, headerEnd + 2) : existing;
  const body = headerEnd > -1 ? existing.slice(headerEnd + 2) : "";

  const newEntry = lines.join("\n");
  await writeFile(LOG_PATH, header + newEntry + body, "utf-8");

  console.log(`   Distribution log written to ${LOG_PATH}`);
}

/**
 * Read the highest week number from distributions.json and return next.
 * Returns the provided minimum if no prior distributions exist.
 *
 * @param {{ minimum?: number }} options
 * @returns {Promise<number>}
 */
export async function getNextWeekNumber({ minimum = 1 } = {}) {
  try {
    const raw = await readFile(JSON_PATH, "utf-8");
    const entries = JSON.parse(raw);
    if (entries.length === 0) return minimum;
    const maxWeek = Math.max(...entries.map((e) => e.week));
    return Math.max(maxWeek + 1, minimum);
  } catch {
    return minimum;
  }
}

/**
 * Read the highest week number from onchain EAS distribution attestations.
 * Falls back to getNextWeekNumber (JSON) if no attestations found or schema not configured.
 *
 * @param {{ minimum?: number }} options
 * @returns {Promise<number>}
 */
export async function getNextWeekNumberOnchain({ minimum = 1 } = {}) {
  if (!DOJO_DISTRIBUTION_SCHEMA_UID) {
    console.warn("   Distribution schema UID not configured, falling back to JSON");
    return getNextWeekNumber({ minimum });
  }

  try {
    const latest = await client.getBlockNumber();
    const scanFrom = latest > SCAN_WINDOW_BLOCKS
      ? latest - SCAN_WINDOW_BLOCKS
      : DEPLOY_BLOCK;
    const startBlock = scanFrom > DEPLOY_BLOCK ? scanFrom : DEPLOY_BLOCK;

    const allLogs = await getLogsPaginated({
      address: EAS_ADDRESS,
      event: parseAbiItem(
        "event Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)",
      ),
      args: { schemaUID: DOJO_DISTRIBUTION_SCHEMA_UID },
      fromBlock: startBlock,
      toBlock: latest,
    });

    if (allLogs.length === 0) {
      console.log("   No distribution attestations found onchain, falling back to JSON");
      return getNextWeekNumber({ minimum });
    }

    const easGetAttestationAbi = [{
      name: "getAttestation",
      type: "function",
      stateMutability: "view",
      inputs: [{ name: "uid", type: "bytes32" }],
      outputs: [{
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
      }],
    }];

    let maxWeek = 0;

    for (const log of allLogs) {
      const uid = log.args.uid;

      const attestation = await client.readContract({
        address: EAS_ADDRESS,
        abi: easGetAttestationAbi,
        functionName: "getAttestation",
        args: [uid],
      });

      const [, week] = decodeAbiParameters(
        parseAbiParameters("string app, uint16 week, uint8 tier, uint256 distributionId, uint16 reward, string ipfsCID"),
        attestation.data,
      );

      if (Number(week) > maxWeek) {
        maxWeek = Number(week);
      }
    }

    console.log(`   Onchain max week: ${maxWeek}`);
    return Math.max(maxWeek + 1, minimum);
  } catch (err) {
    console.warn(`   Onchain week lookup failed, falling back to JSON: ${err.message}`);
    return getNextWeekNumber({ minimum });
  }
}

/**
 * Write/update public/data/distributions.json for frontend consumption.
 * Newest week first. If the same week number exists, it is replaced.
 *
 * @param {{ weekNumber: number, tierData: object[] }} params
 */
export async function writeDistributionsJson({ weekNumber, tierData }) {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(resolve(REPO_ROOT, "public/data"), { recursive: true });

  const date = new Date().toISOString().split("T")[0];

  const entry = {
    week: weekNumber,
    date,
    tiers: tierData.map(({ tier, distributionId, addresses }) => ({
      tier: tier.id,
      distributionId: Number(distributionId),
      reward: tier.reward,
      addresses: addresses.map((a) => a.toLowerCase()),
    })),
  };

  // Read existing or start fresh
  let existing = [];
  try {
    const raw = await readFile(JSON_PATH, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    // File doesn't exist yet
  }

  // Replace same week if re-running, otherwise prepend
  const idx = existing.findIndex((e) => e.week === weekNumber);
  if (idx !== -1) {
    existing[idx] = entry;
  } else {
    existing.unshift(entry);
  }

  await writeFile(JSON_PATH, JSON.stringify(existing, null, 2) + "\n", "utf-8");
  console.log(`   Distributions JSON written to ${JSON_PATH}`);
}
