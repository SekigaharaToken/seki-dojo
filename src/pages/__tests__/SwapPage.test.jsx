import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", isConnected: true }),
  useReadContract: () => ({ data: undefined }),
  useConnect: () => ({ connectors: [], connect: vi.fn() }),
  useSwitchChain: () => ({ switchChain: vi.fn() }),
  useChainId: () => 8453,
}));

vi.mock("@farcaster/auth-kit", () => ({
  useProfile: () => ({ isAuthenticated: false, profile: null }),
}));

vi.mock("@farcaster/miniapp-sdk", () => ({
  default: { actions: { ready: vi.fn(), openUrl: vi.fn() }, context: Promise.resolve(null) },
  sdk: { actions: { ready: vi.fn(), openUrl: vi.fn() }, context: Promise.resolve(null) },
}));

vi.mock("@/lib/mintclub.js", () => ({
  mintclub: {
    network: () => ({
      token: () => ({
        getBuyEstimation: vi.fn().mockResolvedValue([50000000000000000n, 1000000000000000n]),
      }),
    }),
  },
}));

vi.mock("mint.club-v2-sdk", () => ({
  mintclub: {
    withPublicClient: vi.fn(),
    network: () => ({
      token: () => ({
        buy: vi.fn(),
        sell: vi.fn(),
        getBuyEstimation: vi.fn().mockResolvedValue([50000000000000000n, 1000000000000000n]),
        getSellEstimation: vi.fn().mockResolvedValue([45000000000000000n, 500000000000000n]),
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

  it("renders the price display", async () => {
    render(<SwapPage />, { wrapper: TestWrapper });
    await waitFor(() => {
      expect(screen.getByText(/Current \$DOJO Price/)).toBeInTheDocument();
    });
  });

  it("renders the swap panel", () => {
    render(<SwapPage />, { wrapper: TestWrapper });
    expect(screen.getByRole("tab", { name: /buy/i })).toBeInTheDocument();
  });
});
