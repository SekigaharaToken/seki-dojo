import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

// Mock mint.club-v2-sdk (engine barrel loads this at import time)
vi.mock("mint.club-v2-sdk", () => ({
  mintclub: { withPublicClient: vi.fn() },
  wei: (n) => BigInt(n) * 10n ** 18n,
}));

// Mock viem — use importOriginal so engine barrel's viem imports still work
const { mockGetLogs } = vi.hoisted(() => ({
  mockGetLogs: vi.fn(),
}));
vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createPublicClient: vi.fn(() => ({
      getLogs: mockGetLogs,
    })),
    http: vi.fn(() => "mockTransport"),
  };
});

// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xAlice" }),
}));

const { useCheckInHistory } = await import("@/hooks/useCheckInHistory.js");

describe("useCheckInHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array when no check-ins exist", () => {
    const { result } = renderHook(() => useCheckInHistory("0xAlice"), {
      wrapper: TestWrapper,
    });
    // Initial state before query resolves
    expect(result.current.checkIns).toEqual([]);
  });

  it("returns isLoading state", () => {
    const { result } = renderHook(() => useCheckInHistory("0xAlice"), {
      wrapper: TestWrapper,
    });
    // TanStack Query will be in loading initially
    expect(typeof result.current.isLoading).toBe("boolean");
  });

  it("returns totalCheckIns count", () => {
    const { result } = renderHook(() => useCheckInHistory("0xAlice"), {
      wrapper: TestWrapper,
    });
    expect(result.current.totalCheckIns).toBe(0);
  });

  it("returns empty when address is undefined", () => {
    const { result } = renderHook(() => useCheckInHistory(undefined), {
      wrapper: TestWrapper,
    });
    expect(result.current.checkIns).toEqual([]);
    expect(result.current.totalCheckIns).toBe(0);
  });
});
