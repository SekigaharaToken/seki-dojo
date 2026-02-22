import { describe, it, expect } from "vitest";

const { buildMerkleTree, getMerkleProof } = await import(
  "../merkleBuilder.js"
);

describe("merkleBuilder", () => {
  const wallets = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  ];

  it("builds a Merkle tree with a hex root", () => {
    const result = buildMerkleTree(wallets);

    expect(result).not.toBeNull();
    expect(result.root).toBeDefined();
    expect(typeof result.root).toBe("string");
    expect(result.root.startsWith("0x")).toBe(true);
    expect(result.root.length).toBe(66); // 0x + 64 hex chars
  });

  it("generates a valid proof for a wallet in the tree", () => {
    const { tree } = buildMerkleTree(wallets);
    const proof = getMerkleProof(tree, wallets[0]);

    expect(Array.isArray(proof)).toBe(true);
    expect(proof.length).toBeGreaterThan(0);
    expect(proof[0].startsWith("0x")).toBe(true);
  });

  it("returns null for empty wallet list", () => {
    const result = buildMerkleTree([]);
    expect(result).toBeNull();
  });

  it("produces deterministic roots", () => {
    const result1 = buildMerkleTree(wallets);
    const result2 = buildMerkleTree(wallets);
    expect(result1.root).toBe(result2.root);
  });
});
