import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock mint.club-v2-sdk (engine barrel loads this at import time)
vi.mock("mint.club-v2-sdk", () => ({
  mintclub: { withPublicClient: vi.fn() },
  wei: (n) => BigInt(n) * 10n ** 18n,
}));

// Mock contracts to provide a fake distribution schema UID
vi.mock("../../../src/config/contracts.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    DOJO_DISTRIBUTION_SCHEMA_UID: "0x0000000000000000000000000000000000000000000000000000000000000001",
  };
});

const mockWriteContract = vi.fn();
const mockWaitForTransactionReceipt = vi.fn();

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      waitForTransactionReceipt: mockWaitForTransactionReceipt,
    })),
    createWalletClient: vi.fn(() => ({
      writeContract: mockWriteContract,
    })),
    http: vi.fn(() => "mockTransport"),
  };
});

const { encodeDistributionData, attestDistributionTier, attestDistributions } =
  await import("../attestDistribution.js");

describe("attestDistribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteContract.mockResolvedValue("0xattesttxhash");
    mockWaitForTransactionReceipt.mockResolvedValue({
      status: "success",
      logs: [],
    });
  });

  describe("encodeDistributionData", () => {
    it("encodes distribution data without throwing", () => {
      const data = encodeDistributionData({
        app: "dojo",
        week: 3,
        tier: 1,
        distributionId: 5681,
        reward: 100,
        ipfsCID: "QmTestCid123",
      });

      expect(data).toBeDefined();
      expect(typeof data).toBe("string");
      expect(data.startsWith("0x")).toBe(true);
    });

    it("encodes different weeks/tiers to different data", () => {
      const data1 = encodeDistributionData({
        app: "dojo",
        week: 1,
        tier: 1,
        distributionId: 100,
        reward: 100,
        ipfsCID: "QmCid1",
      });

      const data2 = encodeDistributionData({
        app: "dojo",
        week: 2,
        tier: 2,
        distributionId: 200,
        reward: 150,
        ipfsCID: "QmCid2",
      });

      expect(data1).not.toBe(data2);
    });
  });

  describe("attestDistributionTier", () => {
    const mockWalletClient = {
      writeContract: mockWriteContract,
      account: { address: "0xOperator" },
    };
    const mockPublicClient = {
      waitForTransactionReceipt: mockWaitForTransactionReceipt,
    };

    it("calls writeContract with EAS attest function", async () => {
      const result = await attestDistributionTier({
        walletClient: mockWalletClient,
        publicClient: mockPublicClient,
        week: 3,
        tier: { id: 1, reward: 100 },
        distributionId: 5681,
        ipfsCID: "QmTestCid",
      });

      expect(mockWriteContract).toHaveBeenCalledTimes(1);
      const args = mockWriteContract.mock.calls[0][0];
      expect(args.functionName).toBe("attest");
      expect(result.hash).toBe("0xattesttxhash");
    });

    it("sets revocable to false", async () => {
      await attestDistributionTier({
        walletClient: mockWalletClient,
        publicClient: mockPublicClient,
        week: 3,
        tier: { id: 1, reward: 100 },
        distributionId: 5681,
        ipfsCID: "QmTestCid",
      });

      const args = mockWriteContract.mock.calls[0][0];
      expect(args.args[0].data.revocable).toBe(false);
    });

    it("sets recipient to operator address", async () => {
      await attestDistributionTier({
        walletClient: mockWalletClient,
        publicClient: mockPublicClient,
        week: 3,
        tier: { id: 1, reward: 100 },
        distributionId: 5681,
        ipfsCID: "QmTestCid",
      });

      const args = mockWriteContract.mock.calls[0][0];
      expect(args.args[0].data.recipient).toBe("0xOperator");
    });
  });

  describe("attestDistributions", () => {
    const mockWalletClient = {
      writeContract: mockWriteContract,
      account: { address: "0xOperator" },
    };
    const mockPublicClient = {
      waitForTransactionReceipt: mockWaitForTransactionReceipt,
    };

    it("attests each tier with valid data", async () => {
      const tierData = [
        { tier: { id: 1, reward: 100 }, distributionId: 5681, ipfsCID: "QmCid1" },
        { tier: { id: 2, reward: 150 }, distributionId: 5682, ipfsCID: "QmCid2" },
      ];

      await attestDistributions({
        walletClient: mockWalletClient,
        publicClient: mockPublicClient,
        weekNumber: 3,
        tierData,
      });

      expect(mockWriteContract).toHaveBeenCalledTimes(2);
    });

    it("skips tiers without distributionId", async () => {
      const tierData = [
        { tier: { id: 1, reward: 100 }, distributionId: null, ipfsCID: "QmCid1" },
        { tier: { id: 2, reward: 150 }, distributionId: 5682, ipfsCID: "QmCid2" },
      ];

      await attestDistributions({
        walletClient: mockWalletClient,
        publicClient: mockPublicClient,
        weekNumber: 3,
        tierData,
      });

      expect(mockWriteContract).toHaveBeenCalledTimes(1);
    });

    it("skips tiers without ipfsCID", async () => {
      const tierData = [
        { tier: { id: 1, reward: 100 }, distributionId: 5681, ipfsCID: "" },
      ];

      await attestDistributions({
        walletClient: mockWalletClient,
        publicClient: mockPublicClient,
        weekNumber: 3,
        tierData,
      });

      expect(mockWriteContract).toHaveBeenCalledTimes(0);
    });
  });
});
