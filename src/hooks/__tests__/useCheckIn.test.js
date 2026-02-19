import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

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

// Mock viem
const mockWaitForTransactionReceipt = vi.fn(() => Promise.resolve({ blockNumber: 100n, logs: [] }));
const mockReadContract = vi.fn(() => Promise.resolve(5n));
const mockGetLogs = vi.fn(() => Promise.resolve([]));
vi.mock("viem", () => ({
  encodeAbiParameters: vi.fn(() => "0xmockencoded"),
  parseAbiParameters: vi.fn(() => []),
  parseAbiItem: vi.fn(() => ({})),
  parseEventLogs: vi.fn(() => []),
  createPublicClient: () => ({
    waitForTransactionReceipt: (...args) => mockWaitForTransactionReceipt(...args),
    readContract: (...args) => mockReadContract(...args),
    getLogs: (...args) => mockGetLogs(...args),
  }),
  http: () => ({}),
}));

// Mock contracts — provide non-empty schema UID so checkIn doesn't bail early
vi.mock("@/config/contracts.js", () => ({
  DOJO_SCHEMA_UID: "0xmockschemauid",
  DOJO_RESOLVER_ADDRESS: "0xmockresolver",
}));

// Mock @tanstack/react-query — use importOriginal so the engine barrel
// can still access QueryClient/QueryClientProvider for its TestWrapper export
const mockInvalidateQueries = vi.fn();
const mockSetQueryData = vi.fn();
vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
      setQueryData: mockSetQueryData,
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

  it("returns isPending from useWriteContract", () => {
    mockUseWriteContract.mockReturnValueOnce({
      writeContractAsync: mockWriteContractAsync,
      isPending: true,
      isError: false,
      error: null,
    });
    const { result } = renderHook(() => useCheckIn());
    expect(result.current.isPending).toBe(true);
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

  it("returns isError state", () => {
    mockUseWriteContract.mockReturnValueOnce({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
      isError: true,
      error: new Error("rpc failure"),
    });
    const { result } = renderHook(() => useCheckIn());
    expect(result.current.isError).toBe(true);
  });
});
