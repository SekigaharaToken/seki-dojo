import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

// Mock heavy engine layout components that need wagmi/wallet providers
vi.mock("@sekigahara/engine", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Header: () => <header data-testid="header">Header</header>,
    Footer: () => <footer data-testid="footer">Footer</footer>,
    NetworkGuardBanner: () => null,
    LoginModal: () => null,
    ErrorBoundary: ({ children }) => children,
    PageWrapper: ({ children }) => <main>{children}</main>,
  };
});

// Mock heavy child components
vi.mock("@/pages/HomePage.jsx", () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock("@/components/dojo/HowItWorks.jsx", () => ({
  default: () => null,
}));

const { default: App } = await import("@/App.jsx");

describe("App", () => {
  it("renders bottom navigation with Home and Swap links on mobile", () => {
    render(
      <TestWrapper>
        <App />
      </TestWrapper>,
    );
    // BottomNav renders a fixed nav at the bottom with route links
    const bottomNav = document.querySelector("nav.fixed");
    expect(bottomNav).toBeInTheDocument();
    // Should contain nav items with translated labels
    const links = bottomNav.querySelectorAll("a");
    expect(links.length).toBe(2);
    expect(links[0]).toHaveAttribute("href", "/");
    expect(links[1]).toHaveAttribute("href", "/swap");
  });
});
