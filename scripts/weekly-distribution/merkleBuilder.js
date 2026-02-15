import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

/**
 * Build a StandardMerkleTree from an array of wallet addresses.
 * Each leaf is [address].
 *
 * @param {string[]} wallets
 * @returns {StandardMerkleTree | null}
 */
export function buildMerkleTree(wallets) {
  if (wallets.length === 0) return null;

  return StandardMerkleTree.of(
    wallets.map((w) => [w]),
    ["address"],
  );
}

/**
 * Create the JSON structure for IPFS pinning.
 *
 * @param {{ tree: StandardMerkleTree, wallets: string[], week: number, tierId: number, tierName: string, amountPerClaim: string }} params
 * @returns {object}
 */
export function createTreeJson({ tree, wallets, week, tierId, tierName, amountPerClaim }) {
  return {
    version: 1,
    week,
    tier: tierId,
    tierName,
    amountPerClaim,
    generatedAt: new Date().toISOString(),
    root: tree.root,
    walletCount: wallets.length,
    wallets,
  };
}
