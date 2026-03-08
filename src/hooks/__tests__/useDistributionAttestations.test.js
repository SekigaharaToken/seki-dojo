import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

// Mock mint.club-v2-sdk (engine barrel loads this at import time)
vi.mock("mint.club-v2-sdk", () => ({
  mintclub: { withPublicClient: vi.fn() },
  wei: (n) => BigInt(n) * 10n ** 18n,
}));

// Mock viem — use importOriginal so engine barrel's viem imports still work
const { mockGetLogs, mockReadContract } = vi.hoisted(() => ({
  mockGetLogs: vi.fn(),
  mockReadContract: vi.fn(),
}));
vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getLogs: mockGetLogs,
      getBlockNumber: vi.fn().mockResolvedValue(50_000_000n),
      readContract: mockReadContract,
    })),
    http: vi.fn(() => "mockTransport"),
  };
});

// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xAlice" }),
}));

const { useDistributionAttestations } = await import(
  "@/hooks/useDistributionAttestations.js"
);

describe("useDistributionAttestations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty distributions initially", () => {
    const { result } = renderHook(() => useDistributionAttestations(), {
      wrapper: TestWrapper,
    });
    expect(result.current.distributions).toEqual([]);
  });

  it("returns isLoading state", () => {
    const { result } = renderHook(() => useDistributionAttestations(), {
      wrapper: TestWrapper,
    });
    expect(typeof result.current.isLoading).toBe("boolean");
  });

  it("returns isError state", () => {
    const { result } = renderHook(() => useDistributionAttestations(), {
      wrapper: TestWrapper,
    });
    expect(typeof result.current.isError).toBe("boolean");
  });
});
