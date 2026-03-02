/**
 * Merkle Distributor ABI — duplicated from engine to avoid barrel import
 * issues in scripts that mock viem. Keep in sync with engine's copy.
 */
export const merkleDistributorAbi = [
  {
    name: "Created",
    type: "event",
    inputs: [
      { name: "distributionId", type: "uint256", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "isERC20", type: "bool", indexed: false },
      { name: "startTime", type: "uint40", indexed: false },
    ],
  },
  {
    name: "createDistribution",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "isERC20", type: "bool" },
      { name: "amountPerClaim", type: "uint176" },
      { name: "walletCount", type: "uint40" },
      { name: "startTime", type: "uint40" },
      { name: "endTime", type: "uint40" },
      { name: "merkleRoot", type: "bytes32" },
      { name: "title", type: "string" },
      { name: "ipfsCID", type: "string" },
    ],
    outputs: [{ name: "distributionId", type: "uint256" }],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "distributionId", type: "uint256" },
      { name: "merkleProof", type: "bytes32[]" },
    ],
    outputs: [],
  },
  {
    name: "isClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "distributionId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];
