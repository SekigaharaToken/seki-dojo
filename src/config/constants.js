/**
 * App-wide constants.
 */

// Canonical tier rewards (from PRD section 5.2)
// Tier 1: 100, Tier 2: 150, Tier 3: 180, Tier 4: 200
export const STREAK_TIERS = [
  {
    id: 1,
    min: 1,
    max: 6,
    reward: 100,
    nameKey: "tier.beginner",
    color: "tier-white",
  },
  {
    id: 2,
    min: 7,
    max: 13,
    reward: 150,
    nameKey: "tier.apprentice",
    color: "tier-blue",
  },
  {
    id: 3,
    min: 14,
    max: 29,
    reward: 180,
    nameKey: "tier.journeyman",
    color: "tier-purple",
  },
  {
    id: 4,
    min: 30,
    max: Infinity,
    reward: 200,
    nameKey: "tier.master",
    color: "tier-black",
  },
];

/**
 * Get the tier for a given streak count.
 */
export const getTierForStreak = (streak) => {
  if (streak <= 0) return null;
  return STREAK_TIERS.find((t) => streak >= t.min && streak <= t.max) ?? null;
};

// Seconds per day (UTC day boundary)
export const SECONDS_PER_DAY = 86400;

// App identifier used in EAS attestation data
export const APP_IDENTIFIER = "dojo";
