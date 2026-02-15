import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "../../src/config/chains.js";
import { MINT_CLUB } from "../../src/config/contracts.js";
import { merkleDistributorAbi } from "../../src/config/abis/merkleDistributor.js";
import { SECONDS_PER_DAY } from "../../src/config/constants.js";

const account = privateKeyToAccount(process.env.OPERATOR_PRIVATE_KEY || "0x0");

const publicClient = createPublicClient({
  chain: base,
  transport: http(),
});

const walletClient = createWalletClient({
  chain: base,
  transport: http(),
  account,
});

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
];

/**
 * Approve ERC20 token spending.
 */
export async function approveToken({ tokenAddress, spender, amount }) {
  const hash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [spender, amount],
  });
  return hash;
}

/**
 * Create a single Merkle distribution on the MerkleDistributor contract.
 *
 * @param {{ tokenAddress: string, amountPerClaim: bigint, walletCount: number, merkleRoot: string, title: string, ipfsCID: string }} params
 * @returns {Promise<string>} Transaction hash
 */
export async function createDistribution({
  tokenAddress,
  amountPerClaim,
  walletCount,
  merkleRoot,
  title,
  ipfsCID,
}) {
  const now = Math.floor(Date.now() / 1000);
  const startTime = now;
  const endTime = now + 7 * SECONDS_PER_DAY;

  const hash = await walletClient.writeContract({
    address: MINT_CLUB.MERKLE,
    abi: merkleDistributorAbi,
    functionName: "createDistribution",
    args: [
      tokenAddress,
      true, // isERC20
      amountPerClaim,
      walletCount,
      startTime,
      endTime,
      merkleRoot,
      title,
      ipfsCID,
    ],
  });

  return hash;
}
