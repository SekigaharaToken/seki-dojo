const PINATA_API_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

/**
 * Pin a JSON object to IPFS via Pinata.
 *
 * @param {object} json - The JSON data to pin
 * @param {string} name - Filename for Pinata metadata
 * @returns {Promise<string>} IPFS CID (IpfsHash)
 */
export async function pinToIpfs(json, name) {
  const jwt = process.env.VITE_PINATA_JWT;

  const response = await fetch(PINATA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: { name },
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Pinata API error: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data.IpfsHash;
}
