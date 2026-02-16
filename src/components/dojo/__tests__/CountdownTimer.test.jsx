import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

const mockUseStreak = vi.fn();
vi.mock("@/hooks/useStreak.js", () => ({
  useStreak: (...args) => mockUseStreak(...args),
}));

vi.mock("@/hooks/useWalletAddress.js", () => ({
  useWalletAddress: () => ({ address: "0x1234", isConnected: true }),
}));

const { CountdownTimer } = await import("@/components/dojo/CountdownTimer.jsx");

function renderTimer() {
  return render(
    <TestWrapper>
      <CountdownTimer />
    </TestWrapper>,
  );
}

describe("CountdownTimer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows countdown when checked in today", () => {
    mockUseStreak.mockReturnValue({
      hasCheckedInToday: true,
      timeUntilNextCheckIn: 3600, // 1 hour
    });
    renderTimer();
    // Should show some time format
    expect(screen.getByText(/1h/i) || screen.getByText(/01:00:00/i) || screen.getByText(/next check-in/i)).toBeTruthy();
  });

  it("shows nothing or ready message when not checked in", () => {
    mockUseStreak.mockReturnValue({
      hasCheckedInToday: false,
      timeUntilNextCheckIn: 0,
    });
    renderTimer();
    // Should not show countdown — check-in is available
    expect(screen.queryByText(/h.*m/)).not.toBeInTheDocument();
  });
});
