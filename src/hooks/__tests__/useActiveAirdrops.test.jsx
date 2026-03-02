import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock useWalletAddress
const mockUseWalletAddress = vi.fn(() => ({
  address: "0xABcD1234abcd1234abcd1234abcd1234abcd1234",
  isConnected: true,
}));

vi.mock("@sekigahara/engine", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useWalletAddress: (...args) => mockUseWalletAddress(...args) };
});

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const { useActiveAirdrops } = await import("@/hooks/useActiveAirdrops.js");

const WALLET = "0xabcd1234abcd1234abcd1234abcd1234abcd1234";

function makeDistributions(addresses = [WALLET]) {
  return [{
    week: 2,
    date: "2026-03-08",
    tiers: [
      { tier: 1, distributionId: 5700, reward: 100, addresses },
    ],
  }];
}

/** Fresh QueryClient per test to avoid cache leaks */
function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe("useActiveAirdrops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWalletAddress.mockReturnValue({
      address: "0xABcD1234abcd1234abcd1234abcd1234abcd1234",
      isConnected: true,
    });
  });

  it("returns airdrop data when wallet qualifies", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeDistributions(),
    });

    const { result } = renderHook(() => useActiveAirdrops(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.distributionId).toBe(5700);
    expect(result.current.reward).toBe(100);
    expect(result.current.tierId).toBe(1);
    expect(result.current.airdropUrl).toBe("https://mint.club/airdrops/base/5700");
    expect(result.current.proof).toBeDefined();
  });

  it("returns nulls when wallet does not qualify", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeDistributions(["0x1111111111111111111111111111111111111111"]),
    });

    const { result } = renderHook(() => useActiveAirdrops(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.distributionId).toBeNull();
    expect(result.current.airdropUrl).toBeNull();
  });

  it("handles empty JSON array", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useActiveAirdrops(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.distributionId).toBeNull();
  });

  it("handles 404 gracefully", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 404 });

    const { result } = renderHook(() => useActiveAirdrops(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.distributionId).toBeNull();
    expect(result.current.proof).toEqual([]);
  });

  it("matches addresses case-insensitively", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeDistributions([WALLET]),
    });

    mockUseWalletAddress.mockReturnValue({
      address: "0xABcD1234ABCD1234ABCD1234ABCD1234ABCD1234",
      isConnected: true,
    });

    const { result } = renderHook(() => useActiveAirdrops(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.distributionId).toBe(5700);
  });

  it("only scans the most recent week", async () => {
    const data = [
      { week: 3, date: "2026-03-15", tiers: [
        { tier: 1, distributionId: 5800, reward: 100, addresses: ["0x1111111111111111111111111111111111111111"] },
      ]},
      { week: 2, date: "2026-03-08", tiers: [
        { tier: 1, distributionId: 5700, reward: 100, addresses: [WALLET] },
      ]},
    ];

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => data,
    });

    const { result } = renderHook(() => useActiveAirdrops(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.distributionId).toBeNull();
  });

  it("returns proof array with hex strings", async () => {
    const addresses = [
      WALLET,
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
    ];
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => makeDistributions(addresses),
    });

    const { result } = renderHook(() => useActiveAirdrops(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(Array.isArray(result.current.proof)).toBe(true);
    expect(result.current.proof.length).toBeGreaterThan(0);
    expect(result.current.proof[0]).toMatch(/^0x/);
  });
});
