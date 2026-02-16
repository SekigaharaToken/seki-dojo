import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

// Mock RainbowKit
vi.mock("@rainbow-me/rainbowkit", () => ({
  useConnectModal: () => ({ openConnectModal: vi.fn() }),
}));

// Mock all hooks used by child components
vi.mock("@/hooks/useWalletAddress.js", () => ({
  useWalletAddress: () => ({ address: undefined, isConnected: false }),
}));

vi.mock("@/hooks/useFarcaster.js", () => ({
  useFarcaster: () => ({ isAuthenticated: false }),
}));

vi.mock("@/hooks/useStreak.js", () => ({
  useStreak: () => ({
    currentStreak: 0,
    longestStreak: 0,
    hasCheckedInToday: false,
    currentTier: null,
    timeUntilNextCheckIn: 0,
    isLoading: false,
    isStreakAtRisk: false,
  }),
}));

vi.mock("@/hooks/useCheckIn.js", () => ({
  useCheckIn: () => ({
    checkIn: vi.fn(),
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useCheckInHistory.js", () => ({
  useCheckInHistory: () => ({
    checkIns: [],
    totalCheckIns: 0,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useClaim.js", () => ({
  useClaim: () => ({
    claim: null,
    isClaimed: false,
    isClaimedLoading: false,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useDailyBonus.js", () => ({
  useDailyBonus: () => ({
    canClaim: false,
    canClaimLoading: false,
    estimatedBonus: 0n,
    formattedBonus: "0",
    dojoBalance: 0n,
    bonusRate: 10,
    bonusRatePercent: 0.1,
    claim: vi.fn(),
    isPending: false,
    isConfigured: false,
  }),
}));

// Dynamic import after mocks
const HomePage = (await import("@/pages/HomePage.jsx")).default;

function renderPage() {
  return render(
    <TestWrapper>
      <HomePage />
    </TestWrapper>,
  );
}

describe("HomePage", () => {
  it("renders the streak display card", () => {
    renderPage();
    expect(screen.getByText(/your streak/i)).toBeInTheDocument();
  });

  it("renders the check-in button", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
  });

  it("renders the check-in history section", () => {
    renderPage();
    expect(screen.getByText(/check-in history/i)).toBeInTheDocument();
  });

  it("shows app tagline", () => {
    renderPage();
    expect(screen.getByText(/daily practice/i)).toBeInTheDocument();
  });
});
