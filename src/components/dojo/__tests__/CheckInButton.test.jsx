import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

// Mock useStreak
const mockUseStreak = vi.fn(() => ({
  hasCheckedInToday: false,
  currentStreak: 0,
  isLoading: false,
}));
vi.mock("@/hooks/useStreak.js", () => ({
  useStreak: (...args) => mockUseStreak(...args),
}));

// Mock useCheckIn
const mockCheckIn = vi.fn();
const mockUseCheckIn = vi.fn(() => ({
  checkIn: mockCheckIn,
  isPending: false,
  isError: false,
}));
vi.mock("@/hooks/useCheckIn.js", () => ({
  useCheckIn: (...args) => mockUseCheckIn(...args),
}));

// Mock wagmi useAccount
const mockUseAccount = vi.fn(() => ({ address: undefined }));
vi.mock("wagmi", () => ({
  useAccount: (...args) => mockUseAccount(...args),
}));

// Mock useLoginModal
const mockOpenLoginModal = vi.fn();
vi.mock("@/hooks/useLoginModal.js", () => ({
  useLoginModal: () => ({ openLoginModal: mockOpenLoginModal }),
}));

const { CheckInButton } = await import("@/components/dojo/CheckInButton.jsx");

function renderButton() {
  return render(
    <TestWrapper>
      <CheckInButton />
    </TestWrapper>,
  );
}

describe("CheckInButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStreak.mockReturnValue({
      hasCheckedInToday: false,
      currentStreak: 0,
      isLoading: false,
    });
    mockUseCheckIn.mockReturnValue({
      checkIn: mockCheckIn,
      isPending: false,
      isError: false,
    });
    mockUseAccount.mockReturnValue({ address: undefined });
  });

  // ── Wallet not connected ──────────────────────────────────────────────

  it("shows Connect Wallet text when wallet is not connected", () => {
    renderButton();
    expect(screen.getByRole("button")).toHaveTextContent(/connect wallet/i);
  });

  it("opens login modal when clicked with no wallet", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    expect(mockOpenLoginModal).toHaveBeenCalledTimes(1);
    expect(mockCheckIn).not.toHaveBeenCalled();
  });

  // ── Ready state ───────────────────────────────────────────────────────

  it("shows Check In text when wallet is connected and not checked in today", () => {
    mockUseAccount.mockReturnValue({ address: "0x1234" });
    renderButton();
    expect(screen.getByRole("button")).toHaveTextContent(/check in/i);
  });

  it("calls checkIn when clicked in ready state", () => {
    mockUseAccount.mockReturnValue({ address: "0x1234" });
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    expect(mockCheckIn).toHaveBeenCalledTimes(1);
  });

  // ── Pending state ─────────────────────────────────────────────────────

  it("shows pending text and is disabled while tx is pending", () => {
    mockUseAccount.mockReturnValue({ address: "0x1234" });
    mockUseCheckIn.mockReturnValue({
      checkIn: mockCheckIn,
      isPending: true,
      isError: false,
    });
    renderButton();
    const button = screen.getByRole("button");
    expect(button).toHaveTextContent(/checking in/i);
    expect(button).toBeDisabled();
  });

  // ── Done state ────────────────────────────────────────────────────────

  it("shows Checked In text and is disabled when already checked in", () => {
    mockUseAccount.mockReturnValue({ address: "0x1234" });
    mockUseStreak.mockReturnValue({
      hasCheckedInToday: true,
      currentStreak: 5,
      isLoading: false,
    });
    renderButton();
    const button = screen.getByRole("button");
    expect(button).toHaveTextContent(/checked in/i);
    expect(button).toBeDisabled();
  });

  // ── Loading state ─────────────────────────────────────────────────────

  it("is disabled when streak data is loading", () => {
    mockUseAccount.mockReturnValue({ address: "0x1234" });
    mockUseStreak.mockReturnValue({
      hasCheckedInToday: false,
      currentStreak: 0,
      isLoading: true,
    });
    renderButton();
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
