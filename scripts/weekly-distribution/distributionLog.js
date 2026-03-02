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

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOG_PATH = resolve(__dirname, "DISTRIBUTION_LOG.md");
const AIRDROP_BASE_URL = "https://mint.club/airdrops/base";

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
