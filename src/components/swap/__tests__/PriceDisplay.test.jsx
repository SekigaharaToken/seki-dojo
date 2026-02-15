import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

const mockUseTokenPrice = vi.fn();

vi.mock("@/hooks/useTokenPrice.js", () => ({
  useTokenPrice: (...args) => mockUseTokenPrice(...args),
}));

const { PriceDisplay } = await import(
  "@/components/swap/PriceDisplay.jsx"
);

describe("PriceDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTokenPrice.mockReturnValue({
      buyPrice: 50000000000000000n, // 0.05
      sellPrice: 45000000000000000n, // 0.045
      isLoading: false,
      isError: false,
    });
  });

  it("renders the price title", () => {
    render(<PriceDisplay />, { wrapper: TestWrapper });
    expect(screen.getByText("Current Price")).toBeInTheDocument();
  });

  it("displays formatted buy price", () => {
    render(<PriceDisplay />, { wrapper: TestWrapper });
    expect(screen.getByText(/0\.05/)).toBeInTheDocument();
  });

  it("shows loading skeleton when loading", () => {
    mockUseTokenPrice.mockReturnValue({
      buyPrice: null,
      sellPrice: null,
      isLoading: true,
      isError: false,
    });
    render(<PriceDisplay />, { wrapper: TestWrapper });
    expect(screen.queryByText(/0\./)).not.toBeInTheDocument();
  });

  it("shows error state on error", () => {
    mockUseTokenPrice.mockReturnValue({
      buyPrice: null,
      sellPrice: null,
      isLoading: false,
      isError: true,
    });
    render(<PriceDisplay />, { wrapper: TestWrapper });
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
