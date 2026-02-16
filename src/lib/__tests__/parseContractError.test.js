import { describe, it, expect } from "vitest";
import { parseContractError } from "@/lib/parseContractError.js";

describe("parseContractError", () => {
  it("returns userRejected for wallet rejection", () => {
    const err = new Error("User rejected the request.");
    expect(parseContractError(err)).toEqual({
      key: "errors.userRejected",
      params: {},
    });
  });

  it("returns userRejected for User denied variant", () => {
    const err = new Error("User denied transaction signature");
    expect(parseContractError(err)).toEqual({
      key: "errors.userRejected",
      params: {},
    });
  });

  it("returns insufficientFunds for gas errors", () => {
    const err = new Error("insufficient funds for gas * price + value");
    expect(parseContractError(err)).toEqual({
      key: "errors.insufficientFunds",
      params: {},
    });
  });

  it("returns contractRevert with reason from metaMessages", () => {
    const err = new Error("Contract call reverted");
    err.metaMessages = ["Already checked in today"];
    expect(parseContractError(err)).toEqual({
      key: "errors.contractRevert",
      params: { reason: "Already checked in today" },
    });
  });

  it("returns contractRevert extracting reason from message", () => {
    const err = new Error('Contract call reverted with reason "rate limited"');
    expect(parseContractError(err)).toEqual({
      key: "errors.contractRevert",
      params: { reason: "rate limited" },
    });
  });

  it("prefers shortMessage over message", () => {
    const err = new Error("long detailed message");
    err.shortMessage = "User rejected the request.";
    expect(parseContractError(err)).toEqual({
      key: "errors.userRejected",
      params: {},
    });
  });

  it("returns unknown for unrecognized errors", () => {
    const err = new Error("Something unexpected");
    const result = parseContractError(err);
    expect(result.key).toBe("errors.unknown");
    expect(result.params.message).toBe("Something unexpected");
  });

  it("handles null/undefined error", () => {
    expect(parseContractError(null)).toEqual({
      key: "errors.unknown",
      params: { message: "Unknown error" },
    });
  });

  it("truncates long error messages", () => {
    const err = new Error("x".repeat(200));
    const result = parseContractError(err);
    expect(result.params.message.length).toBeLessThanOrEqual(104); // 100 + "..."
  });
});
