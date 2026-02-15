import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TestWrapper } from "@/test/wrapper.jsx";
import { Header } from "../Header.jsx";

// Mock wagmi hooks
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
  useDisconnect: () => ({ disconnect: vi.fn() }),
}));

// Mock next-themes (useTheme)
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
  }),
  ThemeProvider: ({ children }) => children,
}));

// Mock useFarcaster
vi.mock("@/hooks/useFarcaster.js", () => ({
  useFarcaster: () => ({ isAuthenticated: false, profile: null }),
}));

describe("Header", () => {
  it("renders the app name", () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );
    expect(screen.getByText("DOJO")).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Swap")).toBeInTheDocument();
  });

  it("shows Connect Wallet button when not connected", () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );
    expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
  });

  it("renders theme toggle button", () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );
    expect(screen.getByLabelText("Toggle theme")).toBeInTheDocument();
  });

  it("renders language switcher button", () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );
    expect(screen.getByLabelText("Change language")).toBeInTheDocument();
  });
});
