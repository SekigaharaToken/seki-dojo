import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUseAccount = vi.fn(() => ({
  address: undefined,
  isConnected: false,
}));

const mockUseFarcaster = vi.fn(() => ({
  isAuthenticated: false,
  profile: null,
}));

vi.mock("wagmi", () => ({
  useAccount: (...args) => mockUseAccount(...args),
}));

vi.mock("@/hooks/useFarcaster.js", () => ({
  useFarcaster: (...args) => mockUseFarcaster(...args),
}));

const { useWalletAddress } = await import("@/hooks/useWalletAddress.js");

describe("useWalletAddress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccount.mockReturnValue({ address: undefined, isConnected: false });
    mockUseFarcaster.mockReturnValue({ isAuthenticated: false, profile: null });
  });

  it("returns null when neither wagmi nor farcaster connected", () => {
    const { result } = renderHook(() => useWalletAddress());
    expect(result.current.address).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.canTransact).toBe(false);
  });

  it("returns wagmi address when wallet connected", () => {
    mockUseAccount.mockReturnValue({
      address: "0xWagmiAddress",
      isConnected: true,
    });
    const { result } = renderHook(() => useWalletAddress());
    expect(result.current.address).toBe("0xWagmiAddress");
    expect(result.current.isConnected).toBe(true);
    expect(result.current.canTransact).toBe(true);
  });

  it("returns farcaster custody address when only farcaster authenticated", () => {
    mockUseFarcaster.mockReturnValue({
      isAuthenticated: true,
      profile: {
        custody: "0xFarcasterCustody",
        verifications: ["0xVerifiedAddr"],
      },
    });
    const { result } = renderHook(() => useWalletAddress());
    expect(result.current.address).toBe("0xFarcasterCustody");
    expect(result.current.isConnected).toBe(true);
    expect(result.current.canTransact).toBe(false);
  });

  it("prefers wagmi address over farcaster when both connected", () => {
    mockUseAccount.mockReturnValue({
      address: "0xWagmiAddress",
      isConnected: true,
    });
    mockUseFarcaster.mockReturnValue({
      isAuthenticated: true,
      profile: { custody: "0xFarcasterCustody" },
    });
    const { result } = renderHook(() => useWalletAddress());
    expect(result.current.address).toBe("0xWagmiAddress");
    expect(result.current.canTransact).toBe(true);
  });

  it("falls back to first verification if no custody", () => {
    mockUseFarcaster.mockReturnValue({
      isAuthenticated: true,
      profile: {
        custody: undefined,
        verifications: ["0xVerifiedAddr"],
      },
    });
    const { result } = renderHook(() => useWalletAddress());
    expect(result.current.address).toBe("0xVerifiedAddr");
  });
});
