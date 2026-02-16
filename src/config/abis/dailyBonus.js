export const dailyBonusAbi = [
  {
    name: "canClaimToday",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "calculateBonus",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getBonusRate",
    type: "function",
    stateMutability: "pure",
    inputs: [{ name: "streak", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "claimDailyBonus",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
];
