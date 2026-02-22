import { createPublicClient, createWalletClient, http } from "viem";
import { toAccount } from "viem/accounts";
import { CdpClient } from "@coinbase/cdp-sdk";
import { activeChain } from "../../src/config/chains.js";
import { MINT_CLUB } from "../../src/config/contracts.js";
import { merkleDistributorAbi } from "../../src/config/abis/merkleDistributor.js";
import { SECONDS_PER_DAY } from "../../src/config/constants.js";

const RPC_URL = process.env.RPC_URL;

const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(RPC_URL),
});

let _walletClient;

async function getWalletClient() {
  if (_walletClient) return _walletClient;
  const cdp = new CdpClient();
  const cdpAccount = await cdp.evm.getOrCreateAccount({ name: "dojo-operator" });
  _walletClient = createWalletClient({
    account: toAccount(cdpAccount),
    chain: activeChain,
    transport: http(RPC_URL),
  });
  return _walletClient;
}

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
  const walletClient = await getWalletClient();
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
  const walletClient = await getWalletClient();
  // Use chain timestamp (not wall-clock) so times are valid on forks with evm_increaseTime
  const block = await publicClient.getBlock();
  const now = Number(block.timestamp);
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
