import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@farcaster/miniapp-sdk", () => ({
  default: {
    context: Promise.resolve(null),
    actions: { composeCast: vi.fn(() => Promise.resolve({ cast: { hash: "0xabc" } })) },
  },
}));

vi.mock("@sekigahara/engine", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useMiniAppContext: vi.fn(() => ({ isInMiniApp: false })) };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, params) => {
      if (key === "share.castText") return `🥋 Day ${params.streak} streak on DOJO! ${params.tier}\n\nDaily training, onchain.`;
      if (key === "tier.whiteBelt") return "White Belt";
      return key;
    },
  }),
  initReactI18next: { type: "3rdParty", init: () => {} },
}));

import { renderHook, act } from "@testing-library/react";
import { useShareStreak } from "../useShareStreak.js";
import { useMiniAppContext } from "@sekigahara/engine";
import sdk from "@farcaster/miniapp-sdk";

describe("useShareStreak", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.open = vi.fn();
  });

  it("opens Warpcast intent URL in standalone mode", async () => {
    useMiniAppContext.mockReturnValue({ isInMiniApp: false });
    const { result } = renderHook(() =>
      useShareStreak({ currentStreak: 7, currentTier: { nameKey: "tier.whiteBelt" } }),
    );
    await act(() => result.current.shareStreak());
    expect(window.open).toHaveBeenCalledTimes(1);
    const url = window.open.mock.calls[0][0];
    expect(url).toContain("https://warpcast.com/~/compose");
    expect(url).toMatch(/Day[+%20]+7[+%20]+streak/);
    expect(url).toContain("channelKey=hunt");
  });

  it("calls composeCast in MiniApp mode", async () => {
    useMiniAppContext.mockReturnValue({ isInMiniApp: true });
    const { result } = renderHook(() =>
      useShareStreak({ currentStreak: 14, currentTier: { nameKey: "tier.whiteBelt" } }),
    );
    await act(() => result.current.shareStreak());
    expect(sdk.actions.composeCast).toHaveBeenCalledTimes(1);
    const opts = sdk.actions.composeCast.mock.calls[0][0];
    expect(opts.text).toContain("Day 14 streak");
    expect(opts.embeds).toHaveLength(1);
    expect(opts.channelKey).toBe("hunt");
  });

  it("handles null tier gracefully", async () => {
    useMiniAppContext.mockReturnValue({ isInMiniApp: false });
    const { result } = renderHook(() =>
      useShareStreak({ currentStreak: 3, currentTier: null }),
    );
    await act(() => result.current.shareStreak());
    expect(window.open).toHaveBeenCalledTimes(1);
  });
});
