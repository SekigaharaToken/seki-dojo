import { describe, it, expect, vi, beforeEach } from "vitest";

const { buildMerkleTree, createTreeJson } = await import(
  "../merkleBuilder.js"
);

describe("merkleBuilder", () => {
  it("builds a Merkle tree from wallet addresses", () => {
    const wallets = ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"];
    const tree = buildMerkleTree(wallets);

    expect(tree.root).toBeDefined();
    expect(typeof tree.root).toBe("string");
    expect(tree.root.startsWith("0x")).toBe(true);
  });

  it("generates a valid proof for a wallet in the tree", () => {
    const wallets = ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"];
    const tree = buildMerkleTree(wallets);
    const proof = tree.getProof(["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]);

    expect(Array.isArray(proof)).toBe(true);
    expect(proof.length).toBeGreaterThan(0);
  });

  it("returns empty tree data for empty wallet list", () => {
    const wallets = [];
    const tree = buildMerkleTree(wallets);
    // StandardMerkleTree throws on empty, so we handle it
    expect(tree).toBeNull();
  });

  it("creates the correct JSON structure for IPFS", () => {
    const wallets = ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"];
    const tree = buildMerkleTree(wallets);
    const json = createTreeJson({
      tree,
      wallets,
      week: 1,
      tierId: 2,
      tierName: "Apprentice",
      amountPerClaim: "150000000000000000000",
    });

    expect(json.version).toBe(1);
    expect(json.week).toBe(1);
    expect(json.tier).toBe(2);
    expect(json.tierName).toBe("Apprentice");
    expect(json.amountPerClaim).toBe("150000000000000000000");
    expect(json.root).toBe(tree.root);
    expect(json.walletCount).toBe(2);
    expect(json.wallets).toEqual(["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"]);
    expect(json.generatedAt).toBeDefined();
  });
});
