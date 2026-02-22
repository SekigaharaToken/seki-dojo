import { MerkleTree } from "merkletreejs";
import { keccak256, toHex } from "viem";

/**
 * Wrap viem's keccak256 to accept both hex strings and Buffer/Uint8Array,
 * since merkletreejs passes Buffer for intermediary node hashing.
 */
function hashFn(data) {
  if (typeof data === "string") return keccak256(data);
  return keccak256(toHex(data));
}

/**
 * Build a Merkle tree from an array of wallet addresses.
 * Uses merkletreejs with keccak256 + sortPairs to match Mint Club's
 * MerkleDistributor contract verification.
 *
 * @param {string[]} wallets
 * @returns {{ tree: MerkleTree, root: string } | null}
 */
export function buildMerkleTree(wallets) {
  if (wallets.length === 0) return null;

  const leaves = wallets.map((addr) => hashFn(addr));
  const tree = new MerkleTree(leaves, hashFn, { sortPairs: true });
  const root = `0x${tree.getRoot().toString("hex")}`;

  return { tree, root };
}

/**
 * Generate a Merkle proof for a specific address.
 *
 * @param {MerkleTree} tree - The Merkle tree instance
 * @param {string} address - The wallet address to prove
 * @returns {string[]} Array of hex proof nodes
 */
export function getMerkleProof(tree, address) {
  const leaf = hashFn(address);
  return tree.getHexProof(leaf);
}
