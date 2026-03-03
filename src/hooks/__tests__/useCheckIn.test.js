import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock mint.club-v2-sdk (engine barrel imports SwapPanel → mintclub.js at load time)
vi.mock("mint.club-v2-sdk", () => ({
  mintclub: { withPublicClient: vi.fn() },
  wei: (n) => BigInt(n) * 10n ** 18n,
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key, params) => params ? `${key}:${JSON.stringify(params)}` : key }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

// Mock sonner
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args) => mockToastSuccess(...args),
    error: (...args) => mockToastError(...args),
  },
}));

// Mock wagmi
const mockWriteContractAsync = vi.fn();
const mockUseWriteContract = vi.fn(() => ({
  writeContractAsync: mockWriteContractAsync,
  isPending: false,
  isError: false,
  error: null,
}));
vi.mock("wagmi", () => ({
  useWriteContract: (...args) => mockUseWriteContract(...args),
}));

const mockUseWalletAddress = vi.fn(() => ({
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  isConnected: true,
}));
vi.mock("@sekigahara/engine", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useWalletAddress: (...args) => mockUseWalletAddress(...args),
    EAS_ADDRESS: "0x4200000000000000000000000000000000000021",
  };
});

// Mock viem — use importOriginal so engine barrel's viem imports still work
const mockWaitForTransactionReceipt = vi.fn(() => Promise.resolve({ blockNumber: 100n, logs: [] }));
const mockReadContract = vi.fn(() => Promise.resolve(5n));
const mockGetLogs = vi.fn(() => Promise.resolve([]));
vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createPublicClient: () => ({
      waitForTransactionReceipt: (...args) => mockWaitForTransactionReceipt(...args),
      readContract: (...args) => mockReadContract(...args),
      getLogs: (...args) => mockGetLogs(...args),
    }),
    http: () => ({}),
  };
});

// Mock contracts — provide non-empty schema UID so checkIn doesn't bail early
vi.mock("@/config/contracts.js", () => ({
  DOJO_SCHEMA_UID: "0xmockschemauid",
  DOJO_RESOLVER_ADDRESS: "0xmockresolver",
}));

// Mock @tanstack/react-query — use importOriginal so the engine barrel
// can still access QueryClient/QueryClientProvider for its TestWrapper export
const mockInvalidateQueries = vi.fn();
const mockRefetchQueries = vi.fn();
const mockSetQueryData = vi.fn();
// Simulate the query cache entries that wagmi's useReadContract creates.
// useCheckIn uses getQueryCache().findAll() to find these, then calls
// setQueryData with their real keys (same pattern as useResolverEvents).
const mockQueryCacheEntries = [
  {
    queryKey: ["readContract", { address: "0xmockresolver", functionName: "currentStreak", args: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"], chainId: 8453 }],
    state: { data: 4n },
  },
  {
    queryKey: ["readContract", { address: "0xmockresolver", functionName: "lastCheckIn", args: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"], chainId: 8453 }],
    state: { data: 0n },
  },
  {
    queryKey: ["readContract", { address: "0xmockresolver", functionName: "longestStreak", args: ["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"], chainId: 8453 }],
    state: { data: 4n },
  },
];
const mockFindAll = vi.fn(() => mockQueryCacheEntries);
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
      refetchQueries: mockRefetchQueries,
      setQueryData: mockSetQueryData,
      getQueryCache: () => ({ findAll: mockFindAll }),
    }),
  };
});


const { useCheckIn } = await import("@/hooks/useCheckIn.js");

describe("useCheckIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteContractAsync.mockResolvedValue("0xmocktxhash");
  });

  it("returns a checkIn function", () => {
    const { result } = renderHook(() => useCheckIn());
    expect(typeof result.current.checkIn).toBe("function");
  });

  it("returns isPending as false initially", () => {
    const { result } = renderHook(() => useCheckIn());
    expect(result.current.isPending).toBe(false);
  });

  it("calls writeContractAsync with EAS attest params when checkIn is called", async () => {
    const { result } = renderHook(() => useCheckIn());

    await act(async () => {
      await result.current.checkIn();
    });

    expect(mockWriteContractAsync).toHaveBeenCalledTimes(1);
    const callArgs = mockWriteContractAsync.mock.calls[0][0];
    expect(callArgs.functionName).toBe("attest");
  });

  it("passes the correct schema UID in the attestation request", async () => {
    const { result } = renderHook(() => useCheckIn());

    await act(async () => {
      await result.current.checkIn();
    });

    const callArgs = mockWriteContractAsync.mock.calls[0][0];
    // The args should contain the schema UID and attestation data tuple
    expect(callArgs.args).toBeDefined();
    expect(callArgs.args.length).toBe(1); // Single AttestationRequest tuple
  });

  it("sets the recipient to the connected wallet address", async () => {
    const { result } = renderHook(() => useCheckIn());

    await act(async () => {
      await result.current.checkIn();
    });

    const callArgs = mockWriteContractAsync.mock.calls[0][0];
    const request = callArgs.args[0];
    // request is { schema, data: { recipient, ... } }
    expect(request.data.recipient).toBe("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  });

  it("returns streak data and tx hash on success", async () => {
    mockReadContract.mockResolvedValueOnce(5n);
    const { result } = renderHook(() => useCheckIn());

    let res;
    await act(async () => {
      res = await result.current.checkIn();
    });

    expect(res.hash).toBe("0xmocktxhash");
    expect(res.currentStreak).toBe(5);
    expect(res.currentTier).toBeDefined();
  });

  it("writes streak data directly to query cache via findAll pattern", async () => {
    mockReadContract.mockResolvedValueOnce(5n);
    const { result } = renderHook(() => useCheckIn());

    await act(async () => {
      await result.current.checkIn();
    });

    // Must search the query cache for existing readContract entries
    expect(mockFindAll).toHaveBeenCalledWith({ queryKey: ["readContract"] });

    // Must call setQueryData with the ACTUAL query keys from the cache
    // (not constructed keys), ensuring hash match with wagmi's entries.

    // currentStreak — written with the real query key from cache
    expect(mockSetQueryData).toHaveBeenCalledWith(
      mockQueryCacheEntries[0].queryKey,
      5n,
    );

    // lastCheckIn — written with a recent timestamp
    const lastCheckInCall = mockSetQueryData.mock.calls.find(
      ([key]) => key === mockQueryCacheEntries[1].queryKey,
    );
    expect(lastCheckInCall).toBeDefined();
    expect(typeof lastCheckInCall[1]).toBe("bigint");
    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    expect(lastCheckInCall[1]).toBeGreaterThan(nowSec - 10n);
    expect(lastCheckInCall[1]).toBeLessThanOrEqual(nowSec + 1n);

    // longestStreak — written because streak (5) > old (4)
    expect(mockSetQueryData).toHaveBeenCalledWith(
      mockQueryCacheEntries[2].queryKey,
      5n,
    );
  });

  it("forces immediate refetch of streak queries after cache write", async () => {
    mockReadContract.mockResolvedValueOnce(5n);
    const { result } = renderHook(() => useCheckIn());

    await act(async () => {
      await result.current.checkIn();
    });

    expect(mockRefetchQueries).toHaveBeenCalledWith({
      queryKey: ["readContract"],
    });
  });

  it("throws and fires error toast when writeContractAsync rejects", async () => {
    mockWriteContractAsync.mockRejectedValueOnce(new Error("User rejected the request."));
    const { result } = renderHook(() => useCheckIn());

    await expect(
      act(async () => {
        await result.current.checkIn();
      }),
    ).rejects.toThrow("User rejected the request.");

    expect(mockToastError).toHaveBeenCalledTimes(1);
    expect(mockToastError).toHaveBeenCalledWith(
      "toast.checkinFailed",
      expect.objectContaining({ description: expect.any(String) }),
    );
  });

  it("sets isPending during check-in and resets on error", async () => {
    let rejectFn;
    mockWriteContractAsync.mockReturnValueOnce(new Promise((_, reject) => { rejectFn = reject; }));
    const { result } = renderHook(() => useCheckIn());

    let checkInPromise;
    act(() => {
      checkInPromise = result.current.checkIn();
    });

    // isPending should be true while check-in is in flight
    expect(result.current.isPending).toBe(true);

    // Reject to trigger error path
    await act(async () => {
      rejectFn(new Error("User rejected the request."));
      await checkInPromise.catch(() => {});
    });

    // isPending resets on error
    expect(result.current.isPending).toBe(false);
  });
});
