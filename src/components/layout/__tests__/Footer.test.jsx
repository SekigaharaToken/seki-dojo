import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TestWrapper } from "@/test/wrapper.jsx";
import { Footer } from "../Footer.jsx";

describe("Footer", () => {
  it("renders i18n footer strings", () => {
    render(
      <TestWrapper>
        <Footer />
      </TestWrapper>,
    );
    expect(screen.getByText("Built on Base")).toBeInTheDocument();
    expect(screen.getByText("Powered by Sekigahara")).toBeInTheDocument();
  });
});
