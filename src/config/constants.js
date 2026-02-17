/**
 * App-wide constants.
 */

// Weekly reward tiers — minimum 7-day streak to qualify
// Tier 1: 100, Tier 2: 150, Tier 3: 180, Tier 4: 200
export const STREAK_TIERS = [
  {
    id: 1,
    min: 7,
    max: 13,
    reward: 100,
    nameKey: "tier.whiteBelt",
    color: "tier-white",
  },
  {
    id: 2,
    min: 14,
    max: 29,
    reward: 150,
    nameKey: "tier.blueBelt",
    color: "tier-blue",
  },
  {
    id: 3,
    min: 30,
    max: 59,
    reward: 180,
    nameKey: "tier.purpleBelt",
    color: "tier-purple",
  },
  {
    id: 4,
    min: 60,
    max: Infinity,
    reward: 200,
    nameKey: "tier.blackBelt",
    color: "tier-black",
  },
];

// Daily bonus constants (holdings-based)
export const DAILY_BONUS_BASE_RATE = 10; // 0.1% in basis points
export const DAILY_BONUS_MAX_RATE = 20; // 0.2% in basis points
export const DAILY_BONUS_RAMP_DAYS = 30; // days to reach max rate
export const BASIS_POINTS = 10_000;

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

// Block number from which to query EAS logs (DojoResolver deployment block).
// Avoids querying from block 0 which exceeds public RPC log range limits.
export const DEPLOY_BLOCK = 37_728_678n;

// Welcome bonus amount for onboarding (1 $DOJO)
export const WELCOME_BONUS_AMOUNT = 1;
