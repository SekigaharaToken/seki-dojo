import { describe, it, expect, vi, beforeEach } from "vitest";

const mockWriteContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();
const mockReadContract = vi.fn();

vi.mock("viem", () => ({
  createPublicClient: vi.fn(() => ({
    readContract: mockReadContract,
    waitForTransactionReceipt: mockWaitForTransactionReceipt,
    getBlock: vi.fn().mockResolvedValue({ timestamp: 1700000000n }),
  })),
  createWalletClient: vi.fn(() => ({
    writeContract: mockWriteContract,
  })),
  http: vi.fn(() => "mockTransport"),
  parseUnits: vi.fn((val) => BigInt(val) * 10n ** 18n),
}));

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn(() => ({ address: "0xOperator" })),
}));

const { createDistribution, approveToken } = await import(
  "../createDistributions.js"
);

describe("createDistributions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteContract.mockResolvedValue("0xmocktxhash");
    mockWaitForTransactionReceipt.mockResolvedValue({ status: "success" });
  });

  it("calls writeContract with correct createDistribution params", async () => {
    const result = await createDistribution({
      tokenAddress: "0xDojoToken",
      amountPerClaim: 100n * 10n ** 18n,
      walletCount: 5,
      merkleRoot: "0xrootabc",
      title: "DOJO Week 1 - Tier 1",
      ipfsCID: "QmTestCid",
    });

    expect(mockWriteContract).toHaveBeenCalledTimes(1);
    const args = mockWriteContract.mock.calls[0][0];
    expect(args.functionName).toBe("createDistribution");
    expect(result).toBe("0xmocktxhash");
  });

  it("passes isERC20 as true", async () => {
    await createDistribution({
      tokenAddress: "0xDojoToken",
      amountPerClaim: 100n * 10n ** 18n,
      walletCount: 5,
      merkleRoot: "0xroot",
      title: "test",
      ipfsCID: "QmTest",
    });

    const args = mockWriteContract.mock.calls[0][0];
    // isERC20 should be true in the args
    expect(args.args).toBeDefined();
    expect(args.args[1]).toBe(true); // isERC20
  });

  it("approveToken calls ERC20 approve on token contract", async () => {
    await approveToken({
      tokenAddress: "0xDojoToken",
      spender: "0xMerkleDistributor",
      amount: 500n * 10n ** 18n,
    });

    expect(mockWriteContract).toHaveBeenCalledTimes(1);
    const args = mockWriteContract.mock.calls[0][0];
    expect(args.functionName).toBe("approve");
    expect(args.address).toBe("0xDojoToken");
  });

  it("throws when writeContract fails", async () => {
    mockWriteContract.mockRejectedValueOnce(new Error("insufficient funds"));

    await expect(
      createDistribution({
        tokenAddress: "0xDojoToken",
        amountPerClaim: 100n * 10n ** 18n,
        walletCount: 5,
        merkleRoot: "0xroot",
        title: "test",
        ipfsCID: "QmTest",
      }),
    ).rejects.toThrow("insufficient funds");
  });
});
