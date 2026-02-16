import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TestWrapper } from "@/test/wrapper.jsx";
import { LoginModal } from "../LoginModal.jsx";

// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
  useDisconnect: () => ({ disconnect: vi.fn() }),
}));

// Mock useFarcaster
vi.mock("@/hooks/useFarcaster.js", () => ({
  useFarcaster: () => ({ isAuthenticated: false, profile: null }),
}));

// Mock RainbowKit
vi.mock("@rainbow-me/rainbowkit", () => ({
  useConnectModal: () => ({ openConnectModal: vi.fn() }),
}));

// Mock useFarcasterSignIn
vi.mock("@/hooks/useFarcasterSignIn.js", () => ({
  useFarcasterSignIn: () => ({
    handleSignInClick: vi.fn(),
    handleCancel: vi.fn(),
    isConnecting: false,
    isPolling: false,
    showQrView: false,
    url: null,
    isLoading: false,
  }),
}));

describe("LoginModal", () => {
  it("does not render when modal is closed", () => {
    render(
      <TestWrapper>
        <LoginModal />
      </TestWrapper>,
    );
    expect(
      screen.queryByText("Sign In With Farcaster"),
    ).not.toBeInTheDocument();
  });
});
