import { createPublicClient, createWalletClient, http, fallback, parseEventLogs } from "viem";
import { toAccount } from "viem/accounts";
import { CdpClient } from "@coinbase/cdp-sdk";
import { activeChain } from "../../src/config/chains.js";
import { MINT_CLUB } from "../../src/config/contracts.js";
import { merkleDistributorAbi } from "../../src/config/abis/merkleDistributor.js";
import { SECONDS_PER_DAY } from "../../src/config/constants.js";

// Same fallback RPCs as walletDiscovery — no divergence.
const transport = fallback([
  http("https://mainnet.base.org"),
  http("https://base-rpc.publicnode.com"),
  http("https://base.drpc.org"),
]);

const publicClient = createPublicClient({
  chain: activeChain,
  transport,
});

let _walletClient;

export function getPublicClient() {
  return publicClient;
}

export async function getWalletClient() {
  if (_walletClient) return _walletClient;
  const cdp = new CdpClient();
  const cdpAccount = await cdp.evm.getOrCreateAccount({ name: "dojo-operator" });
  _walletClient = createWalletClient({
    account: toAccount(cdpAccount),
    chain: activeChain,
    transport,
  });
  return _walletClient;
}

/**
 * Wait for any pending transactions to confirm before sending new ones.
 * Prevents "nonce too low" errors caused by stale/stuck transactions
 * from prior runs.
 *
 * @param {{ timeoutMs?: number, pollMs?: number }} options
 */
export async function syncNonce({ timeoutMs = 60_000, pollMs = 5_000 } = {}) {
  const walletClient = await getWalletClient();
  const address = walletClient.account.address;

  const latest = await publicClient.getTransactionCount({ address, blockTag: "latest" });
  const pending = await publicClient.getTransactionCount({ address, blockTag: "pending" });

  if (pending <= latest) return;

  const stuck = pending - latest;
  console.log(`\u26A0 ${stuck} pending tx(s) detected for ${address}`);
  console.log(`  Waiting up to ${timeoutMs / 1000}s for confirmation...`);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs));
    const current = await publicClient.getTransactionCount({ address, blockTag: "latest" });
    if (current >= pending) {
      console.log(`  \u2713 Nonce synchronized at ${current}`);
      return;
    }
  }

  throw new Error(
    `Nonce sync timeout: ${stuck} pending tx(s) did not confirm within ${timeoutMs / 1000}s. ` +
      `Address: ${address}. Check for stuck transactions on Basescan.`,
  );
}

/**
 * Get the current confirmed nonce for the wallet.
 * Call this once after syncNonce() and pass the result to each
 * transaction function, incrementing after each confirmation.
 */
export async function getCurrentNonce() {
  const walletClient = await getWalletClient();
  const address = walletClient.account.address;
  return await publicClient.getTransactionCount({ address, blockTag: "latest" });
}

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

/**
 * Approve ERC20 token spending. Waits for confirmation so nonce is
 * up-to-date for any subsequent writes.
 */
export async function approveToken({ tokenAddress, spender, amount, nonce }) {
  const walletClient = await getWalletClient();
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [spender, amount],
    ...(nonce != null && { nonce }),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Create a single Merkle distribution on the MerkleDistributor contract.
 * Waits for confirmation so nonce is up-to-date for the next tier.
 *
 * @param {{ tokenAddress: string, amountPerClaim: bigint, walletCount: number, merkleRoot: string, title: string, ipfsCID: string }} params
 * @returns {Promise<{ hash: string, distributionId: number }>}
 */
export async function createDistribution({
  tokenAddress,
  amountPerClaim,
  walletCount,
  merkleRoot,
  title,
  ipfsCID,
  nonce,
}) {
  const walletClient = await getWalletClient();
  // Use chain timestamp (not wall-clock) so times are valid on forks with evm_increaseTime
  const block = await publicClient.getBlock();
  const now = Number(block.timestamp);
  const startTime = now;
  const endTime = now + 7 * SECONDS_PER_DAY;

  const hash = await walletClient.writeContract({
    address: MINT_CLUB.MERKLE,
    abi: merkleDistributorAbi,
    functionName: "createDistribution",
    args: [
      tokenAddress,
      true, // isERC20
      amountPerClaim,
      walletCount,
      startTime,
      endTime,
      merkleRoot,
      title,
      ipfsCID,
    ],
    ...(nonce != null && { nonce }),
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const logs = parseEventLogs({ abi: merkleDistributorAbi, logs: receipt.logs });
  const createdLog = logs.find((l) => l.eventName === "Created");
  const distributionId = createdLog ? Number(createdLog.args.distributionId) : null;
  return { hash, distributionId };
}
