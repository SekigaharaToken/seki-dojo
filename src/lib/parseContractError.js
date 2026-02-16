/**
 * Parse a viem/wagmi contract error into a structured result
 * for i18n-friendly error display.
 *
 * Returns { key, params } where key is an i18n key under "errors.*"
 */
export function parseContractError(error) {
  if (!error) return { key: "errors.unknown", params: { message: "Unknown error" } };

  const msg = error.shortMessage || error.message || String(error);

  // User rejected in wallet
  if (
    msg.includes("User rejected") ||
    msg.includes("User denied") ||
    msg.includes("user rejected")
  ) {
    return { key: "errors.userRejected", params: {} };
  }

  // Insufficient funds for gas
  if (
    msg.includes("insufficient funds") ||
    msg.includes("Insufficient funds")
  ) {
    return { key: "errors.insufficientFunds", params: {} };
  }

  // Contract revert — extract reason if available
  if (msg.includes("reverted") || msg.includes("revert")) {
    const reason = error.metaMessages?.[0]
      || extractRevertReason(msg)
      || "unknown reason";
    return { key: "errors.contractRevert", params: { reason } };
  }

  return { key: "errors.unknown", params: { message: truncate(msg, 100) } };
}

function extractRevertReason(msg) {
  // viem formats: 'reverted with reason "..."' or 'reverted with the following reason: ...'
  const match = msg.match(/reverted.*?(?:reason[:\s]*"?|reason:\s*)([^"]+)"?/i);
  return match?.[1]?.trim() || null;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + "..." : str;
}
