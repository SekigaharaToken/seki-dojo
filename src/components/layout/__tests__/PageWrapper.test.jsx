import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PageWrapper } from "../PageWrapper.jsx";

describe("PageWrapper", () => {
  it("renders children", () => {
    render(
      <PageWrapper>
        <p>Hello</p>
      </PageWrapper>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("applies max-w-3xl container class", () => {
    render(
      <PageWrapper>
        <p>Content</p>
      </PageWrapper>,
    );
    const main = screen.getByRole("main");
    expect(main).toHaveClass("max-w-3xl");
  });

  it("merges custom className", () => {
    render(
      <PageWrapper className="mt-10">
        <p>Content</p>
      </PageWrapper>,
    );
    const main = screen.getByRole("main");
    expect(main).toHaveClass("mt-10");
  });
});
