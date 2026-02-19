import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

const mockUseStreak = vi.fn();
vi.mock("@/hooks/useStreak.js", () => ({
  useStreak: (...args) => mockUseStreak(...args),
}));

vi.mock("@sekigahara/engine", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useWalletAddress: () => ({ address: "0x1234", isConnected: true }) };
});

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
    const { container } = renderTimer();
    // NumberFlow renders values inside <number-flow-react> custom elements,
    // so text is split across element boundaries. Check the paragraph with
    // the countdown text and h/m/s labels exist.
    const countdown = container.querySelector("[aria-live='polite']");
    expect(countdown).toBeInTheDocument();
    expect(countdown.textContent).toMatch(/h/);
    expect(countdown.textContent).toMatch(/m/);
    expect(countdown.textContent).toMatch(/s/);
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
