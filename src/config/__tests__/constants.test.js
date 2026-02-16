import { describe, it, expect } from "vitest";
import { STREAK_TIERS, getTierForStreak } from "../constants.js";

describe("STREAK_TIERS", () => {
  it("has 4 tiers", () => {
    expect(STREAK_TIERS).toHaveLength(4);
  });

  it("has canonical reward values 100/150/180/200", () => {
    expect(STREAK_TIERS.map((t) => t.reward)).toEqual([100, 150, 180, 200]);
  });

  it("covers all streak ranges without gaps", () => {
    expect(STREAK_TIERS[0].min).toBe(7);
    expect(STREAK_TIERS[0].max).toBe(13);
    expect(STREAK_TIERS[1].min).toBe(14);
    expect(STREAK_TIERS[1].max).toBe(29);
    expect(STREAK_TIERS[2].min).toBe(30);
    expect(STREAK_TIERS[2].max).toBe(59);
    expect(STREAK_TIERS[3].min).toBe(60);
    expect(STREAK_TIERS[3].max).toBe(Infinity);
  });
});

describe("getTierForStreak", () => {
  it("returns null for 0 or negative", () => {
    expect(getTierForStreak(0)).toBeNull();
    expect(getTierForStreak(-1)).toBeNull();
  });

  it("returns null for streaks 1-6 (below minimum tier)", () => {
    expect(getTierForStreak(1)).toBeNull();
    expect(getTierForStreak(6)).toBeNull();
  });

  it("returns tier 1 (White Belt) for streaks 7-13", () => {
    expect(getTierForStreak(7).id).toBe(1);
    expect(getTierForStreak(13).id).toBe(1);
  });

  it("returns tier 2 (Blue Belt) for streaks 14-29", () => {
    expect(getTierForStreak(14).id).toBe(2);
    expect(getTierForStreak(29).id).toBe(2);
  });

  it("returns tier 3 (Purple Belt) for streaks 30-59", () => {
    expect(getTierForStreak(30).id).toBe(3);
    expect(getTierForStreak(59).id).toBe(3);
  });

  it("returns tier 4 (Black Belt) for streaks 60+", () => {
    expect(getTierForStreak(60).id).toBe(4);
    expect(getTierForStreak(999).id).toBe(4);
  });
});
