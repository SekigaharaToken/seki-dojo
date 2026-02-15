import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

// Mock the Mint Club SDK
const mockGetBuyEstimation = vi.fn();
const mockGetSellEstimation = vi.fn();

vi.mock("mint.club-v2-sdk", () => ({
  mintclub: {
    network: () => ({
      token: () => ({
        getBuyEstimation: mockGetBuyEstimation,
        getSellEstimation: mockGetSellEstimation,
      }),
    }),
  },
}));

const { useTokenPrice } = await import("@/hooks/useTokenPrice.js");

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </I18nextProvider>
  );
}

describe("useTokenPrice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBuyEstimation.mockResolvedValue([50000000000000000n]);
    mockGetSellEstimation.mockResolvedValue([45000000000000000n]);
  });

  it("returns buy and sell price estimations", async () => {
    const { result } = renderHook(() => useTokenPrice(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.buyPrice).toBe(50000000000000000n);
    expect(result.current.sellPrice).toBe(45000000000000000n);
  });

  it("returns isLoading true initially", () => {
    mockGetBuyEstimation.mockReturnValue(new Promise(() => {}));
    mockGetSellEstimation.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTokenPrice(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("calls getBuyEstimation with 1 token (10^18 wei)", async () => {
    const { result } = renderHook(() => useTokenPrice(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetBuyEstimation).toHaveBeenCalledWith(1000000000000000000n);
  });

  it("calls getSellEstimation with 1 token (10^18 wei)", async () => {
    const { result } = renderHook(() => useTokenPrice(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetSellEstimation).toHaveBeenCalledWith(1000000000000000000n);
  });

  it("returns null prices on error", async () => {
    mockGetBuyEstimation.mockRejectedValue(new Error("rpc error"));
    mockGetSellEstimation.mockRejectedValue(new Error("rpc error"));

    const { result } = renderHook(() => useTokenPrice(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.buyPrice).toBeNull();
    expect(result.current.sellPrice).toBeNull();
    expect(result.current.isError).toBe(true);
  });
});
