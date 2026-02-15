import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" }),
}));

vi.mock("@/hooks/useTokenPrice.js", () => ({
  useTokenPrice: () => ({
    buyPrice: 50000000000000000n,
    sellPrice: 45000000000000000n,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("mint.club-v2-sdk", () => ({
  mintclub: {
    network: () => ({
      token: () => ({
        buy: vi.fn(),
        sell: vi.fn(),
        getBuyEstimation: vi.fn(),
        getSellEstimation: vi.fn(),
      }),
    }),
  },
  wei: (num) => BigInt(num) * 10n ** 18n,
}));

const SwapPage = (await import("@/pages/SwapPage.jsx")).default;

describe("SwapPage", () => {
  it("renders the page title", () => {
    render(<SwapPage />, { wrapper: TestWrapper });
    expect(screen.getByRole("heading", { level: 1, name: "Swap" })).toBeInTheDocument();
  });

  it("renders the price display", () => {
    render(<SwapPage />, { wrapper: TestWrapper });
    expect(screen.getByText("Current Price")).toBeInTheDocument();
  });

  it("renders the swap panel", () => {
    render(<SwapPage />, { wrapper: TestWrapper });
    expect(screen.getByRole("tab", { name: /buy/i })).toBeInTheDocument();
  });
});
