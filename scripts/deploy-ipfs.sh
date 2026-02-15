#!/usr/bin/env bash
set -euo pipefail

# IPFS Deployment Pipeline for DOJO
#
# Builds the production bundle and pins to IPFS via Pinata.
# Outputs the CID for ENS contenthash update.
#
# Requirements:
#   VITE_PINATA_JWT — Pinata API JWT token
#   All VITE_* env vars for the build
#
# Usage:
#   ./scripts/deploy-ipfs.sh

echo "=== DOJO IPFS Deployment ==="
echo ""

# Verify Pinata JWT
if [ -z "${VITE_PINATA_JWT:-}" ]; then
  echo "ERROR: VITE_PINATA_JWT is not set"
  echo "Set it in your environment or .env file"
  exit 1
fi

# Step 1: Build production bundle
echo "1. Building production bundle..."
npm run build
echo "   Build complete: dist/"

# Step 2: Pin dist/ folder to IPFS via Pinata
echo "2. Pinning to IPFS via Pinata..."

CID=$(curl -s -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "Authorization: Bearer ${VITE_PINATA_JWT}" \
  -F "file=@dist/" \
  -F "pinataOptions={\"cidVersion\":1}" \
  -F "pinataMetadata={\"name\":\"dojo-frontend-$(date +%Y%m%d-%H%M%S)\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['IpfsHash'])")

if [ -z "$CID" ]; then
  echo "ERROR: Failed to pin to IPFS"
  exit 1
fi

echo "   CID: ${CID}"
echo ""

# Step 3: Output instructions
echo "=== Deployment Successful ==="
echo ""
echo "CID: ${CID}"
echo ""
echo "Gateway URL: https://gateway.pinata.cloud/ipfs/${CID}"
echo ""
echo "To update ENS contenthash (sekigahara.eth):"
echo "  1. Go to https://app.ens.domains/sekigahara.eth"
echo "  2. Edit Records -> Content Hash"
echo "  3. Set to: ipfs://${CID}"
echo "  4. Confirm transaction"
echo ""
echo "After ENS update, verify at: https://sekigahara.eth.limo"
