import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TestWrapper } from "@/test/wrapper.jsx";

// Mock useClaim
const mockClaim = vi.fn();
const mockUseClaim = vi.fn(() => ({
  claim: mockClaim,
  isClaimed: false,
  isClaimedLoading: false,
  isPending: false,
}));

vi.mock("@/hooks/useClaim.js", () => ({
  useClaim: (...args) => mockUseClaim(...args),
}));

// Mock useAccount
const mockUseAccount = vi.fn(() => ({
  address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
}));

vi.mock("wagmi", () => ({
  useAccount: (...args) => mockUseAccount(...args),
}));

const { ClaimCard } = await import("@/components/dojo/ClaimCard.jsx");

const defaultProps = {
  distributionId: 1n,
  proof: ["0xproof1"],
  amount: "100",
  tierName: "Apprentice",
};

describe("ClaimCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClaim.mockResolvedValue("0xtxhash");
    mockUseClaim.mockReturnValue({
      claim: mockClaim,
      isClaimed: false,
      isClaimedLoading: false,
      isPending: false,
    });
    mockUseAccount.mockReturnValue({
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    });
  });

  it("renders the rewards title", () => {
    render(<ClaimCard {...defaultProps} />, { wrapper: TestWrapper });
    expect(screen.getByText("Weekly Rewards")).toBeInTheDocument();
  });

  it("shows claimable amount and claim button", () => {
    render(<ClaimCard {...defaultProps} />, { wrapper: TestWrapper });
    expect(screen.getByText(/100 \$DOJO/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /claim/i })).toBeInTheDocument();
  });

  it("calls claim when button is clicked", async () => {
    render(<ClaimCard {...defaultProps} />, { wrapper: TestWrapper });
    const btn = screen.getByRole("button", { name: /claim/i });
    fireEvent.click(btn);
    expect(mockClaim).toHaveBeenCalledTimes(1);
  });

  it("shows claimed state when already claimed", () => {
    mockUseClaim.mockReturnValue({
      claim: mockClaim,
      isClaimed: true,
      isClaimedLoading: false,
      isPending: false,
    });
    render(<ClaimCard {...defaultProps} />, { wrapper: TestWrapper });
    expect(screen.getByText("Claimed")).toBeInTheDocument();
  });

  it("shows pending state while claiming", () => {
    mockUseClaim.mockReturnValue({
      claim: mockClaim,
      isClaimed: false,
      isClaimedLoading: false,
      isPending: true,
    });
    render(<ClaimCard {...defaultProps} />, { wrapper: TestWrapper });
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows no-claim message when no distributionId", () => {
    mockUseClaim.mockReturnValue({
      claim: null,
      isClaimed: false,
      isClaimedLoading: false,
      isPending: false,
    });
    render(
      <ClaimCard
        distributionId={null}
        proof={[]}
        amount="0"
        tierName="Beginner"
      />,
      { wrapper: TestWrapper },
    );
    expect(screen.getByText(/no rewards/i)).toBeInTheDocument();
  });

  it("shows tier earned info", () => {
    render(<ClaimCard {...defaultProps} />, { wrapper: TestWrapper });
    expect(screen.getByText(/Apprentice/)).toBeInTheDocument();
  });
});
