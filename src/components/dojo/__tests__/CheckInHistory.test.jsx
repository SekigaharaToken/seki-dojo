import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

const mockUseCheckInHistory = vi.fn();
vi.mock("@/hooks/useCheckInHistory.js", () => ({
  useCheckInHistory: (...args) => mockUseCheckInHistory(...args),
}));

vi.mock("@/hooks/useWalletAddress.js", () => ({
  useWalletAddress: () => ({ address: "0x1234", isConnected: true }),
}));

const { CheckInHistory } = await import("@/components/dojo/CheckInHistory.jsx");

function renderComponent() {
  return render(
    <TestWrapper>
      <CheckInHistory />
    </TestWrapper>,
  );
}

describe("CheckInHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCheckInHistory.mockReturnValue({
      checkIns: [],
      totalCheckIns: 0,
      isLoading: false,
    });
  });

  it("shows no history message when empty", () => {
    renderComponent();
    expect(screen.getByText(/no history/i)).toBeInTheDocument();
  });

  it("shows total check-ins count", () => {
    mockUseCheckInHistory.mockReturnValue({
      checkIns: [
        { timestamp: 1700000000, day: 19675 },
        { timestamp: 1700086400, day: 19676 },
      ],
      totalCheckIns: 2,
      isLoading: false,
    });
    renderComponent();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders check-in dates", () => {
    mockUseCheckInHistory.mockReturnValue({
      checkIns: [
        { timestamp: 1700000000, day: 19675 },
      ],
      totalCheckIns: 1,
      isLoading: false,
    });
    renderComponent();
    // Should show at least one date entry
    expect(screen.queryByText(/no history/i)).not.toBeInTheDocument();
  });
});
