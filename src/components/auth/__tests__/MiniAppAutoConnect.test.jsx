import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// Mock wagmi hooks
const mockConnect = vi.fn();
const mockFarcasterConnector = { id: "farcaster", name: "Farcaster" };
let mockConnectors = [mockFarcasterConnector];
let mockUseAccountReturn = { isConnected: false };

vi.mock("wagmi", () => ({
  useConnect: () => ({ connect: mockConnect, connectors: mockConnectors }),
  useAccount: () => mockUseAccountReturn,
}));

// Mock Farcaster SDK
const mockContextPromise = vi.fn();
const mockReady = vi.fn();
vi.mock("@farcaster/miniapp-sdk", () => ({
  default: {
    get context() {
      return mockContextPromise();
    },
    actions: { ready: mockReady },
  },
}));

const { MiniAppAutoConnect } = await import(
  "@/components/auth/MiniAppAutoConnect.jsx"
);

describe("MiniAppAutoConnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAccountReturn = { isConnected: false };
    mockConnectors = [mockFarcasterConnector];
  });

  it("calls ready() immediately on mount", async () => {
    mockContextPromise.mockReturnValue(
      Promise.resolve({ user: { fid: 123 } }),
    );
    render(<MiniAppAutoConnect />);
    expect(mockReady).toHaveBeenCalledTimes(1);
  });

  it("calls connect with farcaster connector when sdk.context resolves", async () => {
    mockContextPromise.mockReturnValue(
      Promise.resolve({ user: { fid: 123 } }),
    );
    render(<MiniAppAutoConnect />);
    await vi.waitFor(() => {
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
    expect(mockConnect).toHaveBeenCalledWith({
      connector: mockFarcasterConnector,
    });
  });

  it("does NOT call connect when already connected", async () => {
    mockUseAccountReturn = { isConnected: true };
    mockContextPromise.mockReturnValue(
      Promise.resolve({ user: { fid: 123 } }),
    );
    render(<MiniAppAutoConnect />);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("does NOT call connect when sdk.context rejects", async () => {
    mockContextPromise.mockReturnValue(
      Promise.reject(new Error("not in frame")),
    );
    render(<MiniAppAutoConnect />);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("does NOT call connect when sdk.context resolves with null", async () => {
    mockContextPromise.mockReturnValue(Promise.resolve(null));
    render(<MiniAppAutoConnect />);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it("does NOT call connect when no farcaster connector in list", async () => {
    mockConnectors = [{ id: "metamask", name: "MetaMask" }];
    mockContextPromise.mockReturnValue(
      Promise.resolve({ user: { fid: 123 } }),
    );
    render(<MiniAppAutoConnect />);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockConnect).not.toHaveBeenCalled();
  });
});
