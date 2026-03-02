import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock mint.club-v2-sdk (engine barrel loads this at import time)
vi.mock("mint.club-v2-sdk", () => ({
  mintclub: { withPublicClient: vi.fn() },
  wei: (n) => BigInt(n) * 10n ** 18n,
}));

const mockWriteContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();
const mockReadContract = vi.fn();

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      readContract: mockReadContract,
      waitForTransactionReceipt: mockWaitForTransactionReceipt,
      getBlock: vi.fn().mockResolvedValue({ timestamp: 1700000000n }),
    })),
    createWalletClient: vi.fn(() => ({
      writeContract: mockWriteContract,
    })),
    http: vi.fn(() => "mockTransport"),
  };
});

vi.mock("viem/accounts", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    toAccount: vi.fn((cdpAccount) => cdpAccount),
  };
});

vi.mock("@coinbase/cdp-sdk", () => ({
  CdpClient: class MockCdpClient {
    constructor() {
      this.evm = {
        getOrCreateAccount: vi.fn().mockResolvedValue({ address: "0xOperator" }),
      };
    }
  },
}));

const { createDistribution, approveToken } = await import(
  "../createDistributions.js"
);

describe("createDistributions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteContract.mockResolvedValue("0xmocktxhash");
    mockWaitForTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [],
    });
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
    expect(result.hash).toBe("0xmocktxhash");
    expect(result.distributionId).toBeNull(); // no Created event in mock logs
  });

  it("extracts distributionId from Created event log", async () => {
    const { encodeEventTopics, encodeAbiParameters } = await import("viem");
    const { merkleDistributorAbi } = await import(
      "../../../src/config/abis/merkleDistributor.js"
    );
    const createdEvent = merkleDistributorAbi.find((e) => e.name === "Created");
    const topics = encodeEventTopics({
      abi: [createdEvent],
      eventName: "Created",
      args: {
        distributionId: 5644n,
        token: "0x6edb6D582B5CFaB335Ec45384F3Ff18C1c4Fc22d",
      },
    });
    const data = encodeAbiParameters(
      [{ type: "bool" }, { type: "uint40" }],
      [true, 1700000000],
    );

    mockWaitForTransactionReceipt.mockResolvedValueOnce({
      status: "success",
      logs: [{ topics, data }],
    });

    const result = await createDistribution({
      tokenAddress: "0xDojoToken",
      amountPerClaim: 100n * 10n ** 18n,
      walletCount: 5,
      merkleRoot: "0xrootabc",
      title: "DOJO Week 1 - Tier 1",
      ipfsCID: "QmTestCid",
    });

    expect(result.hash).toBe("0xmocktxhash");
    expect(result.distributionId).toBe(5644);
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
