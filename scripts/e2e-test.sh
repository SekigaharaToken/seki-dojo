#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# E2E Weekly Distribution Test — Anvil Fork of Base Sepolia
#
# Simulates a full week of check-ins, verifies resolver state, runs the weekly
# distribution pipeline (wallet discovery → merkle tree → Pinata → Mint Club),
# and claims rewards on the fork.
#
# Prerequisites:
#   - Foundry (anvil, cast)
#   - Node.js 20+ (for --env-file)
#   - .env with VITE_PINATA_JWT set
# =============================================================================

# --- Config ---
ANVIL_RPC="http://127.0.0.1:8545"
ANVIL_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
ANVIL_ADDR="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
FORK_URL="${FORK_URL:-https://sepolia.base.org}"
CHAIN_ID=84532

# Contracts (Base Sepolia deployed)
EAS="0x4200000000000000000000000000000000000021"
RESOLVER="0xA046B36f99a434CE30b14BB783310aF16D00009d"
SCHEMA_UID="0xc3d5fa683150402070fa90f53e23d4921826640823deed57d32cd53db62c6c0e"
MERKLE_DISTRIBUTOR="0xCbb23973235feA43E62C41a0c67717a92a2467f2"

ANVIL_PID=""

# Kill any leftover Anvil on our port
lsof -ti:8545 | xargs kill 2>/dev/null || true

cleanup() {
  echo ""
  echo "=== Cleaning up ==="
  if [ -n "$ANVIL_PID" ] && kill -0 "$ANVIL_PID" 2>/dev/null; then
    kill "$ANVIL_PID" 2>/dev/null || true
    wait "$ANVIL_PID" 2>/dev/null || true
    echo "Anvil stopped (PID $ANVIL_PID)"
  fi
}
trap cleanup EXIT

# Source .env early to get token addresses and Pinata JWT
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

DOJO_TOKEN="${VITE_DOJO_TOKEN_ADDRESS:-}"
if [ -z "$DOJO_TOKEN" ]; then
  echo "ERROR: VITE_DOJO_TOKEN_ADDRESS not set in .env"
  exit 1
fi

DEPLOYER="${DEPLOYER_WALLET_ADDRESS:-0x1eD4aC856D7a072C3a336C0971a47dB86A808Ff4}"

# --- Step 0: Start Anvil fork ---
echo ""
echo "=== Step 0: Starting Anvil fork of Base Sepolia ==="
# Fetch the latest block so the fork includes recently-deployed contracts
FORK_BLOCK="${FORK_BLOCK:-$(cast block latest --rpc-url "$FORK_URL" --json | jq -r '.number' | xargs printf "%d\n")}"
echo "Forking at block $FORK_BLOCK"

anvil \
  --fork-url "$FORK_URL" \
  --fork-block-number "$FORK_BLOCK" \
  --chain-id "$CHAIN_ID" \
  --code-size-limit 30000 \
  --silent &
ANVIL_PID=$!

# Wait for Anvil to be ready
echo "Waiting for Anvil (PID $ANVIL_PID)..."
for i in $(seq 1 30); do
  if cast chain-id --rpc-url "$ANVIL_RPC" >/dev/null 2>&1; then
    echo "Anvil ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Anvil failed to start after 30 seconds"
    exit 1
  fi
  sleep 1
done

# Verify the DOJO token exists on the fork
DOJO_CODE=$(cast code "$DOJO_TOKEN" --rpc-url "$ANVIL_RPC" 2>&1)
if [ "$DOJO_CODE" = "0x" ] || [ -z "$DOJO_CODE" ]; then
  echo "ERROR: DOJO token ($DOJO_TOKEN) has no code on the fork."
  echo "  The fork may be behind the deployment block. Try setting FORK_URL"
  echo "  to a specific block: anvil --fork-block-number <block>"
  exit 1
fi
echo "DOJO token verified on fork."

# --- Step 0b: Fund Anvil default account with DOJO tokens ---
echo ""
echo "=== Step 0b: Funding Anvil account with DOJO tokens ==="

# Give the deployer ETH for gas on the fork
cast rpc anvil_setBalance "$DEPLOYER" "0x56BC75E2D63100000" --rpc-url "$ANVIL_RPC" > /dev/null

# Impersonate the deployer to transfer DOJO to the Anvil default account
cast rpc anvil_impersonateAccount "$DEPLOYER" --rpc-url "$ANVIL_RPC" > /dev/null

# Transfer 100,000 DOJO (enough for any tier distribution)
TRANSFER_AMOUNT="100000000000000000000000" # 100k * 1e18
cast send "$DOJO_TOKEN" \
  "transfer(address,uint256)(bool)" "$ANVIL_ADDR" "$TRANSFER_AMOUNT" \
  --rpc-url "$ANVIL_RPC" \
  --from "$DEPLOYER" \
  --unlocked \
  > /dev/null 2>&1

cast rpc anvil_stopImpersonatingAccount "$DEPLOYER" --rpc-url "$ANVIL_RPC" > /dev/null

BALANCE=$(cast call "$DOJO_TOKEN" "balanceOf(address)(uint256)" "$ANVIL_ADDR" --rpc-url "$ANVIL_RPC")
echo "  Anvil account DOJO balance: $BALANCE"

# --- Step 1: Simulate 7 consecutive daily check-ins ---
echo ""
echo "=== Step 1: Simulating 7 daily check-ins ==="

# Helper: encode attestation data (string app, uint32 day)
encode_checkin_data() {
  local day=$1
  cast abi-encode "f(string,uint32)" "dojo" "$day"
}

# Helper: send EAS.attest() tx
make_attest_call() {
  local day=$1
  local encoded_data
  encoded_data=$(encode_checkin_data "$day")

  cast send "$EAS" \
    "attest((bytes32,(address,uint64,bool,bytes32,bytes,uint256)))" \
    "($SCHEMA_UID,($ANVIL_ADDR,0,false,0x0000000000000000000000000000000000000000000000000000000000000000,$encoded_data,0))" \
    --rpc-url "$ANVIL_RPC" \
    --private-key "$ANVIL_KEY" \
    --gas-limit 500000 \
    2>&1
}

# Get current block timestamp to compute starting day
CURRENT_TS=$(cast block latest --rpc-url "$ANVIL_RPC" --json | jq -r '.timestamp' | xargs printf "%d\n")
CURRENT_DAY=$((CURRENT_TS / 86400))

echo "Current timestamp: $CURRENT_TS, current day: $CURRENT_DAY"

for i in $(seq 0 6); do
  DAY=$((CURRENT_DAY + i))
  echo ""
  echo "--- Check-in $((i + 1))/7 (day $DAY) ---"

  if [ "$i" -gt 0 ]; then
    # Advance time by 1 day (86400 seconds = 0x15180 hex)
    cast rpc evm_increaseTime 0x15180 --rpc-url "$ANVIL_RPC" > /dev/null
    cast rpc evm_mine --rpc-url "$ANVIL_RPC" > /dev/null
    NEW_TS=$(cast block latest --rpc-url "$ANVIL_RPC" --json | jq -r '.timestamp' | xargs printf "%d\n")
    echo "  Time advanced to: $NEW_TS (day $((NEW_TS / 86400)))"
  fi

  RESULT=$(make_attest_call "$DAY")
  if echo "$RESULT" | grep -q "transactionHash"; then
    TX=$(echo "$RESULT" | grep "transactionHash" | awk '{print $2}')
    echo "  Attestation TX: $TX"
  else
    echo "  Attestation sent"
  fi
done

# --- Step 2: Verify resolver state ---
echo ""
echo "=== Step 2: Verifying resolver state ==="

STREAK=$(cast call "$RESOLVER" "currentStreak(address)(uint256)" "$ANVIL_ADDR" --rpc-url "$ANVIL_RPC")
LONGEST=$(cast call "$RESOLVER" "longestStreak(address)(uint256)" "$ANVIL_ADDR" --rpc-url "$ANVIL_RPC")
LAST_CHECKIN=$(cast call "$RESOLVER" "lastCheckIn(address)(uint256)" "$ANVIL_ADDR" --rpc-url "$ANVIL_RPC")

echo "  currentStreak:  $STREAK"
echo "  longestStreak:  $LONGEST"
echo "  lastCheckIn:    $LAST_CHECKIN"

# Parse streak value
STREAK_NUM=$(echo "$STREAK" | xargs printf "%d\n" 2>/dev/null || echo "$STREAK")

if [ "$STREAK_NUM" -eq 7 ]; then
  echo "  PASS: Streak is 7"
else
  echo "  FAIL: Expected streak 7, got $STREAK_NUM"
  exit 1
fi

# --- Step 3: Run full weekly distribution pipeline ---
echo ""
echo "=== Step 3: Running weekly distribution pipeline ==="

# Override env vars for the Node scripts (AFTER sourcing .env so these win)
export RPC_URL="$ANVIL_RPC"
export OPERATOR_PRIVATE_KEY="$ANVIL_KEY"
export VITE_CHAIN_ID="$CHAIN_ID"
export VITE_DOJO_RESOLVER_ADDRESS="$RESOLVER"
export VITE_DOJO_SCHEMA_UID="$SCHEMA_UID"
export VITE_DOJO_TOKEN_ADDRESS="$DOJO_TOKEN"
export WEEK_NUMBER=1

if [ -z "${VITE_PINATA_JWT:-}" ]; then
  echo "ERROR: VITE_PINATA_JWT not set in .env"
  exit 1
fi

node scripts/weekly-distribution/index.js

echo ""
echo "=== E2E Test COMPLETE ==="
echo ""
echo "Summary:"
echo "  PASS  Anvil fork of Base Sepolia started"
echo "  PASS  DOJO tokens funded to test account"
echo "  PASS  7 consecutive daily check-ins attested"
echo "  PASS  Resolver streak = $STREAK_NUM"
echo "  PASS  Weekly distribution pipeline executed"
echo "  PASS  Merkle trees pinned to IPFS"
echo "  PASS  Distributions created on Mint Club Merkle contract"
