import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TestWrapper } from "@/test/wrapper.jsx";

const mockBuy = vi.fn();
const mockSell = vi.fn();
const mockGetBuyEstimation = vi.fn();
const mockGetSellEstimation = vi.fn();

vi.mock("mint.club-v2-sdk", () => ({
  mintclub: {
    network: () => ({
      token: () => ({
        buy: mockBuy,
        sell: mockSell,
        getBuyEstimation: mockGetBuyEstimation,
        getSellEstimation: mockGetSellEstimation,
      }),
    }),
  },
  wei: (num) => BigInt(num) * 10n ** 18n,
}));

const mockUseAccount = vi.fn(() => ({
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
}));

vi.mock("wagmi", () => ({
  useAccount: (...args) => mockUseAccount(...args),
}));

const { SwapPanel } = await import("@/components/swap/SwapPanel.jsx");

describe("SwapPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuy.mockResolvedValue("0xbuytxhash");
    mockSell.mockResolvedValue("0xselltxhash");
    mockGetBuyEstimation.mockResolvedValue([50000000000000000n]);
    mockGetSellEstimation.mockResolvedValue([45000000000000000n]);
    mockUseAccount.mockReturnValue({
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    });
  });

  it("renders buy and sell tabs", () => {
    render(<SwapPanel />, { wrapper: TestWrapper });
    expect(screen.getByRole("tab", { name: /buy/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /sell/i })).toBeInTheDocument();
  });

  it("renders amount input", () => {
    render(<SwapPanel />, { wrapper: TestWrapper });
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();
  });

  it("has a submit button", () => {
    render(<SwapPanel />, { wrapper: TestWrapper });
    expect(
      screen.getByRole("button", { name: /buy \$dojo/i }),
    ).toBeInTheDocument();
  });

  it("switches to sell mode when sell tab clicked", async () => {
    const user = userEvent.setup();
    render(<SwapPanel />, { wrapper: TestWrapper });
    await user.click(screen.getByRole("tab", { name: /sell/i }));
    expect(
      screen.getByRole("button", { name: /sell \$dojo/i }),
    ).toBeInTheDocument();
  });

  it("disables submit when amount is empty", () => {
    render(<SwapPanel />, { wrapper: TestWrapper });
    const btn = screen.getByRole("button", { name: /buy \$dojo/i });
    expect(btn).toBeDisabled();
  });

  it("enables submit when amount is entered", () => {
    render(<SwapPanel />, { wrapper: TestWrapper });
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "10" } });
    const btn = screen.getByRole("button", { name: /buy \$dojo/i });
    expect(btn).not.toBeDisabled();
  });

  it("shows connect wallet message when not connected", () => {
    mockUseAccount.mockReturnValue({ address: undefined });
    render(<SwapPanel />, { wrapper: TestWrapper });
    expect(screen.getByText(/connect/i)).toBeInTheDocument();
  });
});
