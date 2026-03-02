/**
 * Farcaster Cast Notifications via Neynar API
 *
 * After weekly distribution, posts tier-specific casts to /hunt channel
 * with @-mentions of eligible users. Non-fatal — distribution has already
 * succeeded by the time this runs.
 */

const NEYNAR_BASE = "https://api.neynar.com/v2/farcaster";
const MENTION_LIMIT = 10; // Farcaster max mentions per cast
const ADDRESS_BATCH_SIZE = 350; // Neynar bulk lookup limit
const AIRDROP_BASE_URL = "https://mint.club/airdrops/base";
const SEKI_TOKEN = process.env.VITE_SEKI_TOKEN_ADDRESS?.toLowerCase() || "";
const SEKI_EMBED_URL = SEKI_TOKEN
  ? `https://farcaster.xyz/~/c/base:${SEKI_TOKEN}`
  : null;
const CHANNEL_ID = "hunt";

/**
 * Resolve wallet addresses to Farcaster FIDs via Neynar bulk lookup.
 * Wallets without Farcaster accounts are silently omitted.
 * @param {string[]} addresses
 * @returns {Promise<Map<string, { fid: number, username: string }>>}
 */
export async function resolveAddressesToFids(addresses) {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) throw new Error("NEYNAR_API_KEY not set");

  const fidMap = new Map();
  const lowered = addresses.map((a) => a.toLowerCase());

  // Chunk into batches of ADDRESS_BATCH_SIZE
  for (let i = 0; i < lowered.length; i += ADDRESS_BATCH_SIZE) {
    const batch = lowered.slice(i, i + ADDRESS_BATCH_SIZE);
    const params = new URLSearchParams({ addresses: batch.join(",") });

    const res = await fetch(`${NEYNAR_BASE}/user/bulk-by-address?${params}`, {
      headers: { "x-api-key": apiKey },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Neynar address lookup failed (${res.status}): ${text}`);
    }

    const data = await res.json();
    // Response shape: { [address]: [{ fid, username, ... }] }
    for (const [addr, users] of Object.entries(data)) {
      if (users && users.length > 0) {
        fidMap.set(addr.toLowerCase(), {
          fid: users[0].fid,
          username: users[0].username,
        });
      }
    }
  }

  return fidMap;
}

/**
 * Compose casts for a tier. Parent cast is the announcement (no mentions).
 * All @-mentions go in reply casts, max MENTION_LIMIT per reply.
 *
 * @param {{ tier: object, reward: number, weekNumber: number, fidMap: Map, addresses: string[] }} params
 * @returns {{ text: string, mentions: number[], mentionsPositions: number[], isParent: boolean }[]}
 */
export function composeCasts({ tier, reward, weekNumber, fidMap, addresses }) {
  // Filter to addresses that have FC accounts
  const mentionable = addresses
    .map((a) => a.toLowerCase())
    .filter((a) => fidMap.has(a))
    .map((a) => fidMap.get(a));

  const walletCount = addresses.length;
  const header = `DOJO Week ${weekNumber} rewards are ready!\n\nTier ${tier.id}: ${walletCount} warrior${walletCount !== 1 ? "s" : ""} earned ${reward} $DOJO each.\n\nClaim yours:`;

  // Parent cast: announcement only, no mentions
  const casts = [{ text: header, mentions: [], mentionsPositions: [], isParent: true }];

  if (mentionable.length === 0) return casts;

  // Reply casts: chunk mentionable users into groups of MENTION_LIMIT
  for (let i = 0; i < mentionable.length; i += MENTION_LIMIT) {
    const chunk = mentionable.slice(i, i + MENTION_LIMIT);
    let text = "";
    const mentions = [];
    const mentionsPositions = [];

    for (let mi = 0; mi < chunk.length; mi++) {
      const bytePos = Buffer.byteLength(text, "utf8");
      mentions.push(chunk[mi].fid);
      mentionsPositions.push(bytePos);
      // Add space separator (Neynar replaces the position with @username)
      text += mi < chunk.length - 1 ? " " : "";
    }

    casts.push({ text, mentions, mentionsPositions, isParent: false });
  }

  return casts;
}

/**
 * Post a single cast via Neynar.
 * @param {{ text: string, mentions: number[], mentionsPositions: number[], embeds?: object[], channelId?: string, parentHash?: string }} params
 * @returns {Promise<string>} cast hash
 */
export async function postCast({ text, mentions, mentionsPositions, embeds, channelId, parentHash }) {
  const apiKey = process.env.NEYNAR_API_KEY;
  const signerUuid = process.env.NEYNAR_SIGNER_UUID;
  if (!apiKey) throw new Error("NEYNAR_API_KEY not set");
  if (!signerUuid) throw new Error("NEYNAR_SIGNER_UUID not set");

  const body = {
    signer_uuid: signerUuid,
    text,
  };

  if (mentions && mentions.length > 0) {
    body.mentions = mentions;
    body.mentions_positions = mentionsPositions;
  }
  if (embeds && embeds.length > 0) body.embeds = embeds;
  if (channelId) body.channel_id = channelId;
  if (parentHash) body.parent = parentHash;

  const res = await fetch(`${NEYNAR_BASE}/cast`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Neynar post cast failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.cast?.hash || data.hash;
}

/**
 * Post notification casts for a single tier.
 * Parent cast has the announcement + airdrop embed link.
 * Reply casts contain @-mentions (max 10 per reply).
 * @param {{ tier: object, reward: number, weekNumber: number, fidMap: Map, addresses: string[], distributionId?: number }} params
 * @returns {Promise<string[]>} array of cast hashes
 */
export async function postTierNotification({ tier, reward, weekNumber, fidMap, addresses, distributionId }) {
  const casts = composeCasts({ tier, reward, weekNumber, fidMap, addresses });
  const hashes = [];
  let parentHash = null;

  const claimUrl = distributionId
    ? `${AIRDROP_BASE_URL}/${distributionId}`
    : null;

  for (const cast of casts) {
    const embeds = [];
    if (cast.isParent) {
      if (claimUrl) embeds.push({ url: claimUrl });
      if (SEKI_EMBED_URL) embeds.push({ url: SEKI_EMBED_URL });
    }

    const hash = await postCast({
      text: cast.text,
      mentions: cast.mentions,
      mentionsPositions: cast.mentionsPositions,
      embeds: embeds.length > 0 ? embeds : undefined,
      channelId: cast.isParent ? CHANNEL_ID : undefined,
      parentHash: parentHash || undefined,
    });
    hashes.push(hash);
    if (cast.isParent) parentHash = hash;
  }

  return hashes;
}

/**
 * Format a dry-run preview of what casts would be sent.
 * @param {{ tierData: object[], weekNumber: number, fidMap: Map }} params
 * @returns {string} preview text
 */
export function formatDryRunPreview({ tierData, weekNumber, fidMap }) {
  const lines = ["\n=== Cast notification preview ===\n"];

  for (const { tier, addresses } of tierData) {
    const mentionable = addresses
      .map((a) => a.toLowerCase())
      .filter((a) => fidMap.has(a))
      .map((a) => `@${fidMap.get(a).username}`);

    lines.push(`  Tier ${tier.id} (${tier.reward} $DOJO):`);
    lines.push(`    ${addresses.length} wallets, ${mentionable.length} with Farcaster accounts`);
    if (mentionable.length > 0) {
      lines.push(`    Mentions: ${mentionable.join(", ")}`);
      const replyCount = Math.ceil(mentionable.length / MENTION_LIMIT);
      lines.push(`    Would post 1 announcement + ${replyCount} reply cast${replyCount !== 1 ? "s" : ""} to /${CHANNEL_ID}`);
    } else {
      lines.push(`    Would post 1 announcement (no mentions) to /${CHANNEL_ID}`);
    }
  }

  lines.push("\n=== No casts sent (dry run) ===\n");
  return lines.join("\n");
}

/**
 * Top-level orchestrator: resolve FIDs and post casts for all tiers.
 * Non-fatal — catches and warns on errors.
 * @param {{ tierResults: object[], weekNumber: number, dryRun?: boolean }} params
 */
export async function notifyDistributions({ tierResults, weekNumber, dryRun = false }) {
  // Collect all unique addresses
  const allAddresses = [...new Set(tierResults.flatMap((t) => t.addresses))];

  if (allAddresses.length === 0) {
    console.log("   No addresses to notify.");
    return;
  }

  console.log(`\n6. Resolving Farcaster accounts for ${allAddresses.length} addresses...`);
  const fidMap = await resolveAddressesToFids(allAddresses);
  console.log(`   Found ${fidMap.size} Farcaster accounts`);

  if (dryRun) {
    console.log(formatDryRunPreview({ tierData: tierResults, weekNumber, fidMap }));
    return;
  }

  console.log("7. Posting cast notifications...");
  for (const { tier, addresses, distributionId } of tierResults) {
    try {
      const hashes = await postTierNotification({
        tier,
        reward: tier.reward,
        weekNumber,
        fidMap,
        addresses,
        distributionId,
      });
      console.log(`   Tier ${tier.id}: ${hashes.length} cast(s) posted — ${hashes.join(", ")}`);
    } catch (err) {
      console.warn(`   Tier ${tier.id} cast failed (non-fatal): ${err.message}`);
    }
  }
}
