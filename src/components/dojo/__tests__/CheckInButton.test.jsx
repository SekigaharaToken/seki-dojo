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
const mockCheckIn = vi.fn(() => Promise.resolve());
const mockUseCheckIn = vi.fn(() => ({
  checkIn: mockCheckIn,
  isPending: false,
  isError: false,
}));
vi.mock("@/hooks/useCheckIn.js", () => ({
  useCheckIn: (...args) => mockUseCheckIn(...args),
}));

// Mock useWalletAddress
const mockUseWalletAddress = vi.fn(() => ({ address: undefined, isConnected: false }));

// Mock useFarcaster
const mockUseFarcaster = vi.fn(() => ({ isAuthenticated: false }));

// Mock useLoginModal
const mockOpenLoginModal = vi.fn();

vi.mock("@sekigahara/engine", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useWalletAddress: (...args) => mockUseWalletAddress(...args),
    useFarcaster: (...args) => mockUseFarcaster(...args),
    useLoginModal: () => ({ openLoginModal: mockOpenLoginModal }),
  };
});

// Mock RainbowKit connect modal
const mockOpenConnectModal = vi.fn();
vi.mock("@rainbow-me/rainbowkit", () => ({
  useConnectModal: () => ({ openConnectModal: mockOpenConnectModal }),
}));

// Mock sonner
const mockToastInfo = vi.fn();
vi.mock("sonner", () => ({
  toast: { info: (...args) => mockToastInfo(...args) },
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
    mockUseWalletAddress.mockReturnValue({ address: undefined, isConnected: false, canTransact: false });
    mockUseFarcaster.mockReturnValue({ isAuthenticated: false });
  });

  // ── Wallet not connected ──────────────────────────────────────────────

  it("shows Connect Wallet text when wallet is not connected", () => {
    renderButton();
    expect(screen.getByRole("button")).toHaveTextContent(/connect wallet/i);
  });

  it("opens login modal and shows toast when clicked with no wallet", () => {
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    expect(mockOpenLoginModal).toHaveBeenCalledTimes(1);
    expect(mockToastInfo).toHaveBeenCalledTimes(1);
    expect(mockCheckIn).not.toHaveBeenCalled();
  });

  // ── Farcaster-only (can't transact) ─────────────────────────────────

  it("shows Check In when farcaster-only (has address but cannot transact yet)", () => {
    mockUseWalletAddress.mockReturnValue({ address: "0xFarcaster", isConnected: true, canTransact: false });
    mockUseFarcaster.mockReturnValue({ isAuthenticated: true });
    renderButton();
    expect(screen.getByRole("button")).toHaveTextContent(/check in/i);
  });

  it("opens RainbowKit connect modal when farcaster-authenticated user clicks", () => {
    mockUseWalletAddress.mockReturnValue({ address: "0xFarcaster", isConnected: true, canTransact: false });
    mockUseFarcaster.mockReturnValue({ isAuthenticated: true });
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    expect(mockOpenConnectModal).toHaveBeenCalledTimes(1);
    expect(mockOpenLoginModal).not.toHaveBeenCalled();
    expect(mockToastInfo).toHaveBeenCalledTimes(1);
    expect(mockCheckIn).not.toHaveBeenCalled();
  });

  // ── Ready state ───────────────────────────────────────────────────────

  it("shows Check In text when wallet is connected and not checked in today", () => {
    mockUseWalletAddress.mockReturnValue({ address: "0x1234", isConnected: true, canTransact: true });
    renderButton();
    expect(screen.getByRole("button")).toHaveTextContent(/check in/i);
  });

  it("calls checkIn when clicked in ready state", () => {
    mockUseWalletAddress.mockReturnValue({ address: "0x1234", isConnected: true, canTransact: true });
    renderButton();
    fireEvent.click(screen.getByRole("button"));
    expect(mockCheckIn).toHaveBeenCalledTimes(1);
  });

  // ── Pending state ─────────────────────────────────────────────────────

  it("shows pending text with spinner and is disabled while tx is pending", () => {
    mockUseWalletAddress.mockReturnValue({ address: "0x1234", isConnected: true, canTransact: true });
    mockUseCheckIn.mockReturnValue({
      checkIn: mockCheckIn,
      isPending: true,
      isError: false,
    });
    renderButton();
    const button = screen.getByRole("button");
    expect(button).toHaveTextContent(/checking in/i);
    expect(button).toBeDisabled();
    // Spinner icon should be present
    expect(button.querySelector("svg")).toBeTruthy();
  });

  // ── Done state ────────────────────────────────────────────────────────

  it("shows Checked In text and is disabled when already checked in", () => {
    mockUseWalletAddress.mockReturnValue({ address: "0x1234", isConnected: true, canTransact: true });
    mockUseStreak.mockReturnValue({
      hasCheckedInToday: true,
      currentStreak: 5,
      isLoading: false,
    });
    renderButton();
    const button = screen.getByRole("button", { name: /checked in/i });
    expect(button).toHaveTextContent(/checked in/i);
    expect(button).toBeDisabled();
  });

  // ── Loading state ─────────────────────────────────────────────────────

  it("is disabled when streak data is loading", () => {
    mockUseWalletAddress.mockReturnValue({ address: "0x1234", isConnected: true, canTransact: true });
    mockUseStreak.mockReturnValue({
      hasCheckedInToday: false,
      currentStreak: 0,
      isLoading: true,
    });
    renderButton();
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
