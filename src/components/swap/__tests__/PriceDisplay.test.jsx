import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

const mockGetBuyEstimation = vi.fn();

vi.mock("@/lib/mintclub.js", () => ({
  mintclub: {
    network: () => ({
      token: () => ({
        getBuyEstimation: mockGetBuyEstimation,
      }),
    }),
  },
}));

const { PriceDisplay } = await import(
  "@/components/swap/PriceDisplay.jsx"
);

const defaultTokenConfig = {
  key: "dojo",
  label: "$DOJO",
  address: "0xC5aAEFD024Aa95C59712A931b3295e237fFD3f81",
  network: "base",
  reserveLabel: "ETH",
  priceKey: "swap.priceDojo",
  buyKey: "swap.buyDojo",
  sellKey: "swap.sellDojo",
};

describe("PriceDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBuyEstimation.mockResolvedValue([50000000000000000n, 1000000000000000n]);
  });

  it("renders the price title", async () => {
    render(<PriceDisplay tokenConfig={defaultTokenConfig} />, { wrapper: TestWrapper });
    expect(screen.getByText(/\$DOJO/i)).toBeInTheDocument();
  });

  it("displays formatted buy price", async () => {
    render(<PriceDisplay tokenConfig={defaultTokenConfig} />, { wrapper: TestWrapper });
    // Wait for the query to resolve
    expect(await screen.findByText(/0\.05/)).toBeInTheDocument();
  });

  it("shows error state on error", async () => {
    mockGetBuyEstimation.mockRejectedValue(new Error("network failure"));
    // Use a unique address to avoid query cache from previous tests
    const errorConfig = { ...defaultTokenConfig, address: "0xERROR_TEST" };
    render(<PriceDisplay tokenConfig={errorConfig} />, { wrapper: TestWrapper });
    expect(await screen.findByText(/error/i)).toBeInTheDocument();
  });
});
