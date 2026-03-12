import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

// Hoist all mock variables so they're available inside vi.mock factories
const {
  mockWaitForTransactionReceipt,
  mockToast,
  mockWriteContractAsync,
  mockUseWriteContract,
  mockUseReadContract,
  mockSetQueryData,
  mockRefetchQueries,
  mockFindAll,
  mockUseWalletAddress,
} = vi.hoisted(() => ({
  mockWaitForTransactionReceipt: vi.fn().mockResolvedValue({}),
  mockToast: { success: vi.fn(), error: vi.fn() },
  mockWriteContractAsync: vi.fn(),
  mockUseWriteContract: vi.fn(() => ({
    writeContractAsync: vi.fn(),
  })),
  mockUseReadContract: vi.fn(() => ({
    data: false,
    isLoading: false,
  })),
  mockSetQueryData: vi.fn(),
  mockRefetchQueries: vi.fn(),
  mockFindAll: vi.fn(() => []),
  mockUseWalletAddress: vi.fn(() => ({
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    isConnected: true,
  })),
}));

// Mock viem
vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createPublicClient: () => ({
      waitForTransactionReceipt: mockWaitForTransactionReceipt,
    }),
  };
});

// Mock sonner
vi.mock("sonner", () => ({ toast: mockToast }));

// Mock wagmi
vi.mock("wagmi", () => ({
  useWriteContract: (...args) => mockUseWriteContract(...args),
  useReadContract: (...args) => mockUseReadContract(...args),
}));

// Mock TanStack Query
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQueryClient: () => ({
      setQueryData: mockSetQueryData,
      refetchQueries: mockRefetchQueries,
      getQueryCache: () => ({ findAll: mockFindAll }),
    }),
  };
});

vi.mock("@sekigahara/engine", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useWalletAddress: (...args) => mockUseWalletAddress(...args) };
});

const { useClaim } = await import("@/hooks/useClaim.js");

describe("useClaim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteContractAsync.mockResolvedValue("0xclaimtxhash");
    mockWaitForTransactionReceipt.mockResolvedValue({});
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
    });
    mockUseReadContract.mockReturnValue({
      data: false,
      isLoading: false,
    });
    mockFindAll.mockReturnValue([]);
  });

  it("returns a claim function", () => {
    const { result } = renderHook(
      () => useClaim({ distributionId: 1n, proof: ["0xproof1"] }),
      { wrapper: TestWrapper },
    );
    expect(typeof result.current.claim).toBe("function");
  });

  it("returns isClaimed as false when not yet claimed", () => {
    const { result } = renderHook(
      () => useClaim({ distributionId: 1n, proof: ["0xproof1"] }),
      { wrapper: TestWrapper },
    );
    expect(result.current.isClaimed).toBe(false);
  });

  it("returns isClaimed as true when already claimed", () => {
    mockUseReadContract.mockReturnValue({ data: true, isLoading: false });
    const { result } = renderHook(
      () => useClaim({ distributionId: 1n, proof: ["0xproof1"] }),
      { wrapper: TestWrapper },
    );
    expect(result.current.isClaimed).toBe(true);
  });

  it("calls writeContractAsync with claim params", async () => {
    const { result } = renderHook(
      () => useClaim({ distributionId: 1n, proof: ["0xproof1", "0xproof2"] }),
      { wrapper: TestWrapper },
    );

    await act(async () => {
      await result.current.claim();
    });

    expect(mockWriteContractAsync).toHaveBeenCalledTimes(1);
    const args = mockWriteContractAsync.mock.calls[0][0];
    expect(args.functionName).toBe("claim");
    expect(args.args[0]).toBe(1n);
    expect(args.args[1]).toEqual(["0xproof1", "0xproof2"]);
  });

  it("waits for transaction receipt after submission", async () => {
    const { result } = renderHook(
      () => useClaim({ distributionId: 1n, proof: [] }),
      { wrapper: TestWrapper },
    );

    await act(async () => {
      await result.current.claim();
    });

    expect(mockWaitForTransactionReceipt).toHaveBeenCalledWith({ hash: "0xclaimtxhash" });
  });

  it("shows success toast after receipt", async () => {
    const { result } = renderHook(
      () => useClaim({ distributionId: 1n, proof: [] }),
      { wrapper: TestWrapper },
    );

    await act(async () => {
      await result.current.claim();
    });

    expect(mockToast.success).toHaveBeenCalledTimes(1);
  });

  it("shows error toast on failure", async () => {
    mockWriteContractAsync.mockRejectedValue(new Error("user rejected"));
    const { result } = renderHook(
      () => useClaim({ distributionId: 1n, proof: [] }),
      { wrapper: TestWrapper },
    );

    await act(async () => {
      await expect(result.current.claim()).rejects.toThrow("user rejected");
    });

    expect(mockToast.error).toHaveBeenCalledTimes(1);
  });

  it("sets isClaiming during the full tx lifecycle", async () => {
    let resolveReceipt;
    mockWaitForTransactionReceipt.mockImplementation(
      () => new Promise((r) => { resolveReceipt = r; }),
    );

    const { result } = renderHook(
      () => useClaim({ distributionId: 1n, proof: [] }),
      { wrapper: TestWrapper },
    );

    expect(result.current.isClaiming).toBe(false);

    let claimPromise;
    act(() => {
      claimPromise = result.current.claim();
    });

    // After writeContractAsync resolves but receipt is pending
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.isClaiming).toBe(true);

    // Resolve receipt
    await act(async () => {
      resolveReceipt({});
      await claimPromise;
    });
    expect(result.current.isClaiming).toBe(false);
  });

  it("invalidates query cache after successful claim", async () => {
    const { result } = renderHook(
      () => useClaim({ distributionId: 1n, proof: [] }),
      { wrapper: TestWrapper },
    );

    await act(async () => {
      await result.current.claim();
    });

    expect(mockRefetchQueries).toHaveBeenCalledWith({ queryKey: ["readContract"] });
  });

  it("returns null claim function when no distributionId", () => {
    const { result } = renderHook(
      () => useClaim({ distributionId: null, proof: [] }),
      { wrapper: TestWrapper },
    );
    expect(result.current.claim).toBeNull();
  });
});
