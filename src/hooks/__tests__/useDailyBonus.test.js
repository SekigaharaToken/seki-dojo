import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock wagmi
const mockWriteContractAsync = vi.fn();
const mockUseWriteContract = vi.fn(() => ({
  writeContractAsync: mockWriteContractAsync,
  isPending: false,
}));
const mockUseReadContract = vi.fn(() => ({
  data: undefined,
  isLoading: false,
}));
vi.mock("wagmi", () => ({
  useWriteContract: (...args) => mockUseWriteContract(...args),
  useReadContract: (...args) => mockUseReadContract(...args),
}));

// Mock useWalletAddress
const mockUseWalletAddress = vi.fn(() => ({
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  isConnected: true,
}));
vi.mock("@/hooks/useWalletAddress.js", () => ({
  useWalletAddress: (...args) => mockUseWalletAddress(...args),
}));

// Mock useStreak
const mockUseStreak = vi.fn(() => ({
  currentStreak: 10,
  longestStreak: 10,
  hasCheckedInToday: true,
  currentTier: null,
  isLoading: false,
  isError: false,
}));
vi.mock("@/hooks/useStreak.js", () => ({
  useStreak: (...args) => mockUseStreak(...args),
}));

// Mock contract addresses
vi.mock("@/config/contracts.js", () => ({
  DAILY_BONUS_ADDRESS: "0xDailyBonusAddress",
  DOJO_TOKEN_ADDRESS: "0xDojoTokenAddress",
}));

const { useDailyBonus } = await import("@/hooks/useDailyBonus.js");

describe("useDailyBonus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteContractAsync.mockResolvedValue("0xbonustxhash");
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
    });
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    mockUseWalletAddress.mockReturnValue({
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      isConnected: true,
    });
    mockUseStreak.mockReturnValue({
      currentStreak: 10,
      longestStreak: 10,
      hasCheckedInToday: true,
      currentTier: null,
      isLoading: false,
      isError: false,
    });
  });

  it("returns zero state when no wallet connected", () => {
    mockUseWalletAddress.mockReturnValue({ address: undefined, isConnected: false });
    mockUseStreak.mockReturnValue({
      currentStreak: 0,
      longestStreak: 0,
      hasCheckedInToday: false,
      currentTier: null,
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useDailyBonus());

    expect(result.current.canClaim).toBe(false);
    expect(result.current.estimatedBonus).toBe(0n);
    expect(result.current.formattedBonus).toBe("0");
  });

  it("canClaim reflects contract read", () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === "canClaimToday") return { data: true, isLoading: false };
      if (functionName === "calculateBonus") return { data: 15000000000000000000n, isLoading: false };
      if (functionName === "balanceOf") return { data: 10000000000000000000000n, isLoading: false };
      return { data: undefined, isLoading: false };
    });

    const { result } = renderHook(() => useDailyBonus());

    expect(result.current.canClaim).toBe(true);
  });

  it("estimatedBonus formats correctly", () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === "canClaimToday") return { data: true, isLoading: false };
      if (functionName === "calculateBonus") return { data: 15000000000000000000n, isLoading: false };
      if (functionName === "balanceOf") return { data: 10000000000000000000000n, isLoading: false };
      return { data: undefined, isLoading: false };
    });

    const { result } = renderHook(() => useDailyBonus());

    expect(result.current.formattedBonus).toBe("15");
    expect(result.current.estimatedBonus).toBe(15000000000000000000n);
  });

  it("bonusRate mirrors contract logic for streak 10", () => {
    // streak 10: 10 + floor((10 * 10) / 30) = 10 + 3 = 13
    const { result } = renderHook(() => useDailyBonus());

    expect(result.current.bonusRate).toBe(13);
  });

  it("bonusRate caps at MAX_RATE for streak 30+", () => {
    mockUseStreak.mockReturnValue({
      currentStreak: 45,
      longestStreak: 45,
      hasCheckedInToday: true,
      currentTier: null,
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useDailyBonus());

    expect(result.current.bonusRate).toBe(20);
  });

  it("claim calls writeContractAsync with correct params", async () => {
    mockUseReadContract.mockImplementation(({ functionName }) => {
      if (functionName === "canClaimToday") return { data: true, isLoading: false };
      if (functionName === "calculateBonus") return { data: 10000000000000000000n, isLoading: false };
      return { data: undefined, isLoading: false };
    });

    const { result } = renderHook(() => useDailyBonus());

    await act(async () => {
      await result.current.claim();
    });

    expect(mockWriteContractAsync).toHaveBeenCalledTimes(1);
    const args = mockWriteContractAsync.mock.calls[0][0];
    expect(args.address).toBe("0xDailyBonusAddress");
    expect(args.functionName).toBe("claimDailyBonus");
  });

  it("isPending reflects writeContract state", () => {
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: true,
    });

    const { result } = renderHook(() => useDailyBonus());

    expect(result.current.isPending).toBe(true);
  });

  it("isConfigured is true when DAILY_BONUS_ADDRESS is set", () => {
    const { result } = renderHook(() => useDailyBonus());

    expect(result.current.isConfigured).toBe(true);
  });
});
