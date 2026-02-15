import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { SECONDS_PER_DAY } from "@/config/constants.js";

// Mock wagmi — useReadContract is the only external dependency
const mockUseReadContract = vi.fn();
vi.mock("wagmi", () => ({
  useReadContract: (...args) => mockUseReadContract(...args),
}));

// Import AFTER mocks are set up
const { useStreak } = await import("@/hooks/useStreak.js");

/**
 * Helper: configure mock returns for the three contract reads.
 * Each read is identified by its functionName arg.
 */
function mockResolverState({ lastCheckIn = 0n, currentStreak = 0n, longestStreak = 0n, isLoading = false, isError = false } = {}) {
  mockUseReadContract.mockImplementation(({ functionName }) => {
    const map = { lastCheckIn, currentStreak, longestStreak };
    return {
      data: map[functionName],
      isLoading,
      isError,
      error: isError ? new Error("rpc error") : null,
    };
  });
}

describe("useStreak", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Basic reads ────────────────────────────────────────────────────────

  it("returns zero state when no check-ins exist", () => {
    mockResolverState();
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.currentStreak).toBe(0);
    expect(result.current.longestStreak).toBe(0);
    expect(result.current.lastCheckIn).toBe(0);
  });

  it("returns streak values from contract", () => {
    mockResolverState({ currentStreak: 5n, longestStreak: 12n, lastCheckIn: BigInt(Date.now() / 1000 | 0) });
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.currentStreak).toBe(5);
    expect(result.current.longestStreak).toBe(12);
  });

  // ── Derived: hasCheckedInToday ─────────────────────────────────────────

  it("hasCheckedInToday is true when lastCheckIn is today", () => {
    const now = Date.now() / 1000 | 0;
    mockResolverState({ lastCheckIn: BigInt(now), currentStreak: 1n });
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.hasCheckedInToday).toBe(true);
  });

  it("hasCheckedInToday is false when lastCheckIn was yesterday", () => {
    const yesterday = (Date.now() / 1000 | 0) - SECONDS_PER_DAY;
    mockResolverState({ lastCheckIn: BigInt(yesterday), currentStreak: 1n });
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.hasCheckedInToday).toBe(false);
  });

  it("hasCheckedInToday is false when no check-ins exist", () => {
    mockResolverState();
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.hasCheckedInToday).toBe(false);
  });

  // ── Derived: currentTier ───────────────────────────────────────────────

  it("returns null tier when streak is 0", () => {
    mockResolverState();
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.currentTier).toBeNull();
  });

  it("returns beginner tier for streak 1-6", () => {
    mockResolverState({ currentStreak: 3n });
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.currentTier.id).toBe(1);
    expect(result.current.currentTier.nameKey).toBe("tier.beginner");
  });

  it("returns master tier for streak 30+", () => {
    mockResolverState({ currentStreak: 45n });
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.currentTier.id).toBe(4);
    expect(result.current.currentTier.nameKey).toBe("tier.master");
  });

  // ── Derived: isStreakAtRisk ────────────────────────────────────────────

  it("isStreakAtRisk is true when lastCheckIn was yesterday and not checked in today", () => {
    const yesterday = (Date.now() / 1000 | 0) - SECONDS_PER_DAY;
    mockResolverState({ lastCheckIn: BigInt(yesterday), currentStreak: 5n });
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.isStreakAtRisk).toBe(true);
  });

  it("isStreakAtRisk is false when already checked in today", () => {
    const now = Date.now() / 1000 | 0;
    mockResolverState({ lastCheckIn: BigInt(now), currentStreak: 5n });
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.isStreakAtRisk).toBe(false);
  });

  it("isStreakAtRisk is false when streak is 0", () => {
    mockResolverState();
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.isStreakAtRisk).toBe(false);
  });

  // ── Derived: timeUntilNextCheckIn ──────────────────────────────────────

  it("timeUntilNextCheckIn is a positive number of seconds", () => {
    const now = Date.now() / 1000 | 0;
    mockResolverState({ lastCheckIn: BigInt(now), currentStreak: 1n });
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.timeUntilNextCheckIn).toBeGreaterThan(0);
    expect(result.current.timeUntilNextCheckIn).toBeLessThanOrEqual(SECONDS_PER_DAY);
  });

  it("timeUntilNextCheckIn is 0 when not checked in today", () => {
    const yesterday = (Date.now() / 1000 | 0) - SECONDS_PER_DAY;
    mockResolverState({ lastCheckIn: BigInt(yesterday), currentStreak: 1n });
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.timeUntilNextCheckIn).toBe(0);
  });

  // ── Loading/error states ───────────────────────────────────────────────

  it("isLoading is true when any contract read is loading", () => {
    mockResolverState({ isLoading: true });
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.isLoading).toBe(true);
  });

  it("isError is true when any contract read errors", () => {
    mockResolverState({ isError: true });
    const { result } = renderHook(() => useStreak("0x1234567890abcdef1234567890abcdef12345678"));

    expect(result.current.isError).toBe(true);
  });

  // ── Null address ───────────────────────────────────────────────────────

  it("returns zero state when address is undefined", () => {
    mockResolverState();
    const { result } = renderHook(() => useStreak(undefined));

    expect(result.current.currentStreak).toBe(0);
    expect(result.current.longestStreak).toBe(0);
    expect(result.current.hasCheckedInToday).toBe(false);
  });
});
