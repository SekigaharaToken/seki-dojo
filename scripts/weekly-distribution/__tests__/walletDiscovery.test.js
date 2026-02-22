import { describe, it, expect, vi, beforeEach } from "vitest";
import { STREAK_TIERS } from "@/config/constants.js";

// Mock mint.club-v2-sdk (engine barrel loads this at import time)
vi.mock("mint.club-v2-sdk", () => ({
  mintclub: { withPublicClient: vi.fn() },
  wei: (n) => BigInt(n) * 10n ** 18n,
}));

// Mock viem client — use importOriginal so engine barrel's viem imports still work
const mockGetLogs = vi.fn();
const mockReadContract = vi.fn();

vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getLogs: mockGetLogs,
      readContract: mockReadContract,
      getBlockNumber: vi.fn().mockResolvedValue(50_000_000n),
    })),
    http: vi.fn(() => "mockTransport"),
  };
});

const { discoverWallets, bucketByTier } = await import(
  "../walletDiscovery.js"
);

describe("walletDiscovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── discoverWallets ────────────────────────────────────────────────────

  it("returns empty when no attestation logs exist", async () => {
    mockGetLogs.mockResolvedValue([]);
    const result = await discoverWallets();
    expect(result).toEqual([]);
  });

  it("extracts unique attester addresses from logs", async () => {
    mockGetLogs.mockResolvedValue([
      { args: { attester: "0xAlice" } },
      { args: { attester: "0xBob" } },
      { args: { attester: "0xAlice" } }, // duplicate
    ]);
    mockReadContract.mockResolvedValue(3n); // currentStreak
    // lastCheckIn = recent (within 7 days)
    mockReadContract.mockImplementation(({ functionName }) => {
      if (functionName === "currentStreak") return Promise.resolve(3n);
      if (functionName === "lastCheckIn")
        return Promise.resolve(BigInt(Math.floor(Date.now() / 1000)));
      return Promise.resolve(0n);
    });

    const result = await discoverWallets();
    expect(result).toHaveLength(2);
  });

  it("includes currentStreak and lastCheckIn for each wallet", async () => {
    mockGetLogs.mockResolvedValue([{ args: { attester: "0xAlice" } }]);
    mockReadContract.mockImplementation(({ functionName }) => {
      if (functionName === "currentStreak") return Promise.resolve(14n);
      if (functionName === "lastCheckIn")
        return Promise.resolve(BigInt(Math.floor(Date.now() / 1000)));
      return Promise.resolve(0n);
    });

    const result = await discoverWallets();
    expect(result[0].address).toBe("0xAlice");
    expect(result[0].currentStreak).toBe(14);
    expect(result[0].lastCheckIn).toBeGreaterThan(0);
  });

  it("filters out wallets with lastCheckIn older than 7 days", async () => {
    const sevenDaysAgo = Math.floor(Date.now() / 1000) - 8 * 86400;
    mockGetLogs.mockResolvedValue([
      { args: { attester: "0xAlice" } },
      { args: { attester: "0xBob" } },
    ]);
    mockReadContract.mockImplementation(({ functionName, args }) => {
      const wallet = args[0];
      if (wallet === "0xAlice") {
        if (functionName === "currentStreak") return Promise.resolve(5n);
        if (functionName === "lastCheckIn")
          return Promise.resolve(BigInt(Math.floor(Date.now() / 1000))); // recent
      }
      if (wallet === "0xBob") {
        if (functionName === "currentStreak") return Promise.resolve(10n);
        if (functionName === "lastCheckIn")
          return Promise.resolve(BigInt(sevenDaysAgo)); // stale
      }
      return Promise.resolve(0n);
    });

    const result = await discoverWallets();
    expect(result).toHaveLength(1);
    expect(result[0].address).toBe("0xAlice");
  });

  // ── bucketByTier ───────────────────────────────────────────────────────

  it("buckets wallets into correct tiers", () => {
    const wallets = [
      { address: "0xA", currentStreak: 10 }, // Tier 1 (7-13)
      { address: "0xB", currentStreak: 20 }, // Tier 2 (14-29)
      { address: "0xC", currentStreak: 45 }, // Tier 3 (30-59)
      { address: "0xD", currentStreak: 90 }, // Tier 4 (60+)
    ];

    const buckets = bucketByTier(wallets);
    expect(buckets[1].map((w) => w.address)).toEqual(["0xA"]);
    expect(buckets[2].map((w) => w.address)).toEqual(["0xB"]);
    expect(buckets[3].map((w) => w.address)).toEqual(["0xC"]);
    expect(buckets[4].map((w) => w.address)).toEqual(["0xD"]);
  });

  it("returns empty arrays for tiers with no wallets", () => {
    const wallets = [{ address: "0xA", currentStreak: 10 }];
    const buckets = bucketByTier(wallets);
    expect(buckets[1]).toHaveLength(1);
    expect(buckets[2]).toHaveLength(0);
    expect(buckets[3]).toHaveLength(0);
    expect(buckets[4]).toHaveLength(0);
  });

  it("excludes wallets with streak below minimum tier", () => {
    const wallets = [
      { address: "0xA", currentStreak: 0 },
      { address: "0xB", currentStreak: 3 },
      { address: "0xC", currentStreak: 7 },
    ];
    const buckets = bucketByTier(wallets);
    expect(buckets[1]).toHaveLength(1);
    expect(buckets[1][0].address).toBe("0xC");
  });
});
