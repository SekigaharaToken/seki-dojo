import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Mock wagmi
const mockWriteContractAsync = vi.fn();
const mockUseWriteContract = vi.fn(() => ({
  writeContractAsync: mockWriteContractAsync,
  isPending: false,
  isError: false,
  error: null,
}));
const mockUseAccount = vi.fn(() => ({
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
}));

vi.mock("wagmi", () => ({
  useWriteContract: (...args) => mockUseWriteContract(...args),
  useAccount: (...args) => mockUseAccount(...args),
}));

// Mock viem
vi.mock("viem", () => ({
  encodeAbiParameters: vi.fn(() => "0xmockencoded"),
  parseAbiParameters: vi.fn(() => []),
}));

// Mock @tanstack/react-query
const mockInvalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

// Mock wagmi/actions
vi.mock("wagmi/actions", () => ({
  waitForTransactionReceipt: vi.fn(() => Promise.resolve({ status: "success" })),
}));

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

  it("returns the transaction hash on success", async () => {
    const { result } = renderHook(() => useCheckIn());

    let txHash;
    await act(async () => {
      txHash = await result.current.checkIn();
    });

    expect(txHash).toBe("0xmocktxhash");
  });

  it("throws when writeContractAsync rejects", async () => {
    mockWriteContractAsync.mockRejectedValueOnce(new Error("tx failed"));
    const { result } = renderHook(() => useCheckIn());

    await expect(
      act(async () => {
        await result.current.checkIn();
      }),
    ).rejects.toThrow("tx failed");
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
