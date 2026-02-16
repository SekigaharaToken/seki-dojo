import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUseSwitchChain = vi.fn(() => ({
  switchChain: vi.fn(),
}));
const mockUseAccount = vi.fn(() => ({
  chainId: 84532,
  isConnected: true,
}));

vi.mock("wagmi", () => ({
  useSwitchChain: (...args) => mockUseSwitchChain(...args),
  useAccount: (...args) => mockUseAccount(...args),
}));

const { activeChain } = await import("@/config/chains.js");
const { useNetworkGuard } = await import("@/hooks/useNetworkGuard.js");

describe("useNetworkGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSwitchChain.mockReturnValue({ switchChain: vi.fn() });
    mockUseAccount.mockReturnValue({ chainId: activeChain.id, isConnected: true });
  });

  it("returns isWrongNetwork false when on Base", () => {
    const { result } = renderHook(() => useNetworkGuard());
    expect(result.current.isWrongNetwork).toBe(false);
  });

  it("returns isWrongNetwork true when on wrong chain", () => {
    mockUseAccount.mockReturnValue({ chainId: 1, isConnected: true });
    const { result } = renderHook(() => useNetworkGuard());
    expect(result.current.isWrongNetwork).toBe(true);
  });

  it("returns isWrongNetwork false when not connected", () => {
    mockUseAccount.mockReturnValue({ chainId: undefined, isConnected: false });
    const { result } = renderHook(() => useNetworkGuard());
    expect(result.current.isWrongNetwork).toBe(false);
  });

  it("provides a switchToBase function", () => {
    const { result } = renderHook(() => useNetworkGuard());
    expect(typeof result.current.switchToBase).toBe("function");
  });
});
