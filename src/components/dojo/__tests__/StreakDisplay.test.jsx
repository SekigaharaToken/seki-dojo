import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

const mockUseStreak = vi.fn();
vi.mock("@/hooks/useStreak.js", () => ({
  useStreak: (...args) => mockUseStreak(...args),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1234" }),
}));

const { StreakDisplay } = await import("@/components/dojo/StreakDisplay.jsx");

function renderComponent() {
  return render(
    <TestWrapper>
      <StreakDisplay />
    </TestWrapper>,
  );
}

describe("StreakDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStreak.mockReturnValue({
      currentStreak: 0,
      longestStreak: 0,
      hasCheckedInToday: false,
      currentTier: null,
      isLoading: false,
      isStreakAtRisk: false,
    });
  });

  it("renders current streak value", () => {
    mockUseStreak.mockReturnValue({
      currentStreak: 14,
      longestStreak: 20,
      hasCheckedInToday: true,
      currentTier: { id: 3, nameKey: "tier.journeyman", color: "tier-purple" },
      isLoading: false,
      isStreakAtRisk: false,
    });
    renderComponent();
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  it("renders longest streak value", () => {
    mockUseStreak.mockReturnValue({
      currentStreak: 5,
      longestStreak: 20,
      hasCheckedInToday: false,
      currentTier: { id: 1, nameKey: "tier.beginner", color: "tier-white" },
      isLoading: false,
      isStreakAtRisk: false,
    });
    renderComponent();
    expect(screen.getByText("20")).toBeInTheDocument();
  });

  it("shows streak at risk warning when applicable", () => {
    mockUseStreak.mockReturnValue({
      currentStreak: 5,
      longestStreak: 5,
      hasCheckedInToday: false,
      currentTier: { id: 1, nameKey: "tier.beginner", color: "tier-white" },
      isLoading: false,
      isStreakAtRisk: true,
    });
    renderComponent();
    // Uses i18n key streak.atRisk
    expect(screen.getByText(/check in today/i)).toBeInTheDocument();
  });

  it("renders skeleton when loading", () => {
    mockUseStreak.mockReturnValue({
      currentStreak: 0,
      longestStreak: 0,
      hasCheckedInToday: false,
      currentTier: null,
      isLoading: true,
      isStreakAtRisk: false,
    });
    renderComponent();
    // Skeleton elements should be present instead of streak values
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });
});
