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

const { mockGetLogs, mockGetBlockNumber, mockReadContract } = vi.hoisted(() => ({
  mockGetLogs: vi.fn(),
  mockGetBlockNumber: vi.fn(),
  mockReadContract: vi.fn(),
}));

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getLogs: mockGetLogs,
      getBlockNumber: mockGetBlockNumber,
      readContract: mockReadContract,
    })),
    http: vi.fn(() => "mockTransport"),
  };
});

const { getNextWeekNumberOnchain } = await import("../distributionLog.js");

describe("getNextWeekNumberOnchain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBlockNumber.mockResolvedValue(50_000_000n);
  });

  it("falls back to minimum when no attestation logs found", async () => {
    mockGetLogs.mockResolvedValue([]);

    const result = await getNextWeekNumberOnchain({ minimum: 3 });
    expect(result).toBe(3);
  });

  it("returns max(week) + 1 from attestation data", async () => {
    const { encodeAbiParameters, parseAbiParameters } = await import("viem");

    const mockData = encodeAbiParameters(
      parseAbiParameters("string app, uint16 week, uint8 tier, uint256 distributionId, uint16 reward, string ipfsCID"),
      ["dojo", 5, 2, 5682n, 150, "QmCid"],
    );

    mockGetLogs.mockResolvedValue([
      { args: { uid: "0xuid1" } },
    ]);

    mockReadContract.mockResolvedValue({
      data: mockData,
    });

    const result = await getNextWeekNumberOnchain({ minimum: 1 });
    expect(result).toBe(6);
  });

  it("respects minimum even when onchain week is lower", async () => {
    const { encodeAbiParameters, parseAbiParameters } = await import("viem");

    const mockData = encodeAbiParameters(
      parseAbiParameters("string app, uint16 week, uint8 tier, uint256 distributionId, uint16 reward, string ipfsCID"),
      ["dojo", 1, 1, 100n, 100, "QmCid"],
    );

    mockGetLogs.mockResolvedValue([
      { args: { uid: "0xuid1" } },
    ]);

    mockReadContract.mockResolvedValue({
      data: mockData,
    });

    const result = await getNextWeekNumberOnchain({ minimum: 5 });
    expect(result).toBe(5);
  });

  it("falls back gracefully on RPC error", async () => {
    mockGetBlockNumber.mockRejectedValue(new Error("RPC timeout"));

    // Falls back to JSON-based getNextWeekNumber, which will also fail (no file)
    // and return the minimum
    const result = await getNextWeekNumberOnchain({ minimum: 3 });
    expect(result).toBe(3);
  });
});
