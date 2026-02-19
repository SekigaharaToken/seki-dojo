import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

// Mock wagmi
const mockWriteContractAsync = vi.fn();
const mockUseWriteContract = vi.fn(() => ({
  writeContractAsync: mockWriteContractAsync,
  isPending: false,
}));
const mockUseReadContract = vi.fn(() => ({
  data: false, // isClaimed = false
  isLoading: false,
}));
vi.mock("wagmi", () => ({
  useWriteContract: (...args) => mockUseWriteContract(...args),
  useReadContract: (...args) => mockUseReadContract(...args),
}));

const mockUseWalletAddress = vi.fn(() => ({
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  isConnected: true,
}));
vi.mock("@sekigahara/engine", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useWalletAddress: (...args) => mockUseWalletAddress(...args) };
});

const { useClaim } = await import("@/hooks/useClaim.js");

describe("useClaim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteContractAsync.mockResolvedValue("0xclaimtxhash");
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
    });
    mockUseReadContract.mockReturnValue({
      data: false,
      isLoading: false,
    });
  });

  it("returns a claim function", () => {
    const { result } = renderHook(
      () =>
        useClaim({
          distributionId: 1n,
          proof: ["0xproof1"],
        }),
      { wrapper: TestWrapper },
    );
    expect(typeof result.current.claim).toBe("function");
  });

  it("returns isClaimed as false when not yet claimed", () => {
    const { result } = renderHook(
      () =>
        useClaim({
          distributionId: 1n,
          proof: ["0xproof1"],
        }),
      { wrapper: TestWrapper },
    );
    expect(result.current.isClaimed).toBe(false);
  });

  it("returns isClaimed as true when already claimed", () => {
    mockUseReadContract.mockReturnValue({
      data: true,
      isLoading: false,
    });
    const { result } = renderHook(
      () =>
        useClaim({
          distributionId: 1n,
          proof: ["0xproof1"],
        }),
      { wrapper: TestWrapper },
    );
    expect(result.current.isClaimed).toBe(true);
  });

  it("calls writeContractAsync with claim params", async () => {
    const { result } = renderHook(
      () =>
        useClaim({
          distributionId: 1n,
          proof: ["0xproof1", "0xproof2"],
        }),
      { wrapper: TestWrapper },
    );

    await act(async () => {
      await result.current.claim();
    });

    expect(mockWriteContractAsync).toHaveBeenCalledTimes(1);
    const args = mockWriteContractAsync.mock.calls[0][0];
    expect(args.functionName).toBe("claim");
    expect(args.args[0]).toBe(1n); // distributionId
    expect(args.args[1]).toEqual(["0xproof1", "0xproof2"]); // proof
  });

  it("returns isPending from useWriteContract", () => {
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: true,
    });
    const { result } = renderHook(
      () =>
        useClaim({
          distributionId: 1n,
          proof: [],
        }),
      { wrapper: TestWrapper },
    );
    expect(result.current.isPending).toBe(true);
  });

  it("returns null claim function when no distributionId", () => {
    const { result } = renderHook(
      () => useClaim({ distributionId: null, proof: [] }),
      { wrapper: TestWrapper },
    );
    expect(result.current.claim).toBeNull();
  });
});
