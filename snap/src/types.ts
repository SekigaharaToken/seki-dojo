export interface TierEntry {
  app: string;
  week: number;
  tier: number;
  distributionId: number;
  reward: number;
  ipfsCID: string;
}

export interface WeekDistribution {
  week: number;
  tiers: TierEntry[];
}

export interface EligibilityResult {
  eligible: boolean;
  alreadyClaimed: boolean;
  address: string;
  distributionId: number;
  reward: number;
  week: number;
  tierId: number;
  proof: string[];
}
