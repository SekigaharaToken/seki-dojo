import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

const { TierBadge } = await import("@/components/dojo/TierBadge.jsx");

function renderBadge(props) {
  return render(
    <TestWrapper>
      <TierBadge {...props} />
    </TestWrapper>,
  );
}

describe("TierBadge", () => {
  it("renders the tier name from i18n key", () => {
    renderBadge({ tier: { id: 1, nameKey: "tier.whiteBelt", color: "tier-white" } });
    expect(screen.getByText(/white belt/i)).toBeInTheDocument();
  });

  it("renders nothing when tier is null", () => {
    const { container } = renderBadge({ tier: null });
    expect(container.textContent).toBe("");
  });

  it("renders black belt tier", () => {
    renderBadge({ tier: { id: 4, nameKey: "tier.blackBelt", color: "tier-black" } });
    expect(screen.getByText(/black belt/i)).toBeInTheDocument();
  });
});
